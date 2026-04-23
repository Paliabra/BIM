# BIM Spatial Viewer

> Un moteur d'analyse spatiale pour maquettes numériques IFC.
> La géométrie comme source de vérité. L'IA comme œil d'expert.

**Manifeste :** [`docs/article-paradigme.md`](docs/article-paradigme.md) — *Du trait à la maquette comprise* · [English](docs/article-paradigm.md)
**Spécification :** [`docs/SPEC.md`](docs/SPEC.md) — **Feuille de route :** [`ROADMAP.md`](ROADMAP.md)

---

## Le paradigme

La maquette numérique n'est pas un tableur en trois dimensions. C'est un **modèle spatial**.

Depuis que l'IFC existe, nous avons pris l'habitude de l'exploiter par ses attributs : bien nommer, bien classer, bien paramétrer — comme prérequis sine qua non à toute analyse. La géométrie, pourtant structure maîtresse du projet, a été reléguée au rang de conteneur de données.

Ce projet inverse la logique. Chaque objet est d'abord un volume à une position précise. Ses relations spatiales — containment, adjacence, intersection — sont calculées depuis ses enveloppes géométriques réelles, pas depuis les étiquettes déclarées. Si un objet est mal classifié, non classifié, ou issu d'un export bâclé, le moteur le traite quand même.

**La géométrie ne ment pas. Le dessin suffit.**

---

## Ce que permet le moteur

- **Identifier** les objets par leur forme — indépendamment de leur classe IFC
- **Déduire** la structure spatiale (logements, locaux, typologies) à partir des murs, portes et fenêtres
- **Vérifier** les conformités réelles : dégagements, raccordements, collisions, références fabricant
- **Interroger** le modèle en langage naturel via un agent IA — qui appelle les primitives spatiales comme un ingénieur appellerait des outils
- **Exposer** le tout comme serveur MCP, pour que n'importe quel client LLM compatible (Claude Desktop, autre) puisse s'y connecter et raisonner sur le modèle

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Interface                     Viewer 3D + Chat + Éditeur       │
├─────────────────────────────────────────────────────────────────┤
│  Agent de vérification         LLM ↔ primitives spatiales       │
│                                Modes : Ask / Propose / Execute  │
├─────────────────────────────────────────────────────────────────┤
│  Serveur MCP local             queryRadius, queryContained,     │
│                                measureClearance, queryMesh…     │
├─────────────────────────────────────────────────────────────────┤
│  Reconnaissance visuelle IA    3 passes (global / espace / obj) │
│                                Score composite IFC + IA + spat. │
├─────────────────────────────────────────────────────────────────┤
│  SceneGraph  ← le cœur                                          │
│   • Map<expressId, IfcObject> avec bbox issue des vertices      │
│   • SpatialIndex (AABB → BVH → CSG)                             │
│   • Relations : containment, adjacence, frontières              │
├─────────────────────────────────────────────────────────────────┤
│  Couche delta                  Re-qualification sans toucher    │
│                                au fichier IFC original          │
├─────────────────────────────────────────────────────────────────┤
│  Worker IFC                    Parsing WASM non-bloquant        │
│  ModelRegistry                 Fédération multi-modèles         │
└─────────────────────────────────────────────────────────────────┘
```

### Géométrie d'abord

La bounding box de chaque objet est calculée depuis ses **vertices réels** au moment de l'extraction, pas depuis les attributs IFC déclarés. Les relations spatiales sont dérivées de ces enveloppes. Si les propriétés IFC sont absentes, fausses ou incohérentes, l'analyse continue.

### L'IA comme œil d'expert

L'agent ne remplace pas l'ingénieur — il regarde la maquette comme un ingénieur la regarderait. Il reconnaît les objets par leur forme, mesure les distances avec les outils du moteur géométrique, et raisonne sur les intentions de l'utilisateur.

La reconnaissance visuelle opère en trois passes :

```
Passe 1 — Vue d'ensemble       discipline, typologies, zones techniques
Passe 2 — Par espace           identification dans son contexte
Passe 3 — Par objet ciblé      précision, estimation de paramètres
```

Chaque objet reçoit un score de confiance composite :

```
score = α × confiance_IFC + β × confiance_IA + γ × cohérence_spatiale
```

- **≥ 0.80** — reconnaissance silencieuse
- **0.60–0.79** — notification passive
- **< 0.60** — demande de validation active

Les corrections utilisateur sont stockées dans la couche delta et priment sur toute inférence ultérieure.

---

## Serveur MCP

Le moteur expose ses primitives spatiales comme outils MCP. Tout client LLM compatible peut s'y connecter sans modifier le viewer :

| Outil MCP | Usage |
|---|---|
| `queryRadius` | objets dans un rayon autour d'un point |
| `queryContained` | objets contenus dans une zone ou un volume |
| `queryAdjacent` | objets partageant une frontière |
| `queryIntersecting` | intersection géométrique réelle (CSG) |
| `queryMeshDistance` | distance surface-à-surface entre deux maillages |
| `measureClearance` | dégagement autour d'un objet |
| `renderObjectView` | rendu d'un objet pour analyse visuelle |
| `searchRules` | recherche dans le catalogue de règles métier |
| `applyRule` | exécution d'une règle sur une zone |
| `searchProductSpec` | confrontation à une fiche technique fabricant |

---

## Démarrage rapide

```bash
npm install
npm run dev
npm run test
npm run build
```

### Reconnaissance visuelle (opt-in)

```bash
# .env.local
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Sans cette clé, toutes les fonctionnalités du viewer sont disponibles. Seule la reconnaissance visuelle IA nécessite un fournisseur configuré.

Un modèle local embarqué (type Gemma ou équivalent) est prévu — la transition sera transparente via l'abstraction `GeometryAIProvider`.

---

## Feuille de route

| Phase | Objectif | État |
|---|---|---|
| **0** | Socle : parsing IFC, SceneGraph, viewer, sélection | ✅ |
| **1** | Visualisation complète : arbre, filtres, coupes, mesures, fédération | ⏳ |
| **2** | Indexation spatiale BVH — requêtes < 100ms sur 100k objets | ⏳ |
| **3** | Fichier projet `.bimview`, couche delta, réconciliation GUID | ⏳ |
| **4** | Sélection libre de zone, 4 primitives spatiales (CSG exact) | ⏳ |
| **5** | Moteur de règles (3 modes : visuel, texte, IA) + catalogue | ⏳ |
| **6A** | Reconnaissance visuelle IA 3 passes, score composite | ⏳ |
| **6B** | Agent de vérification + serveur MCP | ⏳ |
| **7** | Géoréférencement, superposition cartographique | ⏳ |
| **8** | Comparaison de versions, exports PDF / Excel / BCF | ⏳ |
| **9** | Optimisation mémoire, cache géométrie, modèles 3 × 500 MB | ⏳ |

Détails par phase : [`ROADMAP.md`](ROADMAP.md).

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
    ifc.worker.ts          ← parsing WASM, extraction géométrie + relations
    worker-protocol.ts     ← messages typés Worker ↔ main

  renderer/
    ThreeScene.ts          ← scène, lumières, render loop
    CameraControls.ts      ← orbite / zoom / pan
    ObjectPicker.ts        ← raycasting → SceneGraph
    HighlightManager.ts    ← états d'analyse, couleurs
    SectionPlane.ts        ← plans de coupe X/Y/Z

  components/              ← React : Viewer3D, panneaux, modales
  types/                   ← schémas IFC, entités, labels FR
  __tests__/               ← Vitest (SceneGraph, relations, protocole)

docs/
  SPEC.md                  ← spécification fonctionnelle complète
  article-paradigme.md     ← manifeste — Du trait à la maquette comprise
  analyses/                ← bilans d'analyse avec réponses dev
```

---

## Contribuer

Ce projet est né du côté de la maîtrise d'ouvrage, face aux difficultés concrètes de l'exploitation de la maquette numérique. Son bénéfice ne se limite pas à la MOA.

Si vous êtes ambitieux, passionné du mieux faire, motivé à changer les choses en bien — as de code, ouvert d'esprit, non réfractaire au changement — **vous êtes au bon endroit.**

- Issues et discussions : [github.com/paliabra/bim](https://github.com/paliabra/bim)
- Lire le manifeste avant de contribuer : [`docs/article-paradigme.md`](docs/article-paradigme.md)
- Lire la spec avant de coder : [`docs/SPEC.md`](docs/SPEC.md)

---

## Licences

| Composant | Licence |
|---|---|
| Code source | [Apache 2.0](LICENSE) |
| Spécifications & documentation | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

[![License](https://img.shields.io/badge/Code-Apache%202.0-blue.svg)](LICENSE)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/Specs-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)
