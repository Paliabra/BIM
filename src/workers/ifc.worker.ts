/**
 * IFC Web Worker — parses IFC files using web-ifc WASM.
 * Runs entirely off the main thread to keep the UI responsive (SPEC §18).
 *
 * Responsibilities:
 *   1. Initialize web-ifc WASM
 *   2. Open the IFC model from a transferred ArrayBuffer
 *   3. Stream all geometry (StreamAllMeshes) → post OBJECT messages with transferable buffers
 *   4. Extract all IFC spatial relations in one pass → post RELATIONS batch
 *   5. Build the spatial tree (Site → Building → Storey) → post TREE
 *   6. Serve GET_PROPERTIES requests on demand (api stays alive after loading)
 *
 * Risk mitigations:
 *   R1 (memory): geometry data is transferred (zero-copy), raw buffers are not held.
 *   R2 (non-manifold): try/catch around each mesh — silently skips bad geometry.
 *   R3 (copy overhead): all Float32Array/Uint32Array sent as transferables.
 */

import * as WebIFC from 'web-ifc'
import type { ToWorker, FromWorker } from './worker-protocol'
import {
  IFC_SITE,
  IFC_BUILDING,
  IFC_BUILDING_STOREY,
  IFC_SPACE,
  IFC_PROJECT,
  IFC_REL_AGGREGATES,
  IFC_REL_CONTAINED_IN_SPATIAL_STRUCTURE,
  IFC_REL_SPACE_BOUNDARY,
  IFC_REL_DEFINES_BY_PROPERTIES,
} from '../types/ifc-entities'
import type { IfcSpatialTree, IfcTreeNode, IfcProperties } from '../types/ifc-schema'

// ─── Worker state ─────────────────────────────────────────────────────────────

/** Kept alive after loading to serve GET_PROPERTIES requests */
const apis = new Map<string, { api: WebIFC.IfcAPI; modelHandle: number }>()

// ─── Message handler ──────────────────────────────────────────────────────────

self.onmessage = async (event: MessageEvent<ToWorker>) => {
  const msg = event.data

  if (msg.type === 'LOAD') {
    await handleLoad(msg.modelId, msg.buffer)
    return
  }

  if (msg.type === 'GET_PROPERTIES') {
    const entry = apis.get(msg.modelId)
    if (!entry) return
    const data = extractProperties(entry.api, entry.modelHandle, msg.expressId)
    post({ type: 'PROPERTIES', modelId: msg.modelId, expressId: msg.expressId, data })
    return
  }

  if (msg.type === 'REMOVE') {
    const entry = apis.get(msg.modelId)
    if (entry) {
      try {
        entry.api.CloseModel(entry.modelHandle)
      } catch {
        // CloseModel may throw on already-closed models — ignore
      }
      apis.delete(msg.modelId)
    }
    return
  }
}

// ─── LOAD handler ─────────────────────────────────────────────────────────────

async function handleLoad(modelId: string, buffer: ArrayBuffer) {
  try {
    const api = new WebIFC.IfcAPI()
    // WASM files served from /public — web-ifc.wasm at root
    api.SetWasmPath('/', true)
    await api.Init()

    const modelHandle = api.OpenModel(new Uint8Array(buffer))
    // R1: buffer is already neutered (transferred) — don't hold a reference

    apis.set(modelId, { api, modelHandle })

    // ── Pass 1: build expressId → typeCode map for all lines ──────────────────
    const allLines = api.GetAllLines(modelHandle)
    const total = allLines.size()
    const expressIdToTypeCode = new Map<number, number>()
    for (let i = 0; i < total; i++) {
      const id = allLines.get(i)
      expressIdToTypeCode.set(id, api.GetLineType(modelHandle, id))
    }

    // ── Pass 2: StreamAllMeshes → post OBJECT chunks ──────────────────────────
    let objectCount = 0
    let globalBboxMin: [number, number, number] = [Infinity, Infinity, Infinity]
    let globalBboxMax: [number, number, number] = [-Infinity, -Infinity, -Infinity]

    post({ type: 'PROGRESS', modelId, percent: 5, count: 0 })

    api.StreamAllMeshes(modelHandle, (mesh: WebIFC.FlatMesh) => {
      try {
        const placedGeoms = mesh.geometries
        if (placedGeoms.size() === 0) return

        // We accumulate geometry for this expressId across all sub-meshes
        // For the OBJECT message we send the combined bbox and the first transform
        let localBboxMin: [number, number, number] = [Infinity, Infinity, Infinity]
        let localBboxMax: [number, number, number] = [-Infinity, -Infinity, -Infinity]
        let firstMatrix: Float64Array | null = null

        for (let i = 0; i < placedGeoms.size(); i++) {
          const pg = placedGeoms.get(i)

          const geom = api.GetGeometry(modelHandle, pg.geometryExpressID)
          const vertsRaw = api.GetVertexArray(geom.GetVertexData(), geom.GetVertexDataSize())
          const idxsRaw = api.GetIndexArray(geom.GetIndexData(), geom.GetIndexDataSize())
          geom.delete() // R1: free WASM memory immediately

          if (vertsRaw.length === 0 || idxsRaw.length === 0) continue

          // Copy to owned buffers (vertsRaw/idxsRaw are views into WASM memory, not transferable)
          const vertices = new Float32Array(vertsRaw)
          const indices = new Uint32Array(idxsRaw)

          const matrix = new Float64Array(pg.flatTransformation)
          if (firstMatrix === null) firstMatrix = matrix

          const color: [number, number, number, number] = [
            pg.color.x, pg.color.y, pg.color.z, pg.color.w,
          ]

          // Compute bounding box from transformed positions
          // Vertices are interleaved: x,y,z,nx,ny,nz (stride = 6)
          const mat = matrix
          for (let v = 0; v < vertices.length; v += 6) {
            const lx = vertices[v], ly = vertices[v + 1], lz = vertices[v + 2]
            // Apply 4×4 column-major matrix transform
            const wx = mat[0]*lx + mat[4]*ly + mat[8]*lz  + mat[12]
            const wy = mat[1]*lx + mat[5]*ly + mat[9]*lz  + mat[13]
            const wz = mat[2]*lx + mat[6]*ly + mat[10]*lz + mat[14]

            if (wx < localBboxMin[0]) localBboxMin[0] = wx
            if (wy < localBboxMin[1]) localBboxMin[1] = wy
            if (wz < localBboxMin[2]) localBboxMin[2] = wz
            if (wx > localBboxMax[0]) localBboxMax[0] = wx
            if (wy > localBboxMax[1]) localBboxMax[1] = wy
            if (wz > localBboxMax[2]) localBboxMax[2] = wz
          }

          // Get identity metadata
          const typeCode = expressIdToTypeCode.get(mesh.expressID) ?? 0
          const typeName = typeCode ? (api.GetNameFromTypeCode(typeCode) ?? `IFC_${typeCode}`) : 'UNKNOWN'

          let globalId = ''
          let name = ''
          try {
            const line = api.GetLine(modelHandle, mesh.expressID)
            globalId = String(line?.GlobalId?.value ?? '')
            name = String(line?.Name?.value ?? '')
          } catch {
            // Some elements lack Name/GlobalId — skip silently
          }

          // Post geometry chunk with transferable buffers (R3: zero-copy)
          const objMsg: FromWorker = {
            type: 'OBJECT',
            modelId,
            expressId: mesh.expressID,
            globalId,
            ifcType: typeName,
            ifcTypeCode: typeCode,
            name,
            vertices,
            indices,
            matrix,
            color,
            bboxMin: localBboxMin,
            bboxMax: localBboxMax,
          }
          ;(self as unknown as Worker).postMessage(objMsg, [
            vertices.buffer,
            indices.buffer,
            matrix.buffer,
          ])

          objectCount++
        }

        // Update global bbox — compare each component independently (no array reassignment)
        if (localBboxMin[0] < globalBboxMin[0]) globalBboxMin[0] = localBboxMin[0]
        if (localBboxMin[1] < globalBboxMin[1]) globalBboxMin[1] = localBboxMin[1]
        if (localBboxMin[2] < globalBboxMin[2]) globalBboxMin[2] = localBboxMin[2]
        if (localBboxMax[0] > globalBboxMax[0]) globalBboxMax[0] = localBboxMax[0]
        if (localBboxMax[1] > globalBboxMax[1]) globalBboxMax[1] = localBboxMax[1]
        if (localBboxMax[2] > globalBboxMax[2]) globalBboxMax[2] = localBboxMax[2]

        // Progress: geometry phase = 5% → 75%
        if (objectCount % 200 === 0) {
          post({
            type: 'PROGRESS',
            modelId,
            percent: 5 + Math.round((objectCount / Math.max(total * 0.3, 1)) * 70),
            count: objectCount,
          })
        }
      } catch {
        // R2: skip malformed/non-manifold geometry silently
      }
    })

    post({ type: 'PROGRESS', modelId, percent: 75, count: objectCount })

    // ── Pass 3: extract IFC spatial relations ──────────────────────────────────
    const relations = extractRelations(api, modelHandle)
    post({ type: 'RELATIONS', modelId, ...relations })

    post({ type: 'PROGRESS', modelId, percent: 88, count: objectCount })

    // ── Pass 4: build spatial tree ────────────────────────────────────────────
    const tree = buildSpatialTree(api, modelHandle, modelId)
    post({ type: 'TREE', modelId, data: tree })

    post({ type: 'PROGRESS', modelId, percent: 100, count: objectCount })

    // Sanitize bbox if model was empty
    if (!isFinite(globalBboxMin[0])) {
      globalBboxMin = [0, 0, 0]
      globalBboxMax = [1, 1, 1]
    }

    post({
      type: 'DONE',
      modelId,
      totalObjects: objectCount,
      bbox: { min: globalBboxMin, max: globalBboxMax },
    })
  } catch (err) {
    post({
      type: 'ERROR',
      modelId,
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

// ─── Relations extraction ─────────────────────────────────────────────────────

function extractRelations(api: WebIFC.IfcAPI, modelHandle: number) {
  const containedInSpatialStructure: [number, number][] = []
  const aggregates: [number, number[]][] = []
  const spaceBoundaries: [number, number][] = []

  // IfcRelContainedInSpatialStructure
  try {
    const ids = api.GetLineIDsWithType(modelHandle, IFC_REL_CONTAINED_IN_SPATIAL_STRUCTURE)
    for (let i = 0; i < ids.size(); i++) {
      try {
        const rel = api.GetLine(modelHandle, ids.get(i), true)
        const spaceId = rel?.RelatingStructure?.value
        const elements = rel?.RelatedElements
        if (!spaceId || !elements) continue
        const elems = Array.isArray(elements) ? elements : [elements]
        for (const e of elems) {
          const eid = e?.value ?? e
          if (typeof eid === 'number') containedInSpatialStructure.push([eid, spaceId])
        }
      } catch { /* skip malformed relation */ }
    }
  } catch { /* type not present in this file */ }

  // IfcRelAggregates
  try {
    const ids = api.GetLineIDsWithType(modelHandle, IFC_REL_AGGREGATES)
    for (let i = 0; i < ids.size(); i++) {
      try {
        const rel = api.GetLine(modelHandle, ids.get(i), true)
        const parentId = rel?.RelatingObject?.value
        const children = rel?.RelatedObjects
        if (!parentId || !children) continue
        const childIds = (Array.isArray(children) ? children : [children])
          .map((c: { value?: number }) => c?.value ?? c)
          .filter((id): id is number => typeof id === 'number')
        if (childIds.length > 0) aggregates.push([parentId, childIds])
      } catch { /* skip malformed relation */ }
    }
  } catch { /* type not present */ }

  // IfcRelSpaceBoundary — extract now, use in Phase 2
  try {
    const ids = api.GetLineIDsWithType(modelHandle, IFC_REL_SPACE_BOUNDARY)
    for (let i = 0; i < ids.size(); i++) {
      try {
        const rel = api.GetLine(modelHandle, ids.get(i), false)
        const spaceId = rel?.RelatingSpace?.value
        const elemId = rel?.RelatedBuildingElement?.value
        if (typeof spaceId === 'number' && typeof elemId === 'number') {
          spaceBoundaries.push([spaceId, elemId])
        }
      } catch { /* skip */ }
    }
  } catch { /* type not present */ }

  return { containedInSpatialStructure, aggregates, spaceBoundaries }
}

// ─── Spatial tree builder ─────────────────────────────────────────────────────

function buildSpatialTree(
  api: WebIFC.IfcAPI,
  modelHandle: number,
  modelId: string,
): IfcSpatialTree {
  const getIds = (typeCode: number): number[] => {
    try {
      const ids = api.GetLineIDsWithType(modelHandle, typeCode)
      const result: number[] = []
      for (let i = 0; i < ids.size(); i++) result.push(ids.get(i))
      return result
    } catch { return [] }
  }

  const makeNode = (
    expressId: number,
    ifcType: string,
    children: IfcTreeNode[] = [],
  ): IfcTreeNode => {
    let name = ''
    let globalId = ''
    let elevation: number | undefined
    try {
      const line = api.GetLine(modelHandle, expressId)
      name = String(line?.Name?.value ?? '')
      globalId = String(line?.GlobalId?.value ?? '')
      elevation = typeof line?.Elevation?.value === 'number' ? line.Elevation.value : undefined
    } catch { /* skip */ }
    return { expressId, globalId, ifcType, name, elevation, children }
  }

  const sites: IfcTreeNode[] = getIds(IFC_SITE).map((siteId) => {
    const buildings = getIds(IFC_BUILDING).map((bId) => {
      const storeys = getIds(IFC_BUILDING_STOREY).map((stId) => {
        const spaces = getIds(IFC_SPACE).map((spId) => makeNode(spId, 'IfcSpace'))
        return makeNode(stId, 'IfcBuildingStorey', spaces)
      })
      return makeNode(bId, 'IfcBuilding', storeys)
    })
    return makeNode(siteId, 'IfcSite', buildings)
  })

  const projectIds = getIds(IFC_PROJECT)
  const project =
    projectIds.length > 0 ? makeNode(projectIds[0], 'IfcProject', sites) : undefined

  return { modelId, project, sites }
}

// ─── Properties extractor ─────────────────────────────────────────────────────

function extractProperties(
  api: WebIFC.IfcAPI,
  modelHandle: number,
  expressId: number,
): IfcProperties {
  const attributes: Record<string, string | number | boolean | null> = {}
  const psets: IfcProperties['psets'] = []
  const quantities: IfcProperties['quantities'] = []

  // Direct attributes
  try {
    const line = api.GetLine(modelHandle, expressId)
    const ATTR_KEYS = ['Name', 'Description', 'ObjectType', 'Tag', 'LongName', 'PredefinedType']
    for (const key of ATTR_KEYS) {
      const val = line?.[key]?.value
      if (val !== undefined && val !== null && val !== '') {
        attributes[key] = val as string | number | boolean
      }
    }
  } catch { /* skip */ }

  // Property sets via IfcRelDefinesByProperties
  try {
    const relIds = api.GetLineIDsWithType(modelHandle, IFC_REL_DEFINES_BY_PROPERTIES)
    for (let i = 0; i < relIds.size(); i++) {
      try {
        const rel = api.GetLine(modelHandle, relIds.get(i), true)
        if (!rel?.RelatedObjects) continue

        const related = Array.isArray(rel.RelatedObjects)
          ? rel.RelatedObjects
          : [rel.RelatedObjects]
        const hasElement = related.some((o: { value?: number }) => (o?.value ?? o) === expressId)
        if (!hasElement) continue

        const pset = rel.RelatingPropertyDefinition
        if (!pset) continue

        const psetName = String(pset.Name?.value ?? 'Propriétés')

        if (pset.HasProperties && Array.isArray(pset.HasProperties)) {
          // IfcPropertySet
          const properties = pset.HasProperties
            .map((p: { Name?: { value: string }; NominalValue?: unknown }) => ({
              name: String(p.Name?.value ?? ''),
              value: parseIfcValue(p.NominalValue),
            }))
            .filter((p: { name: string }) => p.name !== '')
          if (properties.length > 0) psets.push({ name: psetName, properties })
        } else if (pset.Quantities && Array.isArray(pset.Quantities)) {
          // IfcElementQuantity
          const qItems = pset.Quantities
            .map((q: Record<string, { value?: number } | undefined>) => {
              const name = String((q.Name as { value?: string } | undefined)?.value ?? '')
              let value: number | null = null
              let unit: 'm' | 'm²' | 'm³' | 'count' | '' = ''
              if (q.LengthValue != null) { value = Number(q.LengthValue.value); unit = 'm' }
              else if (q.AreaValue != null) { value = Number(q.AreaValue.value); unit = 'm²' }
              else if (q.VolumeValue != null) { value = Number(q.VolumeValue.value); unit = 'm³' }
              else if (q.CountValue != null) { value = Number(q.CountValue.value); unit = 'count' }
              return { name, value, unit }
            })
            .filter((q: { name: string; value: number | null }) => q.name !== '' && q.value !== null)
          if (qItems.length > 0) quantities.push({ name: psetName, quantities: qItems })
        }
      } catch { /* skip malformed relation */ }
    }
  } catch { /* type not present */ }

  return { attributes, psets, quantities }
}

function parseIfcValue(val: unknown): string | number | boolean | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'object' && val !== null) {
    const v = (val as Record<string, unknown>).value
    if (v !== undefined) return parseIfcValue(v)
    return JSON.stringify(val)
  }
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') return val
  return String(val)
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function post(msg: FromWorker) {
  ;(self as unknown as Worker).postMessage(msg)
}
