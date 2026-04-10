import { describe, it, expect, beforeEach } from 'vitest'
import * as THREE from 'three'
import { SceneGraph } from '../core/SceneGraph'
import { applyRelationsBatch } from '../core/ifc-relations'
import type { IfcObject } from '../types/ifc-schema'
import type { FromWorker } from '../workers/worker-protocol'

type RelationsMsg = Extract<FromWorker, { type: 'RELATIONS' }>

function makeObj(expressId: number, modelId = 'model-1'): IfcObject {
  return {
    expressId,
    globalId: `guid-${expressId}`,
    ifcType: 'IfcWall',
    ifcTypeCode: 0,
    name: `Object ${expressId}`,
    modelId,
    meshIds: [],
    bbox: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1)),
    matrix: new THREE.Matrix4(),
    relations: {
      decomposedBy: [],
      spaceBoundaries: [],
      connectedTo: [],
    },
    analysisState: null,
  }
}

function makeRelationsMsg(overrides: Partial<RelationsMsg> = {}): RelationsMsg {
  return {
    type: 'RELATIONS',
    modelId: 'model-1',
    containedInSpatialStructure: [],
    aggregates: [],
    spaceBoundaries: [],
    ...overrides,
  }
}

describe('applyRelationsBatch', () => {
  let graph: SceneGraph

  beforeEach(() => {
    graph = new SceneGraph()
  })

  it('applies containedInSpatialStructure relations', () => {
    graph.add(makeObj(10)) // element
    graph.add(makeObj(20)) // space

    applyRelationsBatch(
      graph,
      makeRelationsMsg({ containedInSpatialStructure: [[10, 20]] }),
    )

    expect(graph.get(10)!.relations.containedInSpatialStructure).toBe(20)
  })

  it('applies aggregates — sets decomposedBy on parent and decomposes on children', () => {
    const parent = makeObj(100)
    const child1 = makeObj(101)
    const child2 = makeObj(102)
    graph.add(parent)
    graph.add(child1)
    graph.add(child2)

    applyRelationsBatch(
      graph,
      makeRelationsMsg({ aggregates: [[100, [101, 102]]] }),
    )

    expect(graph.get(100)!.relations.decomposedBy).toEqual([101, 102])
    expect(graph.get(101)!.relations.decomposes).toBe(100)
    expect(graph.get(102)!.relations.decomposes).toBe(100)
  })

  it('applies spaceBoundaries on both space and element', () => {
    const space = makeObj(200)
    const wall = makeObj(201)
    graph.add(space)
    graph.add(wall)

    applyRelationsBatch(
      graph,
      makeRelationsMsg({ spaceBoundaries: [[200, 201]] }),
    )

    expect(graph.get(200)!.relations.spaceBoundaries).toContain(201)
    expect(graph.get(201)!.relations.spaceBoundaries).toContain(200)
  })

  it('silently skips relations for objects not in graph', () => {
    // expressId 999 is not in the graph — should not throw
    expect(() => {
      applyRelationsBatch(
        graph,
        makeRelationsMsg({ containedInSpatialStructure: [[999, 998]] }),
      )
    }).not.toThrow()
  })

  it('handles multiple relations in one batch', () => {
    for (let i = 1; i <= 5; i++) graph.add(makeObj(i))

    applyRelationsBatch(graph, {
      type: 'RELATIONS',
      modelId: 'model-1',
      containedInSpatialStructure: [
        [1, 3],
        [2, 3],
      ],
      aggregates: [[3, [4, 5]]],
      spaceBoundaries: [[3, 1]],
    })

    expect(graph.get(1)!.relations.containedInSpatialStructure).toBe(3)
    expect(graph.get(2)!.relations.containedInSpatialStructure).toBe(3)
    expect(graph.get(3)!.relations.decomposedBy).toEqual([4, 5])
    expect(graph.get(3)!.relations.spaceBoundaries).toContain(1)
    expect(graph.get(1)!.relations.spaceBoundaries).toContain(3)
  })

  it('accumulates spaceBoundaries across multiple calls', () => {
    const space = makeObj(10)
    const wall1 = makeObj(11)
    const wall2 = makeObj(12)
    graph.add(space)
    graph.add(wall1)
    graph.add(wall2)

    applyRelationsBatch(graph, makeRelationsMsg({ spaceBoundaries: [[10, 11]] }))
    applyRelationsBatch(graph, makeRelationsMsg({ spaceBoundaries: [[10, 12]] }))

    const boundaries = graph.get(10)!.relations.spaceBoundaries
    expect(boundaries).toContain(11)
    expect(boundaries).toContain(12)
  })
})
