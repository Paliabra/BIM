import * as THREE from 'three'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MeasureResult {
  from: THREE.Vector3
  to: THREE.Vector3
  /** Euclidean distance in scene units (metres). */
  distance: number
  /** World-space midpoint — used for positioning the label. */
  midpoint: THREE.Vector3
}

// ─── MeasureTool ─────────────────────────────────────────────────────────────

/**
 * Two-click distance measurement tool (SPEC Phase 1 — mesures manuelles).
 *
 * Usage:
 *   const tool = new MeasureTool(scene, camera, canvas, (result) => setResult(result))
 *   tool.enable()
 *   // pass canvas click events:
 *   canvas.addEventListener('click', (e) => tool.handleClick(e))
 *   tool.disable()   // clears markers
 *   tool.dispose()   // cleanup on unmount
 */
export class MeasureTool {
  private _active = false
  private points: Array<{ pos: THREE.Vector3; marker: THREE.Mesh }> = []
  private line: THREE.Line | null = null

  private static readonly MARKER_COLOR = 0xffcc00
  private static readonly MARKER_SIZE  = 0.08

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
    private readonly canvas: HTMLCanvasElement,
    private readonly onResult: (result: MeasureResult | null) => void,
  ) {}

  get active(): boolean { return this._active }

  enable(): void {
    this._active = true
  }

  disable(): void {
    this._active = false
    this.clearScene()
    this.onResult(null)
  }

  /**
   * Handle a canvas click event.
   * Returns true if the click was consumed (measure mode was active),
   * false if the caller should handle it as a normal pick.
   */
  handleClick(event: MouseEvent): boolean {
    if (!this._active) return false

    const point = this.raycastScene(event)
    if (!point) return true  // empty space click — consumed, no object picked

    // Third click starts a new measurement
    if (this.points.length >= 2) {
      this.clearScene()
    }

    this.addMarker(point)

    if (this.points.length === 2) {
      this.drawLine()
      const from = this.points[0].pos
      const to   = this.points[1].pos
      this.onResult({
        from,
        to,
        distance: from.distanceTo(to),
        midpoint: from.clone().lerp(to, 0.5),
      })
    }

    return true
  }

  dispose(): void {
    this.clearScene()
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private raycastScene(event: MouseEvent): THREE.Vector3 | null {
    const rect = this.canvas.getBoundingClientRect()
    const ndc  = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width)  * 2 - 1,
      -((event.clientY - rect.top)  / rect.height) * 2 + 1,
    )

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(ndc, this.camera)

    // Only raycast IFC object meshes, skip helpers (grid, markers)
    const meshes: THREE.Mesh[] = []
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.objectId !== undefined) {
        meshes.push(obj)
      }
    })

    const hits = raycaster.intersectObjects(meshes, false)
    return hits.length > 0 ? hits[0].point.clone() : null
  }

  private addMarker(pos: THREE.Vector3): void {
    const geo    = new THREE.SphereGeometry(MeasureTool.MARKER_SIZE, 12, 8)
    const mat    = new THREE.MeshBasicMaterial({
      color: MeasureTool.MARKER_COLOR,
      depthTest: false,
    })
    const sphere = new THREE.Mesh(geo, mat)
    sphere.position.copy(pos)
    sphere.renderOrder = 999
    this.scene.add(sphere)
    this.points.push({ pos, marker: sphere })
  }

  private drawLine(): void {
    const pts = this.points.map((p) => p.pos)
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({
      color: MeasureTool.MARKER_COLOR,
      depthTest: false,
    })
    this.line = new THREE.Line(geo, mat)
    this.line.renderOrder = 999
    this.scene.add(this.line)
  }

  private clearScene(): void {
    for (const { marker } of this.points) {
      marker.geometry.dispose()
      ;(marker.material as THREE.Material).dispose()
      this.scene.remove(marker)
    }
    this.points = []

    if (this.line) {
      this.line.geometry.dispose()
      ;(this.line.material as THREE.Material).dispose()
      this.scene.remove(this.line)
      this.line = null
    }

    this.onResult(null)
  }
}
