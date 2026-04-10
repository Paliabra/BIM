import * as THREE from 'three'

export type SectionAxis = 'X' | 'Y' | 'Z'

/**
 * Manages a single clipping plane for cross-section views (SPEC §9).
 * Materials must be created with `clippingPlanes: [sectionPlane.plane]` to respect the cut.
 */
export class SectionPlane {
  readonly plane = new THREE.Plane()
  private _active = false
  private _axis: SectionAxis = 'Z'
  private _position = 0

  constructor(private renderer: THREE.WebGLRenderer) {}

  get active(): boolean { return this._active }
  get axis(): SectionAxis { return this._axis }
  get position(): number { return this._position }

  enable(): void {
    this._active = true
    this.renderer.clippingPlanes = [this.plane]
    this.update()
  }

  disable(): void {
    this._active = false
    this.renderer.clippingPlanes = []
  }

  setAxis(axis: SectionAxis): void {
    this._axis = axis
    this.update()
  }

  setPosition(position: number): void {
    this._position = position
    this.update()
  }

  toggle(): void {
    if (this._active) this.disable()
    else this.enable()
  }

  private update(): void {
    if (!this._active) return
    const normal =
      this._axis === 'X' ? new THREE.Vector3(-1, 0, 0)
      : this._axis === 'Y' ? new THREE.Vector3(0, -1, 0)
      : new THREE.Vector3(0, 0, -1)
    this.plane.set(normal, this._position)
  }
}
