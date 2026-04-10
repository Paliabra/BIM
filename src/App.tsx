import { useReducer, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { SceneGraph } from './core/SceneGraph'
import { ModelRegistry } from './core/ModelRegistry'
import { Viewer3D } from './components/Viewer3D/Viewer3D'
import { DisciplineModal } from './components/DisciplineModal'
import { LoadingOverlay } from './components/LoadingOverlay'
import { ModelTree } from './components/ModelTree'
import { CategoryPanel } from './components/CategoryPanel'
import { PropertiesPanel } from './components/PropertiesPanel'
import { ModelLayerPanel } from './components/ModelLayerPanel'
import { SectionControls } from './components/SectionControls'
import type { IfcSpatialTree, IfcModel } from './types/ifc-schema'
import type { FromWorker } from './workers/worker-protocol'
import type { SectionAxis, SectionPlane } from './renderer/SectionPlane'
import type { CameraControls } from './renderer/CameraControls'
import type { HighlightManager } from './renderer/HighlightManager'
import type * as THREE from 'three'

// ─── Scene refs type ─────────────────────────────────────────────────────────

type SceneRefs = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: CameraControls
  sectionPlane: SectionPlane
  highlightManager: HighlightManager
}

// ─── State ───────────────────────────────────────────────────────────────────

interface LoadingState {
  filename: string
  percent: number
  count: number
  discipline: string
}

interface AppState {
  models: IfcModel[]
  trees: IfcSpatialTree[]
  selectedExpressId: number | null
  selectedModelId: string | null
  mode: 'orbit' | 'select'
  fitTrigger: number
  loading: LoadingState | null
  pendingFile: File | null
  /** Bumped on each DONE message — triggers CategoryPanel recompute */
  sceneVersion: number
  /** Bumped on each PROPERTIES message — triggers PropertiesPanel re-read */
  propertiesVersion: number
}

type AppAction =
  | { type: 'FILE_PENDING'; file: File }
  | { type: 'DISCIPLINE_CONFIRMED' }
  | { type: 'DISCIPLINE_CANCELLED' }
  | { type: 'LOADING_PROGRESS'; percent: number; count: number; filename: string; discipline: string }
  | { type: 'MODEL_DONE'; models: IfcModel[] }
  | { type: 'TREE_RECEIVED'; tree: IfcSpatialTree }
  | { type: 'OBJECT_PICKED'; expressId: number; modelId: string }
  | { type: 'PROPERTIES_RECEIVED' }
  | { type: 'MODEL_VISIBILITY'; modelId: string; visible: boolean }
  | { type: 'MODEL_DISCIPLINE'; modelId: string; discipline: string }
  | { type: 'MODE_TOGGLE' }
  | { type: 'FIT' }

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'FILE_PENDING':
      return { ...state, pendingFile: action.file }

    case 'DISCIPLINE_CONFIRMED':
    case 'DISCIPLINE_CANCELLED':
      return { ...state, pendingFile: null }

    case 'LOADING_PROGRESS':
      return {
        ...state,
        loading: {
          filename: action.filename,
          percent: action.percent,
          count: action.count,
          discipline: action.discipline,
        },
      }

    case 'MODEL_DONE':
      return {
        ...state,
        loading: null,
        models: action.models,
        fitTrigger: state.fitTrigger + 1,
        sceneVersion: state.sceneVersion + 1,
      }

    case 'TREE_RECEIVED':
      return {
        ...state,
        trees: [
          ...state.trees.filter((t) => t.modelId !== action.tree.modelId),
          action.tree,
        ],
      }

    case 'OBJECT_PICKED':
      if (action.expressId === -1) {
        return { ...state, selectedExpressId: null, selectedModelId: null }
      }
      return { ...state, selectedExpressId: action.expressId, selectedModelId: action.modelId }

    case 'PROPERTIES_RECEIVED':
      return { ...state, propertiesVersion: state.propertiesVersion + 1 }

    case 'MODEL_VISIBILITY':
      return {
        ...state,
        models: state.models.map((m) =>
          m.modelId === action.modelId ? { ...m, visible: action.visible } : m,
        ),
      }

    case 'MODEL_DISCIPLINE':
      return {
        ...state,
        models: state.models.map((m) =>
          m.modelId === action.modelId ? { ...m, discipline: action.discipline } : m,
        ),
      }

    case 'MODE_TOGGLE':
      return { ...state, mode: state.mode === 'orbit' ? 'select' : 'orbit' }

    case 'FIT':
      return { ...state, fitTrigger: state.fitTrigger + 1 }

    default:
      return state
  }
}

const initialState: AppState = {
  models: [],
  trees: [],
  selectedExpressId: null,
  selectedModelId: null,
  mode: 'orbit',
  fitTrigger: 0,
  loading: null,
  pendingFile: null,
  sceneVersion: 0,
  propertiesVersion: 0,
}

// ─── App ─────────────────────────────────────────────────────────────────────

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Stable class instances — not React state (mutations don't need re-renders)
  const graphRef = useRef(new SceneGraph())
  const registryRef = useRef(new ModelRegistry())
  const workerRef = useRef<Worker | null>(null)
  const sceneRefsRef = useRef<SceneRefs | null>(null)

  // ── Worker lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const worker = new Worker(
      new URL('./workers/ifc.worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent<FromWorker>) => {
      const msg = e.data

      // Forward geometry/relations/properties to Viewer3D's scene sync
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__bim_handleWorkerMessage?.(msg)

      switch (msg.type) {
        case 'PROGRESS': {
          const model = registryRef.current.get(msg.modelId)
          if (model) {
            dispatch({
              type: 'LOADING_PROGRESS',
              percent: msg.percent,
              count: msg.count,
              filename: model.filename,
              discipline: model.discipline,
            })
          }
          break
        }
        case 'TREE': {
          dispatch({ type: 'TREE_RECEIVED', tree: msg.data })
          break
        }
        case 'DONE': {
          registryRef.current.setObjectCount(msg.modelId, msg.totalObjects)
          registryRef.current.setBbox(msg.modelId, msg.bbox)
          dispatch({ type: 'MODEL_DONE', models: registryRef.current.all() })
          break
        }
        case 'PROPERTIES': {
          dispatch({ type: 'PROPERTIES_RECEIVED' })
          break
        }
        case 'ERROR': {
          console.error('[IFC Worker]', msg.message)
          dispatch({ type: 'MODEL_DONE', models: registryRef.current.all() })
          break
        }
      }
    }

    return () => worker.terminate()
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (e.key === 'f' || e.key === 'F') dispatch({ type: 'FIT' })
      if (e.key === 'Escape') dispatch({ type: 'OBJECT_PICKED', expressId: -1, modelId: '' })
      if (e.key === ' ') {
        e.preventDefault()
        dispatch({ type: 'MODE_TOGGLE' })
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // ── Drag-and-drop ─────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.name.toLowerCase().endsWith('.ifc'),
    )
    if (file) dispatch({ type: 'FILE_PENDING', file })
  }, [])

  // ── File input (button alternative to drag-and-drop) ─────────────────────
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) dispatch({ type: 'FILE_PENDING', file })
    e.target.value = '' // reset so same file can be dropped again
  }, [])

  // ── Discipline confirmed → start parsing ──────────────────────────────────
  const handleDisciplineConfirmed = useCallback(
    (discipline: string) => {
      const file = state.pendingFile
      if (!file || !workerRef.current) return

      const modelId = registryRef.current.register(file.name, discipline)
      dispatch({ type: 'DISCIPLINE_CONFIRMED' })

      file.arrayBuffer().then((buffer) => {
        workerRef.current!.postMessage({ type: 'LOAD', buffer, modelId }, [buffer])
      })
    },
    [state.pendingFile],
  )

  // ── Object picked ─────────────────────────────────────────────────────────
  const handleObjectPicked = useCallback((expressId: number, modelId: string) => {
    dispatch({ type: 'OBJECT_PICKED', expressId, modelId })
  }, [])

  // ── Properties requested ──────────────────────────────────────────────────
  const handleRequestProperties = useCallback((expressId: number, modelId: string) => {
    workerRef.current?.postMessage({ type: 'GET_PROPERTIES', expressId, modelId })
  }, [])

  // ── Model visibility ──────────────────────────────────────────────────────
  const handleVisibilityChange = useCallback((modelId: string, visible: boolean) => {
    registryRef.current.setVisibility(modelId, visible)
    dispatch({ type: 'MODEL_VISIBILITY', modelId, visible })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__bim_setModelVisibility?.(modelId, visible)
  }, [])

  // ── Model discipline ──────────────────────────────────────────────────────
  const handleDisciplineChange = useCallback((modelId: string, discipline: string) => {
    registryRef.current.setDiscipline(modelId, discipline)
    dispatch({ type: 'MODEL_DISCIPLINE', modelId, discipline })
  }, [])

  // ── Section plane ─────────────────────────────────────────────────────────
  const handleSectionChange = useCallback((axis: SectionAxis | null, position: number) => {
    const sp = sceneRefsRef.current?.sectionPlane
    if (!sp) return
    if (axis === null) {
      sp.disable()
    } else {
      sp.setAxis(axis)
      sp.setPosition(position)
      if (!sp.active) sp.enable()
    }
    // Update clipping planes on all existing mesh materials
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__bim_updateSectionPlane?.(sp.active ? sp.plane : null)
  }, [])

  // ── Scene ready ───────────────────────────────────────────────────────────
  const handleSceneReady = useCallback((refs: SceneRefs) => {
    sceneRefsRef.current = refs
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="w-screen h-screen bg-surface-900 flex flex-col overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="h-10 bg-surface-800 border-b border-surface-700 flex items-center px-4 gap-3 shrink-0 z-10">
        <span className="text-white font-semibold text-sm tracking-tight select-none">
          BIM Viewer
        </span>
        <div className="w-px h-4 bg-surface-600" />

        {/* Open file button */}
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".ifc"
            className="hidden"
            onChange={handleFileInput}
            disabled={!!state.loading}
          />
          <span className="px-3 py-1 rounded text-xs bg-surface-600 text-surface-300 hover:text-white hover:bg-surface-500 transition-colors cursor-pointer">
            Ouvrir IFC
          </span>
        </label>

        <div className="flex-1" />

        {/* Model count */}
        {state.models.length > 0 && (
          <span className="text-surface-500 text-xs font-mono">
            {state.models.length} modèle{state.models.length > 1 ? 's' : ''}
          </span>
        )}

        {/* Interaction mode toggle */}
        <button
          onClick={() => dispatch({ type: 'MODE_TOGGLE' })}
          title="Basculer orbit / sélection (Espace)"
          className={[
            'px-3 py-1 rounded text-xs font-medium transition-colors',
            state.mode === 'select'
              ? 'bg-accent text-white'
              : 'bg-surface-600 text-surface-300 hover:text-white',
          ].join(' ')}
        >
          {state.mode === 'orbit' ? '↻ Orbite' : '⊹ Sélection'}
        </button>

        {/* Fit button */}
        <button
          onClick={() => dispatch({ type: 'FIT' })}
          title="Cadrer la vue (F)"
          className="px-3 py-1 rounded text-xs bg-surface-600 text-surface-300 hover:text-white transition-colors"
        >
          ⊠ Cadrer
        </button>
      </header>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left sidebar */}
        <aside className="w-56 bg-surface-800 border-r border-surface-700 flex flex-col min-h-0 overflow-hidden">
          <SideSection title="Structure">
            <ModelTree trees={state.trees} />
          </SideSection>
          <SideSection title="Catégories" grow>
            <CategoryPanel graph={graphRef.current} version={state.sceneVersion} />
          </SideSection>
        </aside>

        {/* 3D Viewport */}
        <div className="flex-1 relative min-w-0">
          <Viewer3D
            graph={graphRef.current}
            onWorkerMessage={() => {}}
            onObjectPicked={handleObjectPicked}
            mode={state.mode}
            selectedExpressId={state.selectedExpressId}
            fitTrigger={state.fitTrigger}
            onSceneReady={handleSceneReady}
          />

          {/* Loading overlay */}
          {state.loading && (
            <LoadingOverlay
              filename={state.loading.filename}
              percent={state.loading.percent}
              count={state.loading.count}
              discipline={state.loading.discipline}
            />
          )}

          {/* Drop zone hint — shown when no models loaded */}
          {state.models.length === 0 && !state.loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <div className="text-center">
                <div className="text-5xl mb-4 opacity-30">⬆</div>
                <p className="text-surface-400 text-sm font-medium">
                  Déposez un fichier IFC ici
                </p>
                <p className="text-surface-600 text-xs mt-1">IFC 2x3 · IFC 4.3</p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="w-60 bg-surface-800 border-l border-surface-700 flex flex-col min-h-0 overflow-hidden">
          {state.models.length > 0 && (
            <SideSection title="Modèles">
              <ModelLayerPanel
                models={state.models}
                registry={registryRef.current}
                onVisibilityChange={handleVisibilityChange}
                onDisciplineChange={handleDisciplineChange}
              />
            </SideSection>
          )}
          <SideSection title="Propriétés" grow>
            <PropertiesPanel
              expressId={state.selectedExpressId}
              modelId={state.selectedModelId}
              graph={graphRef.current}
              dataVersion={state.propertiesVersion}
              onRequestProperties={handleRequestProperties}
            />
          </SideSection>
          {state.models.length > 0 && (
            <SideSection title="Plan de coupe">
              <SectionControls
                graph={graphRef.current}
                onSectionChange={handleSectionChange}
              />
            </SideSection>
          )}
        </aside>
      </div>

      {/* ── Discipline modal ───────────────────────────────────────────────── */}
      {state.pendingFile && (
        <DisciplineModal
          filename={state.pendingFile.name}
          existingCustom={registryRef.current.customDisciplines}
          onConfirm={handleDisciplineConfirmed}
          onCancel={() => dispatch({ type: 'DISCIPLINE_CANCELLED' })}
        />
      )}
    </div>
  )
}

// ─── Sidebar section wrapper ──────────────────────────────────────────────────

function SideSection({
  title,
  children,
  grow,
}: {
  title: string
  children: ReactNode
  grow?: boolean
}) {
  return (
    <div className={['flex flex-col min-h-0', grow ? 'flex-1' : 'shrink-0'].join(' ')}>
      <div className="px-3 py-1.5 border-b border-surface-700 shrink-0">
        <span className="text-surface-500 text-[10px] font-semibold uppercase tracking-widest">
          {title}
        </span>
      </div>
      <div className="overflow-y-auto flex-1 py-1 min-h-0">{children}</div>
    </div>
  )
}
