# BIM Spatial Viewer — Moteur d'analyse spatiale IFC

> Un moteur d'analyse spatiale pour maquettes numériques IFC, avec reconnaissance visuelle IA.  
> Spécification complète : [`docs/SPEC.md`](docs/SPEC.md) — Feuille de route : [`ROADMAP.md`](ROADMAP.md)

---

## Ce que c'est

Ce n'est pas une visionneuse IFC avec quelques fonctions d'analyse en plus. C'est un **moteur d'analyse spatiale** dont la visionneuse 3D est l'interface de surface.

La distinction est architecturalement critique : chaque objet IFC est représenté dans un graphe de scène spatiale (`SceneGraph`) avec ses enveloppes géométriques réelles, ses relations topologiques et son score de confiance d'identification. L'analyse porte sur ces données géométriques — pas sur les attributs déclarés dans le fichier IFC. Si un objet est mal classifié, non classifié, ou issu d'un export bâclé, le moteur et la couche IA le traitent quand même.

**Paradigme fondamental :** Un fichier IFC est une carte. Chaque objet a une définition (ce qu'il est) et une position (où il est). L'analyse consiste à comparer, regrouper et mesurer ces objets selon leurs positions et leurs relations spatiales — comme un SIG, mais pour le bâtiment.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Interface utilisateur          React 18 + Tailwind CSS         │
│  Viewer 3D, Panneaux, Chat IA, Éditeur de règles                │
├─────────────────────────────────────────────────────────────────┤
│  Couche rendu                   Three.js r183+                  │
│  Caméra, Sélection, Highlights, LOD, Plans de coupe             │
├─────────────────────────────────────────────────────────────────┤
│  SceneGraph ← LA PIÈCE CENTRALE                                 │
│  Map<expressId, IfcObject>                                      │
│  SpatialIndex (AABB → BVH Phase 2 → CSG Phase 4)               │
│  Relations : containment, adjacence, frontières                 │
│  Reconnaissance IA : type fonctionnel + score composite         │
├─────────────────────────────────────────────────────────────────┤
│  Couche IA                                                      │
│  GeometryAIProvider (abstraction fournisseur)                   │
│  Reconnaissance visuelle 3 passes + Agent de vérification       │
├─────────────────────────────────────────────────────────────────┤
│  Worker IFC                     web-ifc WASM                    │
│  Parsing non-bloquant, transferables zero-copy                  │
│  Extraction géométrie + relations + bbox en une seule passe     │
├─────────────────────────────────────────────────────────────────┤
│  ModelRegistry                                                  │
│  Fédération multi-fichiers, disciplines, origines               │
└─────────────────────────────────────────────────────────────────┘
```

### Principe de la géométrie comme vérité primaire

La bounding box de chaque objet est calculée depuis ses **vertices réels** (par le Worker, à l'extraction), pas depuis les attributs IFC déclarés. Les relations spatiales (containment, adjacence) sont calculées depuis ces enveloppes géométriques. Si les propriétés IFC sont absentes ou fausses, l'analyse continue — la géométrie est la source de vérité.

---

## Couche IA — Reconnaissance visuelle

### L'IA comme expert, la géométrie comme outil

L'agent IA opère comme un ingénieur expert qui regarde la maquette : il reconnaît les objets par leur forme, mesure les dégagements avec les outils du moteur géométrique, et raisonne sur les intentions de l'utilisateur. La classification IFC est un indice parmi d'autres, jamais une condition bloquante.

### Reconnaissance visuelle 3 passes

Au chargement de chaque modèle, la reconnaissance visuelle est lancée automatiquement en arrière-plan :

```
Passe 1 — Vue d'ensemble du modèle
  → Contexte global : discipline, typologies dominantes, zones techniques

Passe 2 — Par espace / zone
  → Rendu de chaque espace avec ses objets contenus
  → Identification par type fonctionnel dans le contexte

Passe 3 — Par objet ciblé
  → Objets non classifiés, scores faibles, demandes utilisateur
  → Identification précise + estimation de paramètres
```

### Score de confiance composite

Chaque objet reçoit un score combinant trois sources :

```
score = 0.20 × confiance_IFC + 0.60 × confiance_IA + 0.20 × cohérence_spatiale
```

- **≥ 0.80** : reconnaissance automatique silencieuse
- **0.60–0.79** : notification passive, correction possible
- **< 0.60** : demande de validation active

Les corrections utilisateur sont stockées dans la couche delta du projet et prennent priorité absolue dans toutes les analyses suivantes.

### Fournisseur IA

- **Actuellement** : API Claude Vision (Anthropic) — opt-in explicite, données IFC jamais transmises (seulement des captures PNG rendues localement)
- **Prévu** : modèle local embarqué (type Gemma 4+) — la transition sera transparente via l'abstraction `GeometryAIProvider`

---

## Stack technique

| Couche | Technologie |
|---|---|
| Langage | TypeScript strict |
| UI | React 18 + Vite |
| Styles | Tailwind CSS (thème sombre) |
| Rendu 3D | Three.js r183+ (WebGL, clipping planes, LOD) |
| Parser IFC | web-ifc 0.0.77 (WASM) dans Web Worker |
| Tests | Vitest + jsdom |
| Couche IA | GeometryAIProvider (Claude Vision API, local à venir) |
| Phase 2+ | three-mesh-bvh (BVH derrière SpatialIndex) |
| Phase 4+ | Manifold3D (CSG exact) |
| Phase 3+ | Dexie.js / IndexedDB (cache géométrie, fichier .bimview) |

---

## Démarrage rapide

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Lancer les tests
npm run test

# Build de production
npm run build
```

### Variables d'environnement (optionnel — reconnaissance visuelle IA)

```bash
# Clé API Anthropic pour la reconnaissance visuelle (opt-in)
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Sans cette variable, toutes les fonctionnalités sont disponibles sauf la reconnaissance visuelle IA.

---

## Fonctionnalités par phase

### Phase 0 — Fondations spatiales ✅

- Chargement IFC par glisser-déposer (Web Worker, non-bloquant)
- SceneGraph : `Map<expressId, IfcObject>` avec bbox réelle, relations IFC, fédération
- Rendu Three.js progressif (objets dès les premières secondes)
- Sélection d'objet → propriétés IFC (PSets, quantités)
- Arbre du modèle (Site → Bâtiment → Étage → Espace)
- Filtres de visibilité par type IFC et par modèle
- Plans de coupe (X / Y / Z)
- Assignation de discipline à l'ouverture (ARC, STR, ELEC, CVC, PLB…)
- Fédération multi-modèles simultanée
- 26 tests Vitest sur SceneGraph, relations IFC, protocole Worker

### Phase 1 — Visualisation complète ⏳

- Context API (remplacement des globals `window.__bim_*`)
- Arbre hiérarchique complet avec toggle de visibilité par nœud
- Filtres LOD (niveaux de détail selon distance caméra)
- Mesures manuelles (distance, surface, angle)

### Phase 2 — Indexation spatiale ⏳

- BVH (`three-mesh-bvh`) derrière `SpatialIndex`
- Requêtes spatiales en temps réel sur 100k+ objets (< 100ms)
- Croisement inter-modèles par position géométrique

### Phase 3 — Fichier projet & Couche delta ⏳

- Format `.bimview` (archive IFC + delta + règles + zones + historique)
- Couche delta : ajout/modification de paramètres sans toucher le fichier IFC
- Re-qualification des objets non typés
- Réconciliation des identifiants inter-versions

### Phase 4 — Sélection de zone & Primitives ⏳

- Sélection libre (rectangle, polygone, manuelle)
- 4 primitives spatiales : Containment, Adjacence, Intersection, Mesure
- CSG exact (Manifold3D) pour l'Intersection

### Phase 5 — Moteur de règles ⏳

- Éditeur de règles (3 modes : visuel / texte / IA)
- Catalogue de règles prédéfinies (PMR, sécurité incendie, NF DTU…)
- Résultats en surbrillance 3D (conforme / non conforme / avertissement)

### Phase 6A — Reconnaissance visuelle IA ⏳

- `GeometryAIProvider` — abstraction stable pour tous les fournisseurs
- API Claude Vision — 3 passes de reconnaissance
- Score de confiance composite
- Panneau de validation utilisateur

### Phase 6B — Agent de vérification IA ⏳

- Interface chat en langage naturel
- Interprétation d'intentions → règles structurées
- Modes Propose / Execute
- Vérifications robustes sur objets mal classifiés (object-first)

### Phases 7–9 ⏳

- Géoréférencement & superposition cartographique
- Comparaison de versions (V1 vs V2)
- Exports (PDF, Excel, BCF)
- Optimisation mémoire, cache géométrie, gestion modèles 3 × 500 MB

---

## Structure du projet

```
src/
  core/
    SceneGraph.ts          ← Map<expressId, IfcObject> + requêtes spatiales
    SpatialIndex.ts        ← AABB (→ BVH Phase 2, → CSG Phase 4)
    ModelRegistry.ts       ← fédération multi-modèles, disciplines
    ifc-relations.ts       ← application des relations batch IFC

  workers/
    ifc.worker.ts          ← parsing web-ifc WASM, extraction complète
    worker-protocol.ts     ← ToWorker / FromWorker typés

  renderer/
    ThreeScene.ts          ← renderer, lumières, render loop
    CameraControls.ts      ← orbite / zoom / pan
    ObjectPicker.ts        ← raycasting → SceneGraph lookup
    HighlightManager.ts    ← sélection, états d'analyse, couleurs
    SectionPlane.ts        ← plans de coupe X/Y/Z

  components/
    Viewer3D/
      Viewer3D.tsx         ← canvas + hooks Three.js
      useSceneSync.ts      ← sync SceneGraph → Three.js scene
    ModelTree.tsx          ← arbre hiérarchique IFC
    ModelLayerPanel.tsx    ← toggles visibilité par modèle/discipline
    CategoryPanel.tsx      ← toggles visibilité par type IFC
    PropertiesPanel.tsx    ← propriétés IFC + PSets + quantités
    SectionControls.tsx    ← sélecteur axe + slider position
    LoadingOverlay.tsx     ← progression chargement
    DisciplineModal.tsx    ← assignation discipline à l'ouverture

  types/
    ifc-schema.ts          ← IfcObject, IfcSpatialTree, IfcProperties
    ifc-entities.ts        ← constantes types IFC + labels FR

  __tests__/
    SceneGraph.test.ts
    ifc-relations.test.ts
    worker-protocol.test.ts

docs/
  SPEC.md                  ← spécification fonctionnelle complète (v4.0)
  analyses/                ← bilans d'analyse avec réponses dev
```

---

## Raccourcis clavier

| Touche | Action |
|---|---|
| `O` | Mode orbite |
| `S` | Mode sélection |
| `F` | Recadrer sur le modèle |
| `Échap` | Désélectionner |

---

## Licences

| Composant | Licence |
|---|---|
| Spécifications (`docs/SPEC.md`) | CC BY-SA 4.0 |
| Code source | Apache 2.0 |

- Le code source est sous licence [Apache 2.0](LICENSE)
- Les spécifications et la documentation sont sous licence [CC-BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

[![License](https://img.shields.io/badge/Code-Apache%202.0-blue.svg)](LICENSE)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/Specs-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)
