import * as THREE from 'three'

export interface PickResult {
  expressId: number
  modelId: string
  point: THREE.Vector3
}

/**
 * Raycasting-based object picker.
 * On click, finds the nearest mesh with `userData.objectId` and returns the pick result.
 */
export class ObjectPicker {
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()

  constructor(
    private camera: THREE.PerspectiveCamera,
    private scene: THREE.Scene,
    private domElement: HTMLElement,
  ) {}

  /**
   * Perform a pick at the given mouse event position.
   * Returns null if no IFC object was hit.
   */
  pick(event: MouseEvent): PickResult | null {
    const rect = this.domElement.getBoundingClientRect()
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )

    this.raycaster.setFromCamera(this.pointer, this.camera)
    const meshes: THREE.Mesh[] = []
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.objectId !== undefined) {
        meshes.push(obj)
      }
    })

    const hits = this.raycaster.intersectObjects(meshes, false)
    if (hits.length === 0) return null

    const hit = hits[0]
    const mesh = hit.object as THREE.Mesh
    return {
      expressId: mesh.userData.objectId as number,
      modelId: mesh.userData.modelId as string,
      point: hit.point.clone(),
    }
  }
}
