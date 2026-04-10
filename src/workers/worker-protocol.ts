import type { IfcProperties, IfcSpatialTree } from '../types/ifc-schema'

// ─── Main → Worker ───────────────────────────────────────────────────────────

export type ToWorker =
  | {
      type: 'LOAD'
      buffer: ArrayBuffer // transferable — will be neutered after transfer
      modelId: string
    }
  | {
      type: 'GET_PROPERTIES'
      expressId: number
      modelId: string
    }
  | {
      /** Free web-ifc API memory for a model that has been unloaded from the scene */
      type: 'REMOVE'
      modelId: string
    }

// ─── Worker → Main ───────────────────────────────────────────────────────────

export type FromWorker =
  | {
      type: 'PROGRESS'
      modelId: string
      percent: number // 0–100
      count: number // objects processed so far
    }
  | {
      /**
       * One IFC object's geometry + spatial envelope.
       * Buffers are transferable — zero-copy (SPEC §18 / R3 risk mitigation).
       */
      type: 'OBJECT'
      modelId: string
      expressId: number
      globalId: string
      ifcType: string // 'IfcWall', 'IfcSpace', …
      ifcTypeCode: number
      name: string
      // Geometry (interleaved in Worker, split by main thread for Three.js)
      vertices: Float32Array // transferable — interleaved pos+normal: x,y,z,nx,ny,nz
      indices: Uint32Array // transferable
      matrix: Float64Array // transferable — 16-element column-major 4×4 transform
      color: [number, number, number, number] // r,g,b,a [0..1]
      // Bounding box computed from vertices in Worker (SPEC §5 — geometry is truth)
      bboxMin: [number, number, number]
      bboxMax: [number, number, number]
    }
  | {
      /**
       * All IFC spatial relations extracted in one batch at end of parsing.
       * Extracted while web-ifc is still in memory (O(1) access, SPEC §5).
       */
      type: 'RELATIONS'
      modelId: string
      /** [elementExpressId, spatialStructureExpressId] */
      containedInSpatialStructure: [number, number][]
      /** [parentExpressId, childrenExpressIds[]] — from IfcRelAggregates */
      aggregates: [number, number[]][]
      /** [spaceExpressId, boundaryElementExpressId] */
      spaceBoundaries: [number, number][]
    }
  | {
      type: 'TREE'
      modelId: string
      data: IfcSpatialTree
    }
  | {
      type: 'PROPERTIES'
      modelId: string
      expressId: number
      data: IfcProperties
    }
  | {
      type: 'DONE'
      modelId: string
      totalObjects: number
      /** World-space bounding box of the entire model */
      bbox: { min: [number, number, number]; max: [number, number, number] }
    }
  | {
      type: 'ERROR'
      modelId: string
      message: string
    }

// ─── Type guards ─────────────────────────────────────────────────────────────

export function isObjectMessage(msg: FromWorker): msg is Extract<FromWorker, { type: 'OBJECT' }> {
  return msg.type === 'OBJECT'
}
