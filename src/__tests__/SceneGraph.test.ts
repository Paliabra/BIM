import { describe, it, expect, beforeEach } from 'vitest'
import * as THREE from 'three'
import { SceneGraph } from '../core/SceneGraph'
import type { IfcObject } from '../types/ifc-schema'

function makeObj(overrides: Partial<IfcObject> = {}): IfcObject {
  return {
    expressId: 1,
    globalId: 'abc123',
    ifcType: 'IfcWall',
    ifcTypeCode: 2391406946,
    name: 'Wall 1',
    modelId: 'model-1',
    meshIds: [],
    bbox: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 3, 0.3)),
    matrix: new THREE.Matrix4(),
    relations: {
      decomposedBy: [],
      spaceBoundaries: [],
      connectedTo: [],
    },
    analysisState: null,
    ...overrides,
  }
}

describe('SceneGraph', () => {
  let graph: SceneGraph

  beforeEach(() => {
    graph = new SceneGraph()
  })

  it('starts empty', () => {
    expect(graph.size).toBe(0)
  })

  it('adds and retrieves an object', () => {
    const obj = makeObj({ expressId: 42 })
    graph.add(obj)
    expect(graph.size).toBe(1)
    expect(graph.get(42)).toBe(obj)
  })

  it('has() returns correct results', () => {
    const obj = makeObj({ expressId: 10 })
    expect(graph.has(10)).toBe(false)
    graph.add(obj)
    expect(graph.has(10)).toBe(true)
  })

  it('delete() removes object and updates spatial index', () => {
    const obj = makeObj({ expressId: 5 })
    graph.add(obj)
    graph.delete(5)
    expect(graph.has(5)).toBe(false)
    expect(graph.size).toBe(0)
  })

  it('byModel() filters by modelId', () => {
    graph.add(makeObj({ expressId: 1, modelId: 'model-A' }))
    graph.add(makeObj({ expressId: 2, modelId: 'model-B' }))
    graph.add(makeObj({ expressId: 3, modelId: 'model-A' }))

    const result = graph.byModel('model-A')
    expect(result).toHaveLength(2)
    expect(result.map((o) => o.expressId)).toContain(1)
    expect(result.map((o) => o.expressId)).toContain(3)
  })

  it('byType() filters by IFC type', () => {
    graph.add(makeObj({ expressId: 1, ifcType: 'IfcWall' }))
    graph.add(makeObj({ expressId: 2, ifcType: 'IfcSlab' }))
    graph.add(makeObj({ expressId: 3, ifcType: 'IfcWall' }))

    expect(graph.byType('IfcWall')).toHaveLength(2)
    expect(graph.byType('IfcSlab')).toHaveLength(1)
    expect(graph.byType('IfcDoor')).toHaveLength(0)
  })

  it('byTypeCode() filters by numeric type code', () => {
    graph.add(makeObj({ expressId: 1, ifcTypeCode: 111 }))
    graph.add(makeObj({ expressId: 2, ifcTypeCode: 222 }))

    expect(graph.byTypeCode(111)).toHaveLength(1)
    expect(graph.byTypeCode(999)).toHaveLength(0)
  })

  it('queryVolume() returns objects whose bbox intersects the query volume', () => {
    // Object at [0,0,0] → [2,2,2]
    graph.add(
      makeObj({
        expressId: 1,
        bbox: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 2, 2)),
      }),
    )
    // Object at [10,10,10] → [12,12,12] — far away
    graph.add(
      makeObj({
        expressId: 2,
        bbox: new THREE.Box3(new THREE.Vector3(10, 10, 10), new THREE.Vector3(12, 12, 12)),
      }),
    )

    const queryBox = new THREE.Box3(
      new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(3, 3, 3),
    )
    const hits = graph.queryVolume(queryBox)
    expect(hits).toHaveLength(1)
    expect(hits[0].expressId).toBe(1)
  })

  it('globalBbox() returns union of all object bboxes', () => {
    graph.add(
      makeObj({
        expressId: 1,
        bbox: new THREE.Box3(new THREE.Vector3(-5, 0, 0), new THREE.Vector3(0, 5, 0)),
      }),
    )
    graph.add(
      makeObj({
        expressId: 2,
        bbox: new THREE.Box3(new THREE.Vector3(0, 0, -3), new THREE.Vector3(10, 2, 3)),
      }),
    )

    const bbox = graph.globalBbox()
    expect(bbox.min.x).toBe(-5)
    expect(bbox.max.x).toBe(10)
    expect(bbox.min.z).toBe(-3)
  })

  it('setProperties() stores properties on the object', () => {
    const obj = makeObj({ expressId: 7 })
    graph.add(obj)
    graph.setProperties(7, {
      attributes: { Name: 'Wall A' },
      psets: [{ name: 'Pset_WallCommon', properties: [{ name: 'IsExternal', value: true }] }],
      quantities: [],
    })
    expect(graph.get(7)!.properties).toBeDefined()
    expect(graph.get(7)!.properties!.attributes['Name']).toBe('Wall A')
  })

  it('applyRelations() merges relation patch', () => {
    const obj = makeObj({ expressId: 100 })
    graph.add(obj)
    graph.applyRelations(100, { containedInSpatialStructure: 99 })
    expect(graph.get(100)!.relations.containedInSpatialStructure).toBe(99)
    // Existing relation fields should be preserved
    expect(graph.get(100)!.relations.decomposedBy).toEqual([])
  })

  it('deleteByModel() removes all objects for a given model', () => {
    graph.add(makeObj({ expressId: 1, modelId: 'X' }))
    graph.add(makeObj({ expressId: 2, modelId: 'Y' }))
    graph.add(makeObj({ expressId: 3, modelId: 'X' }))

    graph.deleteByModel('X')
    expect(graph.size).toBe(1)
    expect(graph.get(2)).toBeDefined()
    expect(graph.get(1)).toBeUndefined()
  })

  it('clear() empties the graph', () => {
    graph.add(makeObj({ expressId: 1 }))
    graph.add(makeObj({ expressId: 2 }))
    graph.clear()
    expect(graph.size).toBe(0)
    expect(graph.globalBbox().isEmpty()).toBe(true)
  })

  it('values() iterates all objects', () => {
    graph.add(makeObj({ expressId: 1 }))
    graph.add(makeObj({ expressId: 2 }))
    const ids = Array.from(graph.values()).map((o) => o.expressId)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
  })
})
