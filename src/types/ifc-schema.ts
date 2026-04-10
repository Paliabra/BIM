import type * as THREE from 'three'

// ─── Core IFC Object (ISO 16739 / SPEC §5) ───────────────────────────────────

/**
 * The canonical representation of an IFC object in the scene graph.
 * Built at parse time, enriched across phases.
 * This is the central data structure — geometry is the primary source of truth (SPEC §1).
 */
export interface IfcObject {
  // Identity (ISO 16739)
  expressId: number
  globalId: string // IfcGloballyUniqueId
  ifcType: string // 'IfcWall', 'IfcSpace', 'IfcBoiler', …
  ifcTypeCode: number // numeric type code from web-ifc
  name: string
  modelId: string // which IFC file (federation — SPEC §4)

  // Rendering ref (managed by renderer layer)
  meshIds: number[] // Three.js mesh userData.objectId values

  // Spatial envelope — PRIMARY SOURCE OF TRUTH (SPEC §5)
  // Computed from geometry vertices in the Worker, NOT from declared IFC attributes
  bbox: THREE.Box3
  matrix: THREE.Matrix4 // world-space transform of the first geometry piece

  // IFC relations extracted at load time (SPEC §5)
  // Full relation extraction enables Phase 2+ spatial queries without re-parsing
  relations: IfcRelations

  // Properties — loaded on demand (clic on object)
  properties?: IfcProperties

  // Delta layer — user-added / user-modified params (Phase 3 — SPEC §14)
  delta?: Record<string, unknown>

  // Analysis result state (Phase 5 — SPEC §9)
  analysisState?: 'compliant' | 'non-compliant' | 'warning' | null
}

export interface IfcRelations {
  /** Parent spatial container — from IfcRelContainedInSpatialStructure */
  containedInSpatialStructure?: number
  /** Parent in the spatial decomposition hierarchy — from IfcRelAggregates */
  decomposes?: number
  /** Direct children in the hierarchy */
  decomposedBy: number[]
  /** Space boundaries — from IfcRelSpaceBoundary (Phase 2+) */
  spaceBoundaries: number[]
  /** Physical connections — from IfcRelConnects* (Phase 2+) */
  connectedTo: number[]
}

// ─── Properties ──────────────────────────────────────────────────────────────

export interface IfcProperties {
  /** Direct IFC attributes (Name, Description, Tag, ObjectType, etc.) */
  attributes: Record<string, string | number | boolean | null>
  /** Property Sets — IfcPropertySet */
  psets: IfcPSet[]
  /** Quantity Sets — IfcElementQuantity */
  quantities: IfcQuantitySet[]
}

export interface IfcPSet {
  name: string
  properties: IfcProperty[]
}

export interface IfcProperty {
  name: string
  value: string | number | boolean | null
}

export interface IfcQuantitySet {
  name: string
  quantities: IfcQuantity[]
}

export interface IfcQuantity {
  name: string
  value: number
  unit: 'm' | 'm²' | 'm³' | 'count' | ''
}

// ─── Spatial Tree ────────────────────────────────────────────────────────────

/**
 * Hierarchical spatial structure: Project → Site → Building → Storey → Space
 * Built from IfcRelAggregates and IfcRelContainedInSpatialStructure
 */
export interface IfcSpatialTree {
  modelId: string
  project?: IfcTreeNode
  sites: IfcTreeNode[]
}

export interface IfcTreeNode {
  expressId: number
  globalId: string
  ifcType: string
  name: string
  elevation?: number // for IfcBuildingStorey
  children: IfcTreeNode[]
}

// ─── Model (federation — SPEC §4) ────────────────────────────────────────────

/**
 * Predefined BIM discipline codes.
 * "Cette liste sera à travailler et affiner" — SPEC §4 / plan
 */
export const PREDEFINED_DISCIPLINES = [
  { code: 'ARC', label: 'Architecture' },
  { code: 'STR', label: 'Structure / Gros œuvre' },
  { code: 'ELEC', label: 'Électricité' },
  { code: 'ELEC CFA', label: 'Électricité courants forts' },
  { code: 'ELEC CFO', label: 'Électricité courants faibles' },
  { code: 'CVC', label: 'Chauffage / Ventilation / Climatisation' },
  { code: 'PLB', label: 'Plomberie / Sanitaire' },
  { code: 'INC', label: 'Sécurité incendie' },
  { code: 'VRD', label: 'Voirie et réseaux divers' },
  { code: 'PAY', label: 'Paysage / Extérieur' },
  { code: 'INT', label: 'Aménagement intérieur' },
] as const

export type PredefinedDisciplineCode = (typeof PREDEFINED_DISCIPLINES)[number]['code']

/** Auto-detection patterns for discipline from filename */
export const DISCIPLINE_FILENAME_PATTERNS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /[_\-\s.]ARC[_\-\s.]/i, code: 'ARC' },
  { pattern: /[_\-\s.]STR[_\-\s.]/i, code: 'STR' },
  { pattern: /[_\-\s.]ELEC[_\-\s.]/i, code: 'ELEC' },
  { pattern: /[_\-\s.]CFA[_\-\s.]/i, code: 'ELEC CFA' },
  { pattern: /[_\-\s.]CFO[_\-\s.]/i, code: 'ELEC CFO' },
  { pattern: /[_\-\s.]CVC[_\-\s.]/i, code: 'CVC' },
  { pattern: /[_\-\s.]PLB[_\-\s.]/i, code: 'PLB' },
  { pattern: /[_\-\s.]INC[_\-\s.]/i, code: 'INC' },
  { pattern: /[_\-\s.]VRD[_\-\s.]/i, code: 'VRD' },
]

export interface IfcModel {
  modelId: string // UUID
  filename: string // original IFC filename
  discipline: string // 'ARC', 'STR', or custom
  /** Layer color — hex string, auto-assigned and user-modifiable */
  color: string
  visible: boolean
  objectCount: number
  bbox: { min: [number, number, number]; max: [number, number, number] } | null
  loadedAt: number // Date.now()
}

// ─── Analysis ────────────────────────────────────────────────────────────────

/** Colours for analysis state highlights (Phase 5+) */
export const ANALYSIS_COLORS = {
  compliant: 0x22c55e,
  'non-compliant': 0xef4444,
  warning: 0xf59e0b,
  selected: 0x4f8ef7,
} as const
