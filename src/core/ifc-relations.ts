import type { SceneGraph } from './SceneGraph'
import type { FromWorker } from '../workers/worker-protocol'

/**
 * Applies a RELATIONS batch message from the Worker to the SceneGraph.
 * Called once per model after all OBJECT chunks have been processed.
 *
 * Populates:
 *   - obj.relations.containedInSpatialStructure
 *   - obj.relations.decomposes / decomposedBy
 *   - obj.relations.spaceBoundaries
 */
export function applyRelationsBatch(
  graph: SceneGraph,
  msg: Extract<FromWorker, { type: 'RELATIONS' }>,
): void {
  const { containedInSpatialStructure, aggregates, spaceBoundaries } = msg

  // IfcRelContainedInSpatialStructure: element is physically in a spatial structure
  for (const [elementId, structureId] of containedInSpatialStructure) {
    graph.applyRelations(elementId, { containedInSpatialStructure: structureId })
  }

  // IfcRelAggregates: parent → children decomposition (Site > Building > Storey > Space)
  for (const [parentId, childIds] of aggregates) {
    graph.applyRelations(parentId, { decomposedBy: childIds })
    for (const childId of childIds) {
      graph.applyRelations(childId, { decomposes: parentId })
    }
  }

  // IfcRelSpaceBoundary: space ↔ boundary element (wall, door, window…)
  for (const [spaceId, elemId] of spaceBoundaries) {
    const space = graph.get(spaceId)
    const elem = graph.get(elemId)
    if (space) {
      graph.applyRelations(spaceId, {
        spaceBoundaries: [...(space.relations.spaceBoundaries ?? []), elemId],
      })
    }
    if (elem) {
      graph.applyRelations(elemId, {
        spaceBoundaries: [...(elem.relations.spaceBoundaries ?? []), spaceId],
      })
    }
  }
}
