import { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import {
  initThreeScene,
  resizeRenderer,
  startRenderLoop,
  drawAxesGizmo,
} from '../../renderer/ThreeScene'
import { CameraControls } from '../../renderer/CameraControls'
import { ObjectPicker } from '../../renderer/ObjectPicker'
import { HighlightManager } from '../../renderer/HighlightManager'
import { SectionPlane } from '../../renderer/SectionPlane'
import { MeasureTool } from '../../renderer/MeasureTool'
import type { MeasureResult } from '../../renderer/MeasureTool'
import { useSceneSync } from './useSceneSync'
import { useBim } from '../../context/BimContext'

interface Viewer3DProps {
  /** Called when user clicks an IFC object (select mode). */
  onObjectPicked: (expressId: number, modelId: string) => void
  /** Current interaction mode. */
  mode: 'orbit' | 'select' | 'measure'
  /** expressId of currently selected object (for highlight). */
  selectedExpressId: number | null
  /** Incremented externally to trigger a camera fit. */
  fitTrigger: number
}

/**
 * The 3D viewport.
 * Owns: Three.js scene, camera, controls, object picker, highlights, section plane, measure tool.
 * Communicates upstream via: onObjectPicked callback + BimContext renderer API.
 */
export function Viewer3D({
  onObjectPicked,
  mode,
  selectedExpressId,
  fitTrigger,
}: Viewer3DProps) {
  const { graph, registerRenderer } = useBim()

  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Three.js refs — initialised once on mount
  const sceneRef     = useRef<THREE.Scene | null>(null)
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef  = useRef<CameraControls | null>(null)
  const pickerRef    = useRef<ObjectPicker | null>(null)
  const highlightRef = useRef<HighlightManager | null>(null)
  const sectionRef   = useRef<SectionPlane | null>(null)
  const measureRef   = useRef<MeasureTool | null>(null)
  const axesRef      = useRef<HTMLCanvasElement | null>(null)
  const modeRef      = useRef<'orbit' | 'select' | 'measure'>(mode)

  // Distance measurement result — shown as overlay
  const [measureResult, setMeasureResult] = useState<MeasureResult | null>(null)

  // Keep modeRef current on every render without re-running the scene init effect
  useEffect(() => {
    modeRef.current = mode
    if (mode === 'measure') {
      measureRef.current?.enable()
    } else {
      measureRef.current?.disable()
    }
  }, [mode])

  const { handleWorkerMessage, setModelVisibility, setTypeVisibility, setObjectsVisibility, updateSectionPlane, removeModel } =
    useSceneSync(sceneRef.current, graph, sectionRef.current)

  // Stable ref so the renderer registration closure always calls the latest version
  const sceneSyncRef = useRef(handleWorkerMessage)
  sceneSyncRef.current = handleWorkerMessage

  // ── Register the renderer API in BimContext ────────────────────────────────
  // Done in a separate effect so registration re-runs if any callback changes.
  // setObjectsVisibility has no deps so it's always stable.
  useEffect(() => {
    registerRenderer({
      handleWorkerMessage: (msg) => sceneSyncRef.current(msg),
      setModelVisibility,
      setTypeVisibility,
      setObjectsVisibility,
      removeModel,
      setSectionPlane: (axis, position) => {
        const sp = sectionRef.current
        if (!sp) return
        if (axis === null) {
          sp.disable()
          updateSectionPlane(null)
        } else {
          sp.setAxis(axis)
          sp.setPosition(position)
          if (!sp.active) sp.enable()
          updateSectionPlane(sp.plane)
        }
      },
      setMeasureMode: (active) => {
        if (active) measureRef.current?.enable()
        else measureRef.current?.disable()
      },
    })
  }, [
    registerRenderer,
    setModelVisibility,
    setTypeVisibility,
    setObjectsVisibility,
    removeModel,
    updateSectionPlane,
  ])

  // ── Initialise Three.js on mount ──────────────────────────────────────────
  useEffect(() => {
    const canvas  = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const { renderer, scene, camera, axesCanvas } = initThreeScene(canvas)
    sceneRef.current    = scene
    cameraRef.current   = camera
    rendererRef.current = renderer
    axesRef.current     = axesCanvas

    const controls     = new CameraControls(camera, canvas)
    const picker       = new ObjectPicker(camera, scene, canvas)
    const highlight    = new HighlightManager(scene)
    const sectionPlane = new SectionPlane(renderer)
    const measure      = new MeasureTool(scene, camera, canvas, setMeasureResult)

    controlsRef.current  = controls
    pickerRef.current    = picker
    highlightRef.current = highlight
    sectionRef.current   = sectionPlane
    measureRef.current   = measure

    wrapper.appendChild(axesCanvas)

    const ro = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = wrapper
      resizeRenderer(renderer, camera, w, h)
    })
    ro.observe(wrapper)
    resizeRenderer(renderer, camera, wrapper.clientWidth, wrapper.clientHeight)

    const stopLoop = startRenderLoop(renderer, scene, camera, () => {
      controls.update()
      if (axesRef.current) drawAxesGizmo(axesRef.current, camera)
    })

    return () => {
      stopLoop()
      ro.disconnect()
      controls.dispose()
      measure.dispose()
      renderer.dispose()
      axesCanvas.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fit camera ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (fitTrigger === 0) return
    const controls = controlsRef.current
    if (!controls) return
    const bbox = graph.globalBbox()
    if (!bbox.isEmpty()) {
      controls.fitToBbox(bbox)
      const sceneGrid = sceneRef.current?.children.find((c) => c instanceof THREE.GridHelper)
      if (sceneGrid) sceneGrid.position.y = bbox.min.y
    }
  }, [fitTrigger, graph])

  // ── Selection highlight ───────────────────────────────────────────────────
  useEffect(() => {
    const h = highlightRef.current
    if (!h) return
    h.clearAll()
    if (selectedExpressId !== null) h.highlight(selectedExpressId, 'selected')
  }, [selectedExpressId])

  // ── Click handler ─────────────────────────────────────────────────────────
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Measure mode: let MeasureTool handle the click first
      if (modeRef.current === 'measure') {
        measureRef.current?.handleClick(e.nativeEvent)
        return
      }
      if (modeRef.current !== 'select') return
      const result = pickerRef.current?.pick(e.nativeEvent)
      if (result) {
        onObjectPicked(result.expressId, result.modelId)
      } else {
        onObjectPicked(-1, '')
      }
    },
    [onObjectPicked],
  )

  // ── Cursor style ──────────────────────────────────────────────────────────
  const cursor =
    mode === 'measure' ? 'crosshair'
    : mode === 'select' ? 'crosshair'
    : 'grab'

  return (
    <div ref={wrapperRef} className="relative w-full h-full bg-surface-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor }}
        onClick={handleClick}
      />

      {/* ── Measure overlay ─────────────────────────────────────────────── */}
      {measureResult && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface-800/90 backdrop-blur border border-surface-600 rounded-lg px-4 py-2 text-center pointer-events-none select-none">
          <div className="text-accent font-mono text-lg font-semibold">
            {measureResult.distance.toFixed(3)} m
          </div>
          <div className="text-surface-400 text-xs mt-0.5">
            {measureResult.from.x.toFixed(2)},{measureResult.from.y.toFixed(2)},{measureResult.from.z.toFixed(2)}
            {' → '}
            {measureResult.to.x.toFixed(2)},{measureResult.to.y.toFixed(2)},{measureResult.to.z.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  )
}
