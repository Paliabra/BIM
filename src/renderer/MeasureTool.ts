import * as THREE from 'three'

// ─── Public types ─────────────────────────────────────────────────────────────

export type MeasureSubMode = 'distance' | 'angle' | 'area'

export type SnapType = 'vertex' | 'midpoint' | 'face'

export interface SnapResult {
  point:  THREE.Vector3
  type:   SnapType
  /** Face normal at the hit point (world space). */
  normal: THREE.Vector3
}

export interface MeasureResult {
  subMode:  MeasureSubMode
  /** Primary numeric value — metres or degrees or m². */
  value:    number
  /** Formatted display string, e.g. "3.450 m", "45.2°", "12.34 m²". */
  label:    string
  /** Points used to define the measurement. */
  points:   THREE.Vector3[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SNAP_RADIUS_PX   = 14    // screen-space snap radius in pixels
const MARKER_COLOR     = 0xffcc00
const LINE_COLOR       = 0xffcc00
const ARC_COLOR        = 0xffcc00
const AREA_COLOR       = 0x4f8ef7
const CONFIRMED_MARKER = 0xff8800

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function polygonArea3D(points: THREE.Vector3[]): number {
  if (points.length < 3) return 0
  const crossSum = new THREE.Vector3()
  const n = points.length
  for (let i = 0; i < n; i++) {
    crossSum.add(points[i].clone().cross(points[(i + 1) % n]))
  }
  return crossSum.length() * 0.5
}

function buildArcPoints(
  vertex: THREE.Vector3,
  dir1: THREE.Vector3,
  dir2: THREE.Vector3,
  radius: number,
  segments = 32,
): THREE.Vector3[] {
  const angle = Math.acos(Math.max(-1, Math.min(1, dir1.dot(dir2))))
  const axis  = dir1.clone().cross(dir2).normalize()
  if (axis.lengthSq() < 1e-10) return []
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const q   = new THREE.Quaternion().setFromAxisAngle(axis, (i / segments) * angle)
    const dir = dir1.clone().applyQuaternion(q)
    pts.push(vertex.clone().addScaledVector(dir, radius))
  }
  return pts
}

function buildPolygonMesh(points: THREE.Vector3[]): THREE.Mesh | null {
  if (points.length < 3) return null
  const verts: number[] = []
  const idxs:  number[] = []
  for (const p of points) verts.push(p.x, p.y, p.z)
  // Fan triangulation — works for convex; acceptable for planar building measurements
  for (let i = 1; i < points.length - 1; i++) idxs.push(0, i, i + 1)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
  geo.setIndex(idxs)
  geo.computeVertexNormals()
  return new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      color: AREA_COLOR,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthTest: false,
    }),
  )
}

/** Create or reuse a dashed line with exactly 2 points. */
function makeDashedLine(
  scene: THREE.Scene,
  existing: THREE.Line | null,
): THREE.Line {
  if (existing) return existing
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
  const mat = new THREE.LineDashedMaterial({
    color: LINE_COLOR,
    dashSize: 0.12,
    gapSize:  0.06,
    depthTest: false,
    opacity:  0.65,
    transparent: true,
  })
  const line = new THREE.Line(geo, mat)
  line.renderOrder = 998
  scene.add(line)
  return line
}

function setLinePts(line: THREE.Line, a: THREE.Vector3, b: THREE.Vector3): void {
  const buf = line.geometry.getAttribute('position') as THREE.BufferAttribute
  buf.setXYZ(0, a.x, a.y, a.z)
  buf.setXYZ(1, b.x, b.y, b.z)
  buf.needsUpdate = true
  line.computeLineDistances()
  line.visible = true
}

// ─── MeasureTool ─────────────────────────────────────────────────────────────

/**
 * CAD-level measurement tool with vertex/midpoint/face snapping.
 *
 * Sub-modes:
 *   distance — 2 clicks, Euclidean distance in metres
 *   angle    — 3 clicks (vertex + 2 arms), angle in degrees
 *   area     — N clicks + double-click to close, polygon area in m²
 *
 * Usage:
 *   tool.enable('distance')
 *   canvas.addEventListener('mousemove',   e => tool.handleMouseMove(e))
 *   canvas.addEventListener('click',       e => tool.handleClick(e))
 *   canvas.addEventListener('dblclick',    e => tool.handleDblClick(e))
 *   tool.disable()   // clears scene objects
 *   tool.dispose()   // call on component unmount
 */
export class MeasureTool {
  private _active   = false
  private _subMode: MeasureSubMode = 'distance'

  // Input state
  private confirmed: THREE.Vector3[] = []   // locked-in points
  private snap: SnapResult | null    = null  // current snap under mouse

  // 3D scene objects — created lazily, reused, cleared on reset
  private snapMesh:     THREE.Mesh   | null = null
  private snapType:     SnapType     | null = null
  private previewLine:  THREE.Line   | null = null
  private closeLine:    THREE.Line   | null = null  // area: close-to-first preview
  private confirmedMarkers: THREE.Mesh[]    = []
  private confirmedLines:   THREE.Line[]    = []
  private arcLine:      THREE.Line   | null = null
  private areaFill:     THREE.Mesh   | null = null

  constructor(
    private readonly scene:    THREE.Scene,
    private readonly camera:   THREE.Camera,
    private readonly canvas:   HTMLCanvasElement,
    private readonly onSnap:   (snap: SnapResult | null) => void,
    private readonly onResult: (result: MeasureResult | null) => void,
  ) {}

  get active():  boolean        { return this._active }
  get subMode(): MeasureSubMode { return this._subMode }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  enable(subMode: MeasureSubMode = 'distance'): void {
    this._active  = true
    this._subMode = subMode
    this.reset()
  }

  setSubMode(subMode: MeasureSubMode): void {
    this._subMode = subMode
    this.reset()
  }

  disable(): void {
    this._active = false
    this.reset()
    this.onSnap(null)
    this.onResult(null)
  }

  dispose(): void {
    this.disable()
    this.removeFromScene(this.snapMesh)
    this.snapMesh = null
  }

  // ── Event handlers ──────────────────────────────────────────────────────────

  /**
   * Update snap preview on mouse move.
   * Call with the native MouseEvent from the canvas.
   */
  handleMouseMove(e: MouseEvent): void {
    if (!this._active) return
    this.snap = this.findSnap(e)
    this.updateSnapMarker()
    this.updatePreviewLine()
    this.onSnap(this.snap)
  }

  /**
   * Handle a click. Returns true if the event was consumed.
   * (Caller should not interpret it as an object pick.)
   */
  handleClick(_e: MouseEvent): boolean {
    if (!this._active) return false
    const pt = this.snap?.point ?? null
    if (!pt) return true  // no hit — consume click anyway

    switch (this._subMode) {
      case 'distance': this.clickDistance(pt); break
      case 'angle':    this.clickAngle(pt);    break
      case 'area':     this.clickArea(pt);     break
    }
    return true
  }

  /**
   * Handle double-click (closes area polygon).
   * Returns true if consumed.
   */
  handleDblClick(): boolean {
    if (!this._active || this._subMode !== 'area') return false
    if (this.confirmed.length >= 3) this.finalizeArea()
    return true
  }

  // ── Click handlers per sub-mode ─────────────────────────────────────────────

  private clickDistance(pt: THREE.Vector3): void {
    if (this.confirmed.length === 2) { this.reset(); return }

    this.placeMarker(pt)
    this.confirmed.push(pt)

    if (this.confirmed.length === 2) {
      const [a, b] = this.confirmed
      this.placeConfirmedLine(a, b)
      this.hidePreview()
      this.onResult({
        subMode: 'distance',
        value:   a.distanceTo(b),
        label:   `${a.distanceTo(b).toFixed(3)} m`,
        points:  [...this.confirmed],
      })
    }
  }

  private clickAngle(pt: THREE.Vector3): void {
    if (this.confirmed.length === 3) { this.reset(); return }

    this.placeMarker(pt)
    this.confirmed.push(pt)

    if (this.confirmed.length >= 2) {
      // Draw arm line from vertex to last arm point
      this.placeConfirmedLine(this.confirmed[0], this.confirmed[this.confirmed.length - 1])
    }

    if (this.confirmed.length === 3) {
      const [v, p1, p2] = this.confirmed
      const d1  = p1.clone().sub(v).normalize()
      const d2  = p2.clone().sub(v).normalize()
      const rad = Math.acos(Math.max(-1, Math.min(1, d1.dot(d2))))
      const deg = (rad * 180) / Math.PI
      const arcRadius = Math.min(v.distanceTo(p1), v.distanceTo(p2)) * 0.35
      this.drawArc(v, d1, d2, arcRadius)
      this.hidePreview()
      this.onResult({
        subMode: 'angle',
        value:   deg,
        label:   `${deg.toFixed(1)}°`,
        points:  [...this.confirmed],
      })
    }
  }

  private clickArea(pt: THREE.Vector3): void {
    // A dblclick fires a click first — ignore the second click if we just finalized
    if (this.confirmed.length >= 3 && pt.distanceTo(this.confirmed[0]) < 0.01) {
      this.finalizeArea()
      return
    }

    this.placeMarker(pt)
    if (this.confirmed.length > 0) {
      this.placeConfirmedLine(this.confirmed[this.confirmed.length - 1], pt)
    }
    this.confirmed.push(pt)
  }

  private finalizeArea(): void {
    const pts = this.confirmed
    if (pts.length < 3) return

    // Close the polygon
    this.placeConfirmedLine(pts[pts.length - 1], pts[0])
    this.hidePreview()

    // Filled polygon
    if (this.areaFill) this.removeFromScene(this.areaFill)
    this.areaFill = buildPolygonMesh(pts)
    if (this.areaFill) this.scene.add(this.areaFill)

    const area = polygonArea3D(pts)
    this.onResult({
      subMode: 'area',
      value:   area,
      label:   `${area.toFixed(3)} m²`,
      points:  [...pts],
    })

    // Lock confirmed points — next click will reset
    const snapshot = [...pts]
    this.confirmed = snapshot  // keep markers/lines visible
  }

  // ── Snap ────────────────────────────────────────────────────────────────────

  private findSnap(e: MouseEvent): SnapResult | null {
    const ndc  = this.ndcFromEvent(e)
    const rc   = new THREE.Raycaster()
    rc.setFromCamera(ndc, this.camera)

    const meshes = this.ifcMeshes()
    const hits   = rc.intersectObjects(meshes, false)
    if (hits.length === 0) return null

    const hit  = hits[0]
    const mesh = hit.object as THREE.Mesh
    const face = hit.face
    if (!face) return { point: hit.point.clone(), type: 'face', normal: new THREE.Vector3(0, 1, 0) }

    const posAttr = mesh.geometry.getAttribute('position')
    const mw      = mesh.matrixWorld
    const normal  = face.normal.clone().transformDirection(mw).normalize()

    // Triangle vertices in world space
    const va = new THREE.Vector3().fromBufferAttribute(posAttr, face.a).applyMatrix4(mw)
    const vb = new THREE.Vector3().fromBufferAttribute(posAttr, face.b).applyMatrix4(mw)
    const vc = new THREE.Vector3().fromBufferAttribute(posAttr, face.c).applyMatrix4(mw)

    const candidates: Array<{ pos: THREE.Vector3; type: SnapType }> = [
      { pos: va,                       type: 'vertex' },
      { pos: vb,                       type: 'vertex' },
      { pos: vc,                       type: 'vertex' },
      { pos: va.clone().lerp(vb, 0.5), type: 'midpoint' },
      { pos: vb.clone().lerp(vc, 0.5), type: 'midpoint' },
      { pos: vc.clone().lerp(va, 0.5), type: 'midpoint' },
    ]

    const rect      = this.canvas.getBoundingClientRect()
    const mouseScr  = new THREE.Vector2(e.clientX, e.clientY)

    const toScreen = (p: THREE.Vector3): THREE.Vector2 => {
      const ndc2 = p.clone().project(this.camera)
      return new THREE.Vector2(
        (ndc2.x * 0.5 + 0.5) * rect.width  + rect.left,
        (-ndc2.y * 0.5 + 0.5) * rect.height + rect.top,
      )
    }

    let best: SnapResult = { point: hit.point.clone(), type: 'face', normal }
    let bestDist = SNAP_RADIUS_PX

    for (const { pos, type } of candidates) {
      const dist = mouseScr.distanceTo(toScreen(pos))
      if (dist < bestDist) {
        bestDist = dist
        best     = { point: pos.clone(), type, normal }
      }
    }

    return best
  }

  // ── Visual helpers ──────────────────────────────────────────────────────────

  private updateSnapMarker(): void {
    const snap = this.snap

    if (!snap) {
      if (this.snapMesh) this.snapMesh.visible = false
      return
    }

    // Recreate only when snap type changes (avoids per-frame allocation)
    if (this.snapType !== snap.type) {
      if (this.snapMesh) {
        this.snapMesh.geometry.dispose()
        ;(this.snapMesh.material as THREE.Material).dispose()
        this.scene.remove(this.snapMesh)
        this.snapMesh = null
      }
      this.snapType = snap.type
    }

    if (!this.snapMesh) {
      const geo = this.snapGeo(snap.type)
      const mat = new THREE.MeshBasicMaterial({ color: MARKER_COLOR, depthTest: false })
      this.snapMesh = new THREE.Mesh(geo, mat)
      this.snapMesh.renderOrder = 1000
      this.scene.add(this.snapMesh)
    }

    this.snapMesh.position.copy(snap.point)
    this.snapMesh.visible = true
  }

  private snapGeo(type: SnapType): THREE.BufferGeometry {
    switch (type) {
      case 'vertex':   return new THREE.BoxGeometry(0.06, 0.06, 0.06)
      case 'midpoint': return new THREE.OctahedronGeometry(0.05)
      case 'face':     return new THREE.SphereGeometry(0.035, 8, 6)
    }
  }

  private updatePreviewLine(): void {
    const snap = this.snap
    if (!snap || this.confirmed.length === 0) {
      if (this.previewLine) this.previewLine.visible = false
      if (this.closeLine)   this.closeLine.visible   = false
      return
    }

    const last = this.confirmed[this.confirmed.length - 1]

    this.previewLine = makeDashedLine(this.scene, this.previewLine)
    setLinePts(this.previewLine, last, snap.point)

    // Area mode: also show the closing edge back to first vertex
    if (this._subMode === 'area' && this.confirmed.length >= 2) {
      this.closeLine = makeDashedLine(this.scene, this.closeLine)
      setLinePts(this.closeLine, snap.point, this.confirmed[0])
    } else if (this.closeLine) {
      this.closeLine.visible = false
    }
  }

  private placeMarker(pos: THREE.Vector3, color = CONFIRMED_MARKER): void {
    const geo  = new THREE.SphereGeometry(0.045, 10, 7)
    const mat  = new THREE.MeshBasicMaterial({ color, depthTest: false })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(pos)
    mesh.renderOrder = 999
    this.scene.add(mesh)
    this.confirmedMarkers.push(mesh)
  }

  private placeConfirmedLine(a: THREE.Vector3, b: THREE.Vector3): void {
    const pts = [a, b]
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({ color: LINE_COLOR, depthTest: false })
    const ln  = new THREE.Line(geo, mat)
    ln.renderOrder = 997
    this.scene.add(ln)
    this.confirmedLines.push(ln)
  }

  private drawArc(
    vertex: THREE.Vector3,
    d1: THREE.Vector3,
    d2: THREE.Vector3,
    radius: number,
  ): void {
    if (this.arcLine) { this.removeFromScene(this.arcLine); this.arcLine = null }
    const pts = buildArcPoints(vertex, d1, d2, radius)
    if (pts.length < 2) return
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({ color: ARC_COLOR, depthTest: false })
    this.arcLine = new THREE.Line(geo, mat)
    this.arcLine.renderOrder = 997
    this.scene.add(this.arcLine)
  }

  private hidePreview(): void {
    if (this.previewLine) this.previewLine.visible = false
    if (this.closeLine)   this.closeLine.visible   = false
  }

  // ── Scene management ────────────────────────────────────────────────────────

  private reset(): void {
    for (const m of this.confirmedMarkers) this.removeFromScene(m)
    for (const l of this.confirmedLines)   this.removeFromScene(l)
    this.confirmedMarkers = []
    this.confirmedLines   = []
    this.confirmed        = []

    if (this.previewLine) { this.previewLine.visible = false }
    if (this.closeLine)   { this.closeLine.visible   = false }
    if (this.arcLine)     { this.removeFromScene(this.arcLine); this.arcLine = null }
    if (this.areaFill)    { this.removeFromScene(this.areaFill); this.areaFill = null }
    if (this.snapMesh)    { this.snapMesh.visible = false }

    this.onResult(null)
  }

  private removeFromScene(obj: THREE.Object3D | null): void {
    if (!obj) return
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      const m = obj.material
      if (Array.isArray(m)) m.forEach((x) => x.dispose())
      else m.dispose()
    } else if (obj instanceof THREE.Line) {
      obj.geometry.dispose()
      ;(obj.material as THREE.Material).dispose()
    }
    this.scene.remove(obj)
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  private ndcFromEvent(e: MouseEvent): THREE.Vector2 {
    const rect = this.canvas.getBoundingClientRect()
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  * 2 - 1,
      -((e.clientY - rect.top)  / rect.height) * 2 + 1,
    )
  }

  private ifcMeshes(): THREE.Mesh[] {
    const out: THREE.Mesh[] = []
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.objectId !== undefined) out.push(o)
    })
    return out
  }
}
