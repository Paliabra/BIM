import { v4 as uuidv4 } from 'uuid'
import type { IfcModel } from '../types/ifc-schema'
import { PREDEFINED_DISCIPLINES, DISCIPLINE_FILENAME_PATTERNS } from '../types/ifc-schema'

/** Layer colors assigned in round-robin to models as they are loaded */
const LAYER_COLORS = [
  '#4f8ef7', '#f7934f', '#7cf77e', '#f7f44f', '#cf4ff7',
  '#4ff7e8', '#f74f4f', '#9af74f', '#f74fb8', '#4faaf7',
]

/**
 * Manages loaded IFC models — their identity, discipline, visibility and layer color.
 * Supports multi-model federation (SPEC §4).
 */
export class ModelRegistry {
  private readonly models = new Map<string, IfcModel>()
  /** User-added discipline codes not in the predefined list */
  customDisciplines: string[] = []
  private colorIndex = 0

  // ─── Registration ─────────────────────────────────────────────────────────

  /**
   * Creates a new model entry. Returns the generated modelId (UUID).
   */
  register(filename: string, discipline: string): string {
    const modelId = uuidv4()
    const color = LAYER_COLORS[this.colorIndex++ % LAYER_COLORS.length]
    this.models.set(modelId, {
      modelId,
      filename,
      discipline,
      color,
      visible: true,
      objectCount: 0,
      bbox: null,
      loadedAt: Date.now(),
    })
    // Track custom disciplines
    const allBuiltIn = PREDEFINED_DISCIPLINES.map((d) => d.code) as string[]
    if (discipline && !allBuiltIn.includes(discipline) && !this.customDisciplines.includes(discipline)) {
      this.customDisciplines.push(discipline)
    }
    return modelId
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  get(modelId: string): IfcModel | undefined {
    return this.models.get(modelId)
  }

  all(): IfcModel[] {
    return Array.from(this.models.values())
  }

  getByDiscipline(discipline: string): IfcModel[] {
    return this.all().filter((m) => m.discipline === discipline)
  }

  /** All available discipline codes: predefined + custom */
  allDisciplines(): string[] {
    const predefined = PREDEFINED_DISCIPLINES.map((d) => d.code) as string[]
    return [...predefined, ...this.customDisciplines.filter((c) => !predefined.includes(c))]
  }

  // ─── Updates ─────────────────────────────────────────────────────────────

  setDiscipline(modelId: string, discipline: string): void {
    const model = this.models.get(modelId)
    if (!model) return
    model.discipline = discipline
    const allBuiltIn = PREDEFINED_DISCIPLINES.map((d) => d.code) as string[]
    if (!allBuiltIn.includes(discipline) && !this.customDisciplines.includes(discipline)) {
      this.customDisciplines.push(discipline)
    }
  }

  setVisibility(modelId: string, visible: boolean): void {
    const model = this.models.get(modelId)
    if (model) model.visible = visible
  }

  setColor(modelId: string, color: string): void {
    const model = this.models.get(modelId)
    if (model) model.color = color
  }

  setObjectCount(modelId: string, count: number): void {
    const model = this.models.get(modelId)
    if (model) model.objectCount = count
  }

  setBbox(
    modelId: string,
    bbox: { min: [number, number, number]; max: [number, number, number] },
  ): void {
    const model = this.models.get(modelId)
    if (model) model.bbox = bbox
  }

  remove(modelId: string): void {
    this.models.delete(modelId)
  }

  clear(): void {
    this.models.clear()
    this.customDisciplines = []
    this.colorIndex = 0
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Attempt to detect discipline from filename.
   * e.g. "facade_ARC_R3.ifc" → 'ARC'
   */
  static detectDiscipline(filename: string): string | null {
    for (const { pattern, code } of DISCIPLINE_FILENAME_PATTERNS) {
      if (pattern.test(filename)) return code
    }
    return null
  }

  /** Generate a new unique modelId without registering a model */
  static generateId(): string {
    return uuidv4()
  }
}
