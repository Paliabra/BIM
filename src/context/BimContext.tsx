import { createContext, useContext, useRef, useCallback, type ReactNode } from 'react'
import { SceneGraph } from '../core/SceneGraph'
import { ModelRegistry } from '../core/ModelRegistry'
import type { FromWorker } from '../workers/worker-protocol'
import type { SectionAxis } from '../renderer/SectionPlane'

// ─── Renderer API ─────────────────────────────────────────────────────────────
//
// Stable interface registered by Viewer3D once its scene is ready.
// All other components access it via useBim().getRenderer().
// Using a ref (not state) so that registration never triggers re-renders.

export interface RendererAPI {
  /** Forward a Worker message (OBJECT/RELATIONS/PROPERTIES) to useSceneSync. */
  handleWorkerMessage(msg: FromWorker): void
  /** Toggle visibility of all meshes for a given model. */
  setModelVisibility(modelId: string, visible: boolean): void
  /** Toggle visibility of all meshes for a given IFC type name. */
  setTypeVisibility(ifcType: string, visible: boolean): void
  /** Toggle visibility of a specific set of objects (used by ModelTree storey toggles). */
  setObjectsVisibility(expressIds: Set<number>, visible: boolean): void
  /** Remove all meshes for a model from the scene and free GPU memory. */
  removeModel(modelId: string): void
  /** Activate or move the section plane. Pass axis=null to disable. */
  setSectionPlane(axis: SectionAxis | null, position: number): void
  /** Activate or deactivate the distance measurement tool. */
  setMeasureMode(active: boolean): void
}

// ─── Context value ────────────────────────────────────────────────────────────

interface BimContextValue {
  /** Central spatial database — mutated by Worker messages, read by panels. */
  graph: SceneGraph
  /** Multi-model registry — disciplines, visibility, bbox per model. */
  registry: ModelRegistry
  /** Access the renderer API after Viewer3D has initialised it. */
  getRenderer(): RendererAPI | null
  /** Called by Viewer3D once Three.js is ready to expose its API. */
  registerRenderer(api: RendererAPI): void
}

const BimContext = createContext<BimContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BimProvider({ children }: { children: ReactNode }) {
  // Stable instances — not React state. Mutations do not trigger re-renders.
  // Passed via context so components don't depend on the App component.
  const graph = useRef(new SceneGraph()).current
  const registry = useRef(new ModelRegistry()).current
  const rendererRef = useRef<RendererAPI | null>(null)

  const registerRenderer = useCallback((api: RendererAPI) => {
    rendererRef.current = api
  }, [])

  const getRenderer = useCallback((): RendererAPI | null => rendererRef.current, [])

  return (
    <BimContext.Provider value={{ graph, registry, getRenderer, registerRenderer }}>
      {children}
    </BimContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBim() {
  const ctx = useContext(BimContext)
  if (!ctx) throw new Error('useBim must be used inside <BimProvider>')
  return ctx
}
