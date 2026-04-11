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
import type { MeasureResult, MeasureSubMode, SnapResult } from '../../renderer/MeasureTool'
import { useSceneSync } from './useSceneSync'
import { useBim } from '../../context/BimContext'

interface Viewer3DProps {
  onObjectPicked:   (expressId: number, modelId: string) => void
  mode:             'orbit' | 'select' | 'measure'
  measureSubMode:   MeasureSubMode
  selectedExpressId: number | null
  fitTrigger:        number
}

const SNAP_LABELS: Record<string, string> = {
  vertex:   'Sommet',
  midpoint: 'Milieu',
  face:     'Face',
}

/**
 * 3D viewport with CAD-level measurement tool.
 * Communicates upstream via: onObjectPicked + BimContext renderer API.
 */
export function Viewer3D({
  onObjectPicked,
  mode,
  measureSubMode,
  selectedExpressId,
  fitTrigger,
}: Viewer3DProps) {
  const { graph, registerRenderer } = useBim()

  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Three.js refs
  const sceneRef     = useRef<THREE.Scene | null>(null)
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef  = useRef<CameraControls | null>(null)
  const pickerRef    = useRef<ObjectPicker | null>(null)
  const highlightRef = useRef<HighlightManager | null>(null)
  const sectionRef   = useRef<SectionPlane | null>(null)
  const measureRef   = useRef<MeasureTool | null>(null)
  const axesRef      = useRef<HTMLCanvasElement | null>(null)
  const modeRef      = useRef(mode)

  // Measurement overlay state
  const [snapResult,    setSnapResult]    = useState<SnapResult | null>(null)
  const [measureResult, setMeasureResult] = useState<MeasureResult | null>(null)

  // Keep mode ref current
  useEffect(() => {
    modeRef.current = mode
    const tool = measureRef.current
    if (!tool) return
    if (mode === 'measure') {
      tool.enable(measureSubMode)
    } else {
      tool.disable()
      setSnapResult(null)
      setMeasureResult(null)
    }
  }, [mode, measureSubMode])

  // Sub-mode change while already in measure mode
  useEffect(() => {
    if (mode !== 'measure') return
    measureRef.current?.setSubMode(measureSubMode)
    setMeasureResult(null)
  }, [measureSubMode, mode])

  const { handleWorkerMessage, setModelVisibility, setTypeVisibility, setObjectsVisibility, updateSectionPlane, removeModel } =
    useSceneSync(sceneRef.current, graph, sectionRef.current)

  const sceneSyncRef = useRef(handleWorkerMessage)
  sceneSyncRef.current = handleWorkerMessage

  // ── Register renderer API in BimContext ────────────────────────────────────
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
        if (active) measureRef.current?.enable(measureSubMode)
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
    measureSubMode,
  ])

  // ── Three.js initialisation ────────────────────────────────────────────────
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
    const measure      = new MeasureTool(scene, camera, canvas, setSnapResult, setMeasureResult)

    controlsRef.current  = controls
    pickerRef.current    = picker
    highlightRef.current = highlight
    sectionRef.current   = sectionPlane
    measureRef.current   = measure

    wrapper.appendChild(axesCanvas)

    const ro = new ResizeObserver(() => {
      resizeRenderer(renderer, camera, wrapper.clientWidth, wrapper.clientHeight)
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

  // ── Camera fit ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (fitTrigger === 0) return
    const controls = controlsRef.current
    if (!controls) return
    const bbox = graph.globalBbox()
    if (!bbox.isEmpty()) {
      controls.fitToBbox(bbox)
      const grid = sceneRef.current?.children.find((c) => c instanceof THREE.GridHelper)
      if (grid) grid.position.y = bbox.min.y
    }
  }, [fitTrigger, graph])

  // ── Selection highlight ────────────────────────────────────────────────────
  useEffect(() => {
    const h = highlightRef.current
    if (!h) return
    h.clearAll()
    if (selectedExpressId !== null) h.highlight(selectedExpressId, 'selected')
  }, [selectedExpressId])

  // ── Mouse move → snap preview ──────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (modeRef.current === 'measure') {
      measureRef.current?.handleMouseMove(e.nativeEvent)
    }
  }, [])

  // ── Click ──────────────────────────────────────────────────────────────────
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (modeRef.current === 'measure') {
        measureRef.current?.handleClick(e.nativeEvent)
        return
      }
      if (modeRef.current !== 'select') return
      const result = pickerRef.current?.pick(e.nativeEvent)
      if (result) onObjectPicked(result.expressId, result.modelId)
      else         onObjectPicked(-1, '')
    },
    [onObjectPicked],
  )

  // ── Double-click → close area polygon ─────────────────────────────────────
  const handleDblClick = useCallback((_e: React.MouseEvent<HTMLCanvasElement>) => {
    if (modeRef.current === 'measure') {
      measureRef.current?.handleDblClick()
    }
  }, [])

  // ── Cursor ─────────────────────────────────────────────────────────────────
  const cursor = mode === 'orbit' ? 'grab' : 'crosshair'

  return (
    <div ref={wrapperRef} className="relative w-full h-full bg-surface-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onDoubleClick={handleDblClick}
      />

      {/* ── Snap indicator (top-left) ─────────────────────────────────────── */}
      {mode === 'measure' && snapResult && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-surface-800/80 backdrop-blur rounded px-2 py-1 pointer-events-none select-none">
          <SnapIcon type={snapResult.type} />
          <span className="text-[11px] font-medium text-surface-300">
            {SNAP_LABELS[snapResult.type]}
          </span>
        </div>
      )}

      {/* ── Measurement result (bottom center) ───────────────────────────── */}
      {mode === 'measure' && measureResult && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface-800/90 backdrop-blur border border-surface-600 rounded-lg px-5 py-3 text-center pointer-events-none select-none">
          <div className="text-surface-500 text-[10px] uppercase tracking-widest mb-1">
            {measureResult.subMode === 'distance' ? 'Distance'
            : measureResult.subMode === 'angle'   ? 'Angle'
            : 'Surface'}
          </div>
          <div className="text-accent font-mono text-2xl font-semibold">
            {measureResult.label}
          </div>
          {measureResult.subMode === 'distance' && measureResult.points.length === 2 && (
            <div className="text-surface-500 text-[10px] mt-1 font-mono">
              {'('}
              {measureResult.points[0].x.toFixed(2)},
              {measureResult.points[0].y.toFixed(2)},
              {measureResult.points[0].z.toFixed(2)}
              {') → ('}
              {measureResult.points[1].x.toFixed(2)},
              {measureResult.points[1].y.toFixed(2)},
              {measureResult.points[1].z.toFixed(2)}
              {')'}
            </div>
          )}
        </div>
      )}

      {/* ── Measure hint (when active, no result yet) ─────────────────────── */}
      {mode === 'measure' && !measureResult && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface-800/70 backdrop-blur rounded px-4 py-2 pointer-events-none select-none">
          <span className="text-surface-400 text-xs">
            {measureResult === null && (
              <>
                {measureSubMode === 'distance' && 'Cliquez deux points pour mesurer la distance'}
                {measureSubMode === 'angle'    && 'Cliquez le sommet puis deux points de direction'}
                {measureSubMode === 'area'     && 'Cliquez les sommets du polygone — double-clic pour fermer'}
              </>
            )}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Snap icon ─────────────────────────────────────────────────────────────────

function SnapIcon({ type }: { type: string }) {
  const cls = 'w-3 h-3 shrink-0'
  if (type === 'vertex') {
    return (
      <svg className={cls} viewBox="0 0 10 10" fill="#ffcc00">
        <rect x="1" y="1" width="8" height="8" />
      </svg>
    )
  }
  if (type === 'midpoint') {
    return (
      <svg className={cls} viewBox="0 0 10 10" fill="#ffcc00">
        <polygon points="5,0 10,5 5,10 0,5" />
      </svg>
    )
  }
  return (
    <svg className={cls} viewBox="0 0 10 10" fill="#ffcc00">
      <circle cx="5" cy="5" r="4" />
    </svg>
  )
}
