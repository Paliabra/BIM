/**
 * IFC Entity Type Codes — ISO 16739 (buildingSMART)
 * Conforming to web-ifc 0.0.68 constants.
 * Used for GetLineIDsWithType() calls in the Worker.
 */

// Spatial structure
export const IFC_SITE = 4097777520
export const IFC_BUILDING = 4031249490
export const IFC_BUILDING_STOREY = 3124254112
export const IFC_SPACE = 3856911033
export const IFC_PROJECT = 103090709
export const IFC_ZONE = 1033361043

// Relations — spatial structure
export const IFC_REL_AGGREGATES = 160246688
export const IFC_REL_CONTAINED_IN_SPATIAL_STRUCTURE = 3242617779
export const IFC_REL_SPACE_BOUNDARY = 3451746338

// Relations — properties
export const IFC_REL_DEFINES_BY_PROPERTIES = 4186316022
export const IFC_REL_DEFINES_BY_TYPE = 781010003

// Relations — connectivity
export const IFC_REL_CONNECTS_PATH_ELEMENTS = 330165205
export const IFC_REL_FILLS_ELEMENT = 3940055652
export const IFC_REL_VOIDS_ELEMENT = 1401173127

// Wall family
export const IFC_WALL = 2391406946
export const IFC_WALL_STANDARD_CASE = 3512223829
export const IFC_WALL_ELEMENT_CASE = 4156078855
export const IFC_CURTAIN_WALL = 3495092785

// Slab / Roof
export const IFC_SLAB = 1529196076
export const IFC_SLAB_STANDARD_CASE = 3127900445
export const IFC_ROOF = 2262370178
export const IFC_FOOTING = 900683007

// Openings / Doors / Windows
export const IFC_OPENING_ELEMENT = 3588315303
export const IFC_DOOR = 395920057
export const IFC_WINDOW = 3304561284

// Structure
export const IFC_COLUMN = 843113511
export const IFC_BEAM = 753842376
export const IFC_MEMBER = 1073191201
export const IFC_PLATE = 3171933400

// Stairs
export const IFC_STAIR = 331165859
export const IFC_STAIR_FLIGHT = 4252922144
export const IFC_RAMP = 3024970846
export const IFC_RAMP_FLIGHT = 3283111854
export const IFC_RAILING = 2535016829

// MEP - HVAC
export const IFC_BOILER = 32344328
export const IFC_CHILLER = 3902619387
export const IFC_HEAT_EXCHANGER = 1765591967
export const IFC_PUMP = 76236018
export const IFC_COMPRESSOR = 3571504051
export const IFC_UNITARY_EQUIPMENT = 4292641817
export const IFC_FLOW_MOVING_DEVICE = 4073093595
export const IFC_FLOW_TERMINAL = 2297155007
export const IFC_SPACE_HEATER = 1999602285
export const IFC_FAN = 3415622556
export const IFC_AIR_TERMINAL = 1411407467

// MEP - Electrical
export const IFC_ELECTRIC_APPLIANCE = 1904799276
export const IFC_ELECTRIC_DISTRIBUTION_BOARD = 3862327254
export const IFC_ELECTRIC_MOTOR = 402227799
export const IFC_LIGHTING_FIXTURE = 629592764
export const IFC_OUTLET = 3694346114
export const IFC_PROTECTION_DEVICE = 31400217

// MEP - Plumbing / Fire
export const IFC_SANITARY_TERMINAL = 3242481149
export const IFC_FIRE_SUPPRESSION_TERMINAL = 1426591983
export const IFC_WATER_HEATER = 2304771477

// Furniture / Equipment
export const IFC_FURNISHING_ELEMENT = 263784265
export const IFC_FURNITURE = 1509553395
export const IFC_SYSTEM_FURNITURE_ELEMENT = 1973544240

// Building element proxy (untyped objects)
export const IFC_BUILDING_ELEMENT_PROXY = 1095909175

// Proxy / generic
export const IFC_PROXY = 3219374653

/**
 * Human-readable labels for IFC types (FR)
 */
export const IFC_TYPE_LABELS: Record<number, string> = {
  [IFC_SITE]: 'Site',
  [IFC_BUILDING]: 'Bâtiment',
  [IFC_BUILDING_STOREY]: 'Niveau',
  [IFC_SPACE]: 'Espace',
  [IFC_PROJECT]: 'Projet',
  [IFC_ZONE]: 'Zone',
  [IFC_WALL]: 'Mur',
  [IFC_WALL_STANDARD_CASE]: 'Mur (standard)',
  [IFC_CURTAIN_WALL]: 'Mur rideau',
  [IFC_SLAB]: 'Dalle',
  [IFC_ROOF]: 'Toiture',
  [IFC_FOOTING]: 'Fondation',
  [IFC_DOOR]: 'Porte',
  [IFC_WINDOW]: 'Fenêtre',
  [IFC_COLUMN]: 'Poteau',
  [IFC_BEAM]: 'Poutre',
  [IFC_STAIR]: 'Escalier',
  [IFC_RAILING]: 'Garde-corps',
  [IFC_BOILER]: 'Chaudière',
  [IFC_PUMP]: 'Pompe',
  [IFC_HEAT_EXCHANGER]: 'Échangeur thermique',
  [IFC_COMPRESSOR]: 'Compresseur',
  [IFC_FLOW_TERMINAL]: 'Terminal fluide',
  [IFC_SPACE_HEATER]: 'Radiateur',
  [IFC_FAN]: 'Ventilateur',
  [IFC_ELECTRIC_APPLIANCE]: 'Appareil électrique',
  [IFC_LIGHTING_FIXTURE]: 'Luminaire',
  [IFC_OUTLET]: 'Prise',
  [IFC_SANITARY_TERMINAL]: 'Terminal sanitaire',
  [IFC_FURNISHING_ELEMENT]: 'Mobilier',
  [IFC_BUILDING_ELEMENT_PROXY]: 'Élément générique',
}

/**
 * Set of IFC types that require maintenance access (SPEC §1, chaufferie example)
 */
export const MAINTENANCE_TYPES = new Set([
  IFC_BOILER,
  IFC_CHILLER,
  IFC_HEAT_EXCHANGER,
  IFC_PUMP,
  IFC_COMPRESSOR,
  IFC_UNITARY_EQUIPMENT,
  IFC_FLOW_MOVING_DEVICE,
])

/**
 * Spatial structure entity types (used to build the model tree)
 */
export const SPATIAL_STRUCTURE_TYPES = new Set([
  IFC_PROJECT,
  IFC_SITE,
  IFC_BUILDING,
  IFC_BUILDING_STOREY,
  IFC_SPACE,
])
