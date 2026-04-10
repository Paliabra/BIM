import * as THREE from 'three'

interface Spherical {
  radius: number
  theta: number // horizontal angle (azimuth)
  phi: number   // vertical angle (polar, 0=top, π=bottom)
}

interface DragState {
  active: boolean
  startX: number
  startY: number
  theta0: number
  phi0: number
}

interface PanState {
  active: boolean
  startX: number
  startY: number
  target0: THREE.Vector3
}

/**
 * Custom orbit camera controls.
 * Implements: left-drag = orbit, right-drag/middle-drag = pan, wheel = zoom.
 * No dependency on OrbitControls — gives us full control for future phases.
 */
export class CameraControls {
  private sph: Spherical = { radius: 30, theta: Math.PI / 4, phi: Math.PI / 3.5 }
  private target = new THREE.Vector3(0, 0, 0)
  private drag: DragState = { active: false, startX: 0, startY: 0, theta0: 0, phi0: 0 }
  private pan: PanState = { active: false, startX: 0, startY: 0, target0: new THREE.Vector3() }
  private dirty = true

  constructor(
    private camera: THREE.PerspectiveCamera,
    private domElement: HTMLElement,
  ) {
    this.bind()
    this.update()
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Smoothly fly camera to frame a bounding box */
  fitToBbox(bbox: THREE.Box3): void {
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    bbox.getCenter(center)
    bbox.getSize(size)

    this.target.copy(center)
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = this.camera.fov * (Math.PI / 180)
    this.sph.radius = (maxDim / (2 * Math.tan(fov / 2))) * 1.6
    this.sph.theta = Math.PI / 4
    this.sph.phi = Math.PI / 3.5
    this.dirty = true
    this.update()
  }

  setTarget(target: THREE.Vector3): void {
    this.target.copy(target)
    this.dirty = true
  }

  getTarget(): THREE.Vector3 {
    return this.target.clone()
  }

  /** Call each frame to apply pending camera updates */
  update(): void {
    if (!this.dirty) return
    this.dirty = false

    // Clamp phi to avoid gimbal lock
    this.sph.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.sph.phi))
    this.sph.radius = Math.max(0.1, this.sph.radius)

    const x = this.sph.radius * Math.sin(this.sph.phi) * Math.sin(this.sph.theta)
    const y = this.sph.radius * Math.cos(this.sph.phi)
    const z = this.sph.radius * Math.sin(this.sph.phi) * Math.cos(this.sph.theta)

    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z,
    )
    this.camera.lookAt(this.target)
  }

  dispose(): void {
    this.unbind()
  }

  // ─── Event binding ───────────────────────────────────────────────────────────

  private bind(): void {
    const el = this.domElement
    el.addEventListener('mousedown', this.onMouseDown)
    el.addEventListener('mousemove', this.onMouseMove)
    el.addEventListener('mouseup', this.onMouseUp)
    el.addEventListener('mouseleave', this.onMouseUp)
    el.addEventListener('wheel', this.onWheel, { passive: false })
    el.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private unbind(): void {
    const el = this.domElement
    el.removeEventListener('mousedown', this.onMouseDown)
    el.removeEventListener('mousemove', this.onMouseMove)
    el.removeEventListener('mouseup', this.onMouseUp)
    el.removeEventListener('mouseleave', this.onMouseUp)
    el.removeEventListener('wheel', this.onWheel)
  }

  // ─── Mouse handlers ──────────────────────────────────────────────────────────

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      // Left: orbit
      this.drag = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        theta0: this.sph.theta,
        phi0: this.sph.phi,
      }
    } else if (e.button === 1 || e.button === 2) {
      // Middle / Right: pan
      this.pan = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        target0: this.target.clone(),
      }
    }
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (this.drag.active) {
      const dx = (e.clientX - this.drag.startX) * 0.005
      const dy = (e.clientY - this.drag.startY) * 0.005
      this.sph.theta = this.drag.theta0 - dx
      this.sph.phi = this.drag.phi0 + dy
      this.dirty = true
    }

    if (this.pan.active) {
      const rect = this.domElement.getBoundingClientRect()
      const aspect = rect.width / rect.height
      const panScale = this.sph.radius * 0.001
      const dx = (e.clientX - this.pan.startX) * panScale * aspect
      const dy = (e.clientY - this.pan.startY) * panScale

      // Pan in camera space (right + up vectors)
      const right = new THREE.Vector3()
      const up = new THREE.Vector3()
      this.camera.getWorldDirection(new THREE.Vector3()) // ignored
      right.setFromMatrixColumn(this.camera.matrixWorld, 0)
      up.setFromMatrixColumn(this.camera.matrixWorld, 1)

      this.target
        .copy(this.pan.target0)
        .addScaledVector(right, -dx)
        .addScaledVector(up, dy)
      this.dirty = true
    }
  }

  private onMouseUp = (): void => {
    this.drag.active = false
    this.pan.active = false
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 1.1 : 0.9
    this.sph.radius *= factor
    this.dirty = true
  }
}
