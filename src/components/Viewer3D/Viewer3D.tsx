import { useEffect, useRef, useCallback } from 'react'
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
import { useSceneSync } from './useSceneSync'
import type { SceneGraph } from '../../core/SceneGraph'
import type { FromWorker } from '../../workers/worker-protocol'

interface Viewer3DProps {
  graph: SceneGraph
  /** Called when worker sends a message (OBJECT, RELATIONS, TREE, etc.) */
  onWorkerMessage: (msg: FromWorker) => void
  /** Called when user clicks an IFC object */
  onObjectPicked: (expressId: number, modelId: string) => void
  /** Current interaction mode */
  mode: 'orbit' | 'select'
  /** expressId of currently selected object (for highlight) */
  selectedExpressId: number | null
  /** Fit camera to the scene — triggered externally */
  fitTrigger: number
  /** Expose scene refs to parent (for section plane, etc.) */
  onSceneReady?: (refs: {
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    controls: CameraControls
    sectionPlane: SectionPlane
    highlightManager: HighlightManager
  }) => void
}

/**
 * The 3D viewport component.
 * Owns: Three.js scene, camera controls, object picker, highlights, section plane.
 * Delegates: IFC parsing (Worker), scene data (SceneGraph).
 */
export function Viewer3D({
  graph,
  onWorkerMessage,
  onObjectPicked,
  mode,
  selectedExpressId,
  fitTrigger,
  onSceneReady,
}: Viewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Three.js refs (initialised once on mount)
  const sceneRef     = useRef<THREE.Scene | null>(null)
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef  = useRef<CameraControls | null>(null)
  const pickerRef    = useRef<ObjectPicker | null>(null)
  const highlightRef = useRef<HighlightManager | null>(null)
  const sectionRef   = useRef<SectionPlane | null>(null)
  const axesRef      = useRef<HTMLCanvasElement | null>(null)
  const modeRef      = useRef<'orbit' | 'select'>(mode)

  // Keep modeRef current without re-initialising the scene
  useEffect(() => { modeRef.current = mode }, [mode])

  const { handleWorkerMessage, setModelVisibility, setTypeVisibility, updateSectionPlane, removeModel } =
    useSceneSync(sceneRef.current, graph, sectionRef.current)

  // Expose these helpers for external use (ModelLayerPanel, CategoryPanel)
  // We store them on window temporarily — proper state lifting done in App
  useEffect(() => {
    // Expose via ref-like global for sibling components (avoids prop drilling for Phase 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__bim_setModelVisibility = setModelVisibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__bim_setTypeVisibility = setTypeVisibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__bim_removeModel = removeModel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__bim_updateSectionPlane = updateSectionPlane
  }, [setModelVisibility, setTypeVisibility, removeModel, updateSectionPlane])

  // ── Initialise Three.js on mount ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const { renderer, scene, camera, grid, axesCanvas } = initThreeScene(canvas)
    sceneRef.current    = scene
    cameraRef.current   = camera
    rendererRef.current = renderer
    axesRef.current     = axesCanvas

    const controls     = new CameraControls(camera, canvas)
    const picker       = new ObjectPicker(camera, scene, canvas)
    const highlight    = new HighlightManager(scene)
    const sectionPlane = new SectionPlane(renderer)

    controlsRef.current  = controls
    pickerRef.current    = picker
    highlightRef.current = highlight
    sectionRef.current   = sectionPlane

    // Position axes gizmo
    wrapper.style.position = 'relative'
    wrapper.appendChild(axesCanvas)

    // Resize observer
    const ro = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = wrapper
      resizeRenderer(renderer, camera, w, h)
    })
    ro.observe(wrapper)
    resizeRenderer(renderer, camera, wrapper.clientWidth, wrapper.clientHeight)

    // Grid y-position — set after models load via fitToBbox
    grid.position.y = 0

    // Render loop
    const stopLoop = startRenderLoop(renderer, scene, camera, () => {
      controls.update()
      if (axesRef.current) drawAxesGizmo(axesRef.current, camera)
    })

    onSceneReady?.({ scene, camera, controls, sectionPlane, highlightManager: highlight })

    return () => {
      stopLoop()
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      axesCanvas.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Re-sync useSceneSync when refs are ready ─────────────────────────────────
  // useSceneSync uses scene/graph/sectionPlane from closure — we need to bridge
  // the initial render where refs aren't set yet.
  // Solution: expose handleWorkerMessage via onWorkerMessage callback (parent does it)

  // ── Fit camera trigger ───────────────────────────────────────────────────────
  useEffect(() => {
    if (fitTrigger === 0) return
    const controls = controlsRef.current
    if (!controls) return
    const bbox = graph.globalBbox()
    if (!bbox.isEmpty()) {
      controls.fitToBbox(bbox)
      // Move grid to model floor
      const sceneGrid = sceneRef.current?.children.find((c) => c instanceof THREE.GridHelper)
      if (sceneGrid) sceneGrid.position.y = bbox.min.y
    }
  }, [fitTrigger, graph])

  // ── Selection highlight ──────────────────────────────────────────────────────
  useEffect(() => {
    const h = highlightRef.current
    if (!h) return
    h.clearAll()
    if (selectedExpressId !== null) {
      h.highlight(selectedExpressId, 'selected')
    }
  }, [selectedExpressId])

  // ── Click handler (canvas) ───────────────────────────────────────────────────
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (modeRef.current !== 'select') return
      const picker = pickerRef.current
      if (!picker) return
      const result = picker.pick(e.nativeEvent)
      if (result) {
        onObjectPicked(result.expressId, result.modelId)
      } else {
        onObjectPicked(-1, '') // deselect
      }
    },
    [onObjectPicked],
  )

  // ── Forward worker messages to useSceneSync ──────────────────────────────────
  // We can't call handleWorkerMessage directly here (stale closure from useSceneSync).
  // Instead we bridge via the ref once scene is ready.
  const sceneSyncRef = useRef(handleWorkerMessage)
  sceneSyncRef.current = handleWorkerMessage

  useEffect(() => {
    // Expose the message handler so the parent can forward Worker messages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__bim_handleWorkerMessage = (msg: FromWorker) => {
      sceneSyncRef.current(msg)
      onWorkerMessage(msg)
    }
  }, [onWorkerMessage])

  return (
    <div ref={wrapperRef} className="relative w-full h-full bg-surface-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: mode === 'select' ? 'crosshair' : 'grab' }}
        onClick={handleClick}
      />
    </div>
  )
}
