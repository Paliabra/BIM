import * as THREE from 'three'
import type { IfcObject, IfcRelations, IfcProperties } from '../types/ifc-schema'
import { SpatialIndex } from './SpatialIndex'

/**
 * The central spatial database (SPEC §5).
 *
 * Holds ALL IFC objects for ALL loaded models, keyed by expressId.
 * This is NOT a Three.js scene — it's the semantic layer that the renderer
 * mirrors visually, and that the spatial engine (Phase 2+) queries.
 *
 * Each object's bbox is computed from geometry vertices (primary source of truth).
 */
export class SceneGraph {
  private readonly objects = new Map<number, IfcObject>()
  readonly spatialIndex = new SpatialIndex()

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  add(obj: IfcObject): void {
    this.objects.set(obj.expressId, obj)
    this.spatialIndex.insert(obj.expressId, obj.bbox)
  }

  get(expressId: number): IfcObject | undefined {
    return this.objects.get(expressId)
  }

  has(expressId: number): boolean {
    return this.objects.has(expressId)
  }

  delete(expressId: number): void {
    this.objects.delete(expressId)
    this.spatialIndex.delete(expressId)
  }

  get size(): number {
    return this.objects.size
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  /** All objects for a given model */
  byModel(modelId: string): IfcObject[] {
    const result: IfcObject[] = []
    for (const obj of this.objects.values()) {
      if (obj.modelId === modelId) result.push(obj)
    }
    return result
  }

  /** All objects of a given IFC type (e.g. 'IfcSpace') */
  byType(ifcType: string): IfcObject[] {
    const result: IfcObject[] = []
    for (const obj of this.objects.values()) {
      if (obj.ifcType === ifcType) result.push(obj)
    }
    return result
  }

  /** All objects of a given IFC type code */
  byTypeCode(typeCode: number): IfcObject[] {
    const result: IfcObject[] = []
    for (const obj of this.objects.values()) {
      if (obj.ifcTypeCode === typeCode) result.push(obj)
    }
    return result
  }

  /**
   * Spatial pre-filter: returns objects whose AABB intersects `volume`.
   * Phase 2: this will be BVH-accelerated.
   */
  queryVolume(volume: THREE.Box3): IfcObject[] {
    const ids = this.spatialIndex.query(volume)
    return ids.map((id) => this.objects.get(id)).filter((o): o is IfcObject => o !== undefined)
  }

  /**
   * Returns objects within `radius` meters of `point`.
   */
  queryRadius(point: THREE.Vector3, radius: number): IfcObject[] {
    const ids = this.spatialIndex.queryRadius(point, radius)
    return ids.map((id) => this.objects.get(id)).filter((o): o is IfcObject => o !== undefined)
  }

  // ─── Mutations ───────────────────────────────────────────────────────────────

  setProperties(expressId: number, properties: IfcProperties): void {
    const obj = this.objects.get(expressId)
    if (obj) obj.properties = properties
  }

  setDelta(expressId: number, delta: Record<string, unknown>): void {
    const obj = this.objects.get(expressId)
    if (obj) obj.delta = { ...obj.delta, ...delta }
  }

  setAnalysisState(expressId: number, state: IfcObject['analysisState']): void {
    const obj = this.objects.get(expressId)
    if (obj) obj.analysisState = state
  }

  setMeshIds(expressId: number, meshIds: number[]): void {
    const obj = this.objects.get(expressId)
    if (obj) obj.meshIds = meshIds
  }

  applyRelations(
    expressId: number,
    patch: Partial<IfcRelations>,
  ): void {
    const obj = this.objects.get(expressId)
    if (!obj) return
    obj.relations = { ...obj.relations, ...patch }
  }

  // ─── Bulk ────────────────────────────────────────────────────────────────────

  /** Remove all objects for a given model (when a model is unloaded) */
  deleteByModel(modelId: string): void {
    for (const [id, obj] of this.objects) {
      if (obj.modelId === modelId) {
        this.objects.delete(id)
        this.spatialIndex.delete(id)
      }
    }
  }

  /** Clear all objects across all models */
  clear(): void {
    this.objects.clear()
    this.spatialIndex.clear()
  }

  /** World-space bounding box of all objects */
  globalBbox(): THREE.Box3 {
    return this.spatialIndex.globalBbox()
  }

  values(): IterableIterator<IfcObject> {
    return this.objects.values()
  }

  entries(): IterableIterator<[number, IfcObject]> {
    return this.objects.entries()
  }
}
