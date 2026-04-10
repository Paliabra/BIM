import * as THREE from 'three'
import { ANALYSIS_COLORS } from '../types/ifc-schema'
import type { IfcObject } from '../types/ifc-schema'

type HighlightState = 'selected' | 'compliant' | 'non-compliant' | 'warning' | null

/**
 * Manages mesh highlight states: selection, analysis results.
 * Stores original material emissive per mesh to allow clean reset.
 */
export class HighlightManager {
  /** objectId (mesh.userData.objectId) → HighlightState */
  private states = new Map<number, HighlightState>()
  /** objectId → original emissive color */
  private originals = new Map<number, THREE.Color>()

  constructor(private scene: THREE.Scene) {}

  /**
   * Highlight all meshes belonging to an IfcObject.
   * `objectId` is stored in mesh.userData.objectId (expressId).
   */
  highlight(expressId: number, state: HighlightState): void {
    const prev = this.states.get(expressId)
    if (prev === state) return

    this.states.set(expressId, state)
    this.applyToMeshes(expressId, state)
  }

  clear(expressId: number): void {
    this.states.delete(expressId)
    this.applyToMeshes(expressId, null)
  }

  clearAll(): void {
    const ids = Array.from(this.states.keys())
    this.states.clear()
    for (const id of ids) this.applyToMeshes(id, null)
  }

  getState(expressId: number): HighlightState {
    return this.states.get(expressId) ?? null
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  private applyToMeshes(expressId: number, state: HighlightState): void {
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return
      if (obj.userData.objectId !== expressId) return

      const mat = obj.material
      if (!Array.isArray(mat) && mat instanceof THREE.MeshPhongMaterial) {
        // Store original emissive on first encounter
        if (!this.originals.has(expressId)) {
          this.originals.set(expressId, mat.emissive.clone())
        }

        if (state === null) {
          // Restore original
          const orig = this.originals.get(expressId) ?? new THREE.Color(0, 0, 0)
          mat.emissive.copy(orig)
        } else {
          const hex = ANALYSIS_COLORS[state] ?? ANALYSIS_COLORS.selected
          mat.emissive.setHex(hex)
        }
      }
    })
  }

  /** Register an IfcObject's analysis state from the scene graph */
  syncFromObject(obj: IfcObject): void {
    if (!obj.analysisState) {
      this.clear(obj.expressId)
    } else {
      this.highlight(obj.expressId, obj.analysisState)
    }
  }
}
