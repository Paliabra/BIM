import * as THREE from 'three'

export interface SceneRefs {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  grid: THREE.GridHelper
  axesCanvas: HTMLCanvasElement
}

/**
 * Initialises the Three.js scene on a given <canvas> element.
 * Returns all refs needed by other renderer modules.
 */
export function initThreeScene(canvas: HTMLCanvasElement): SceneRefs {
  // ── Renderer ────────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor(0x0f1117)
  renderer.localClippingEnabled = true

  // ── Scene ───────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene()

  // ── Camera ──────────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.05, 5000)
  camera.position.set(20, 20, 20)

  // ── Lights ──────────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.55))

  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(30, 60, 30)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, {
    near: 0.5, far: 500, left: -120, right: 120, top: 120, bottom: -120,
  })
  scene.add(sun)

  const fill = new THREE.DirectionalLight(0x8ab4f8, 0.3)
  fill.position.set(-20, 10, -20)
  scene.add(fill)

  // ── Grid ────────────────────────────────────────────────────────────────────
  const grid = new THREE.GridHelper(500, 100, 0x2a2d38, 0x232530)
  scene.add(grid)

  // ── Axes gizmo (small overlay canvas) ───────────────────────────────────────
  const axesCanvas = document.createElement('canvas')
  axesCanvas.width = 80
  axesCanvas.height = 80
  axesCanvas.style.cssText =
    'position:absolute;bottom:12px;left:12px;width:80px;height:80px;pointer-events:none;'

  return { renderer, scene, camera, grid, axesCanvas }
}

/**
 * Resizes renderer and updates camera aspect ratio.
 * Call on window resize or container size change.
 */
export function resizeRenderer(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): void {
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

/**
 * Draw the axes gizmo onto an overlay canvas, aligned with the current camera orientation.
 */
export function drawAxesGizmo(
  axesCanvas: HTMLCanvasElement,
  camera: THREE.PerspectiveCamera,
): void {
  const ctx = axesCanvas.getContext('2d')
  if (!ctx) return

  const size = 80
  const cx = size / 2
  const cy = size / 2
  const len = 28

  ctx.clearRect(0, 0, size, size)

  const dirs = [
    { v: new THREE.Vector3(1, 0, 0), label: 'X', color: '#ef4444' },
    { v: new THREE.Vector3(0, 1, 0), label: 'Y', color: '#22c55e' },
    { v: new THREE.Vector3(0, 0, 1), label: 'Z', color: '#3b82f6' },
  ]

  // Project each axis direction using camera's view matrix
  const mat = new THREE.Matrix3().setFromMatrix4(camera.matrixWorldInverse)
  const projected = dirs.map(({ v, label, color }) => {
    const p = v.clone().applyMatrix3(mat)
    return { px: cx + p.x * len, py: cy - p.y * len, pz: p.z, label, color }
  })

  // Draw back-to-front (depth sort by z)
  projected.sort((a, b) => a.pz - b.pz)

  for (const { px, py, label, color } of projected) {
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(px, py)
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.fillStyle = color
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, px + (px - cx) * 0.25, py + (py - cy) * 0.25)
  }
}

/**
 * Start the render loop. Returns a cleanup function.
 */
export function startRenderLoop(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  onFrame?: () => void,
): () => void {
  let rafId: number
  const loop = () => {
    rafId = requestAnimationFrame(loop)
    onFrame?.()
    renderer.render(scene, camera)
  }
  rafId = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(rafId)
}
