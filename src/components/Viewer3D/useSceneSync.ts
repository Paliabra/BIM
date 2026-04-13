import { useRef, useCallback } from 'react'
import * as THREE from 'three'
import type { SceneGraph } from '../../core/SceneGraph'
import { applyRelationsBatch } from '../../core/ifc-relations'
import type { FromWorker } from '../../workers/worker-protocol'
import type { IfcObject } from '../../types/ifc-schema'
import { SectionPlane } from '../../renderer/SectionPlane'

let meshIdCounter = 0

/**
 * Receives Worker messages and synchronises them into:
 *   1. The SceneGraph (semantic layer)
 *   2. The Three.js scene (visual layer)
 *
 * The key invariant: geometry is the primary source of truth (SPEC §1).
 * Bounding boxes come from the Worker (computed from vertices), not from
 * declared IFC attributes.
 *
 * Called with R3 mitigated: buffers arrive as transferables (already owned by main thread).
 */
export function useSceneSync(
  scene: THREE.Scene | null,
  graph: SceneGraph | null,
  sectionPlane: SectionPlane | null,
) {
  // Map expressId → Three.js mesh IDs for quick lookup
  const meshMap = useRef(new Map<number, THREE.Mesh[]>())

  const handleWorkerMessage = useCallback(
    (msg: FromWorker): void => {
      if (!scene || !graph) return

      switch (msg.type) {
        case 'OBJECT': {
          // Reconstruct Three.js BufferGeometry from transferred buffers
          // Vertices are interleaved (x,y,z,nx,ny,nz stride=6) — split here
          const { vertices, indices, matrix: matArr, color, bboxMin, bboxMax } = msg

          const posCount = vertices.length / 2
          const pos = new Float32Array(posCount)
          const nrm = new Float32Array(posCount)
          for (let i = 0; i < vertices.length; i += 6) {
            const b = i / 2
            pos[b]   = vertices[i];   pos[b+1] = vertices[i+1]; pos[b+2] = vertices[i+2]
            nrm[b]   = vertices[i+3]; nrm[b+1] = vertices[i+4]; nrm[b+2] = vertices[i+5]
          }

          const geometry = new THREE.BufferGeometry()
          geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
          geometry.setAttribute('normal',   new THREE.BufferAttribute(nrm, 3))
          geometry.setIndex(new THREE.BufferAttribute(indices, 1))

          const [r, g, b, a] = color
          const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(r, g, b),
            opacity: a,
            transparent: a < 0.99,
            side: THREE.DoubleSide,
            clippingPlanes: sectionPlane?.active ? [sectionPlane.plane] : [],
          })

          const mesh = new THREE.Mesh(geometry, material)
          mesh.applyMatrix4(new THREE.Matrix4().fromArray(Array.from(matArr)))
          mesh.castShadow = true
          mesh.receiveShadow = true
          mesh.userData.objectId = msg.expressId
          mesh.userData.modelId  = msg.modelId
          mesh.userData.meshId   = ++meshIdCounter

          scene.add(mesh)

          // Track mesh for this expressId
          const existing = meshMap.current.get(msg.expressId) ?? []
          existing.push(mesh)
          meshMap.current.set(msg.expressId, existing)

          // Build or update IfcObject in SceneGraph
          const bbox = new THREE.Box3(
            new THREE.Vector3(...bboxMin),
            new THREE.Vector3(...bboxMax),
          )

          if (graph.has(msg.expressId)) {
            // Object already exists (multiple geometry chunks for same expressId)
            graph.get(msg.expressId)!.bbox.union(bbox)
            graph.setMeshIds(msg.expressId, existing.map((m) => m.userData.meshId as number))
          } else {
            const obj: IfcObject = {
              expressId:   msg.expressId,
              globalId:    msg.globalId,
              ifcType:     msg.ifcType,
              ifcTypeCode: msg.ifcTypeCode,
              name:        msg.name,
              modelId:     msg.modelId,
              meshIds:     [mesh.userData.meshId as number],
              bbox,
              matrix:      new THREE.Matrix4().fromArray(Array.from(matArr)),
              relations: {
                decomposedBy: [],
                spaceBoundaries: [],
                connectedTo: [],
              },
              analysisState: null,
            }
            graph.add(obj)
          }
          break
        }

        case 'RELATIONS': {
          applyRelationsBatch(graph, msg)
          break
        }

        case 'PROPERTIES': {
          graph.setProperties(msg.expressId, msg.data)
          break
        }

        // PROGRESS, TREE, DONE, ERROR handled at App level
        default:
          break
      }
    },
    [scene, graph, sectionPlane],
  )

  /**
   * Show/hide all meshes for a given model.
   */
  const setModelVisibility = useCallback(
    (modelId: string, visible: boolean) => {
      if (!scene) return
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.modelId === modelId) {
          obj.visible = visible
        }
      })
    },
    [scene],
  )

  /**
   * Show/hide a specific set of objects by expressId.
   * Used by ModelTree storey/space visibility toggles.
   */
  const setObjectsVisibility = useCallback(
    (expressIds: Set<number>, visible: boolean) => {
      for (const expressId of expressIds) {
        const meshes = meshMap.current.get(expressId) ?? []
        for (const m of meshes) m.visible = visible
      }
    },
    [],
  )

  /**
   * Show/hide all meshes of a given IFC type name.
   */
  const setTypeVisibility = useCallback(
    (ifcType: string, visible: boolean) => {
      if (!graph || !scene) return
      const objects = graph.byType(ifcType)
      for (const obj of objects) {
        const meshes = meshMap.current.get(obj.expressId) ?? []
        for (const m of meshes) m.visible = visible
      }
    },
    [graph, scene],
  )

  /**
   * Update section plane on all existing materials.
   */
  const updateSectionPlane = useCallback(
    (plane: THREE.Plane | null) => {
      if (!scene) return
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return
        const mat = obj.material
        if (!Array.isArray(mat) && mat instanceof THREE.MeshPhongMaterial) {
          mat.clippingPlanes = plane ? [plane] : []
          mat.needsUpdate = true
        }
      })
    },
    [scene],
  )

  /**
   * Remove all Three.js meshes for a given model from the scene.
   */
  const removeModel = useCallback(
    (modelId: string) => {
      if (!scene) return
      const toRemove: THREE.Object3D[] = []
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.modelId === modelId) {
          toRemove.push(obj)
        }
      })
      for (const obj of toRemove) {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (!Array.isArray(obj.material)) obj.material.dispose()
        }
        scene.remove(obj)
      }
    },
    [scene],
  )

  return { handleWorkerMessage, setModelVisibility, setTypeVisibility, setObjectsVisibility, updateSectionPlane, removeModel }
}
