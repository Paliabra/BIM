import { describe, it, expect } from 'vitest'
import { isObjectMessage } from '../workers/worker-protocol'
import type { FromWorker } from '../workers/worker-protocol'

describe('worker-protocol', () => {
  describe('isObjectMessage()', () => {
    it('returns true for OBJECT messages', () => {
      const msg: FromWorker = {
        type: 'OBJECT',
        modelId: 'model-1',
        expressId: 42,
        globalId: 'some-guid',
        ifcType: 'IfcWall',
        ifcTypeCode: 2391406946,
        name: 'Wall',
        vertices: new Float32Array([0, 0, 0, 0, 0, 1]),
        indices: new Uint32Array([0]),
        matrix: new Float64Array(16),
        color: [0.8, 0.8, 0.8, 1.0],
        bboxMin: [0, 0, 0],
        bboxMax: [1, 1, 1],
      }
      expect(isObjectMessage(msg)).toBe(true)
    })

    it('returns false for non-OBJECT messages', () => {
      const progress: FromWorker = {
        type: 'PROGRESS',
        modelId: 'model-1',
        percent: 50,
        count: 100,
      }
      expect(isObjectMessage(progress)).toBe(false)

      const done: FromWorker = {
        type: 'DONE',
        modelId: 'model-1',
        totalObjects: 500,
        bbox: { min: [0, 0, 0], max: [10, 10, 10] },
      }
      expect(isObjectMessage(done)).toBe(false)

      const error: FromWorker = {
        type: 'ERROR',
        modelId: 'model-1',
        message: 'Something went wrong',
      }
      expect(isObjectMessage(error)).toBe(false)
    })
  })

  describe('message shape validation', () => {
    it('PROGRESS message has required fields', () => {
      const msg: FromWorker = {
        type: 'PROGRESS',
        modelId: 'abc',
        percent: 75.5,
        count: 300,
      }
      expect(msg.type).toBe('PROGRESS')
      expect(msg.percent).toBeGreaterThanOrEqual(0)
      expect(msg.percent).toBeLessThanOrEqual(100)
    })

    it('RELATIONS message has correct tuple arrays', () => {
      const msg: FromWorker = {
        type: 'RELATIONS',
        modelId: 'model-1',
        containedInSpatialStructure: [
          [10, 5],
          [11, 5],
        ],
        aggregates: [[5, [6, 7]]],
        spaceBoundaries: [[5, 10]],
      }
      expect(msg.containedInSpatialStructure).toHaveLength(2)
      expect(msg.containedInSpatialStructure[0]).toHaveLength(2)
      expect(msg.aggregates[0][1]).toContain(6)
      expect(msg.aggregates[0][1]).toContain(7)
    })

    it('DONE message has bbox with min/max arrays', () => {
      const msg: FromWorker = {
        type: 'DONE',
        modelId: 'model-1',
        totalObjects: 1234,
        bbox: {
          min: [-10.5, 0, -8.2],
          max: [15.3, 30, 8.2],
        },
      }
      expect(msg.bbox.min).toHaveLength(3)
      expect(msg.bbox.max).toHaveLength(3)
      expect(msg.totalObjects).toBe(1234)
    })

    it('OBJECT message has transferable typed arrays', () => {
      const vertices = new Float32Array([0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1])
      const indices = new Uint32Array([0, 1, 2])
      const matrix = new Float64Array(16)
      matrix[0] = 1; matrix[5] = 1; matrix[10] = 1; matrix[15] = 1 // identity

      const msg: FromWorker = {
        type: 'OBJECT',
        modelId: 'model-1',
        expressId: 100,
        globalId: '3nPVsX0FP0bgcb2Ft$jq3H',
        ifcType: 'IfcSpace',
        ifcTypeCode: 3856911033,
        name: 'Room 101',
        vertices,
        indices,
        matrix,
        color: [0.5, 0.8, 0.9, 0.3],
        bboxMin: [0, 0, 0],
        bboxMax: [5, 3, 4],
      }

      expect(msg.vertices).toBeInstanceOf(Float32Array)
      expect(msg.indices).toBeInstanceOf(Uint32Array)
      expect(msg.matrix).toBeInstanceOf(Float64Array)
      expect(msg.matrix).toHaveLength(16)
      expect(msg.color).toHaveLength(4)
      expect(msg.bboxMin).toHaveLength(3)
      expect(msg.bboxMax).toHaveLength(3)
    })
  })
})
