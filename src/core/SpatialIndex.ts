import * as THREE from 'three'

/**
 * Spatial index — maps expressId → AABB bounding box.
 *
 * Phase 0: simple AABB map with linear scan for queries (correct, not yet fast).
 * Phase 2: `query()` will be replaced by a BVH (three-mesh-bvh) behind this same interface.
 * Phase 4: exact CSG queries (Manifold3D) layered on top.
 *
 * The interface is intentionally stable so upper layers (rule engine, Phase 5) don't
 * need to know which implementation backs it.
 */
export class SpatialIndex {
  private readonly bboxMap = new Map<number, THREE.Box3>()

  insert(expressId: number, bbox: THREE.Box3): void {
    this.bboxMap.set(expressId, bbox)
  }

  get(expressId: number): THREE.Box3 | undefined {
    return this.bboxMap.get(expressId)
  }

  has(expressId: number): boolean {
    return this.bboxMap.has(expressId)
  }

  delete(expressId: number): void {
    this.bboxMap.delete(expressId)
  }

  get size(): number {
    return this.bboxMap.size
  }

  /**
   * Returns expressIds whose AABB intersects or is contained within `volume`.
   * Phase 0: O(n) scan — correct, not optimized.
   * Phase 2: replaced by BVH traversal.
   */
  query(volume: THREE.Box3): number[] {
    const results: number[] = []
    for (const [id, bbox] of this.bboxMap) {
      if (volume.intersectsBox(bbox)) results.push(id)
    }
    return results
  }

  /**
   * Returns expressIds whose center is within `volume`.
   * Stricter than `query()` — useful for containment pre-filter.
   */
  queryContained(volume: THREE.Box3): number[] {
    const center = new THREE.Vector3()
    const results: number[] = []
    for (const [id, bbox] of this.bboxMap) {
      bbox.getCenter(center)
      if (volume.containsPoint(center)) results.push(id)
    }
    return results
  }

  /**
   * Returns all expressIds within `radius` meters of `point`.
   */
  queryRadius(point: THREE.Vector3, radius: number): number[] {
    const radiusSq = radius * radius
    const closest = new THREE.Vector3()
    const results: number[] = []
    for (const [id, bbox] of this.bboxMap) {
      bbox.clampPoint(point, closest)
      if (closest.distanceToSquared(point) <= radiusSq) results.push(id)
    }
    return results
  }

  /** World-space bbox of all indexed objects */
  globalBbox(): THREE.Box3 {
    const box = new THREE.Box3()
    for (const bbox of this.bboxMap.values()) box.union(bbox)
    return box
  }

  clear(): void {
    this.bboxMap.clear()
  }
}
