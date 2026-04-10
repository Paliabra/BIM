# Bilan — Phase 0 Dev

_Analyse reçue le 2026-04-10. Réponses dev inline._

---

## Architecture générale — 8.5/10

Le dev a opéré une **réécriture complète** en TypeScript + React. Ce n'était pas prescrit dans la spec
(tech-agnostic), mais les choix sont cohérents et solides. La séparation des responsabilités est propre :

```
Web Worker (parse IFC)  →  SceneGraph (base spatiale)  →  Three.js (rendu)
```

> **[Dev]** Choix assumé. React + TypeScript donne des contrats d'interface vérifiables entre les
> couches (Worker ↔ SceneGraph ↔ UI), ce qui est critique quand l'arbre de composants va grossir
> aux phases 2-5. La spec est tech-agnostic mais le projet a besoin de garanties sur les types IFC.

---

## Ce qui est solide

**Moteur spatial (le cœur) :**
- `SceneGraph` : `Map<expressId, IfcObject>` — base de données spatiale centrale, découplée du rendu
- `SpatialIndex` : requêtes AABB (containment, volume, radius) — interface stable, prête pour BVH en Phase 2
- **La géométrie est la vérité** — bbox calculée depuis les vertices réels, pas depuis les attributs IFC
  déclarés. C'est exactement le principe de la spec.
- Relations IFC extraites : `IfcRelAggregates`, `IfcRelContainedInSpatialStructure`, `IfcRelSpaceBoundary`

**Worker IFC (parsing non-bloquant) :**
- Web Worker + WASM, zéro blocage de l'interface pendant le chargement
- Transferables (zero-copy) pour les buffers géométriques
- Progression granulaire (5%→75% géom, 75%→88% relations, 88%→100% arbre)

**Tests :** 26 tests passants sur SceneGraph, ifc-relations, worker-protocol.

**Fédération :** `ModelRegistry` supporte plusieurs modèles (ARC + STR + ELEC), `modelId` partout.

---

## Ce qui est à corriger / compléter

|Priorité	| Problème	| Impact |
|---------|--------|-------|
|Haute	|window.__bim_* globaux pour la comms inter-composants	|Anti-pattern, rend les tests impossibles → Context API|
|Haute	|Pas d'UI sur les erreurs Worker (silencieuses)	|L'utilisateur ne voit rien si le fichier est malformé|
|Haute	|Index spatial O(n) linéaire — plafonne à ~10k objets	|BVH requis avant Phase 2|
|Moyenne	|Fuite mémoire : Worker garde tous les API en mémoire après suppression	|Ajouter cleanup sur suppression de modèle|
|Moyenne	|Bug mineur dans le calcul du bbox global dans le Worker (assignation incohérente)||	
|Faible	|Pas de tests directs sur SpatialIndex, pas de tests d'intégration	||

### Haute — `window.__bim_*` globaux pour la comms inter-composants

> **[Dev]** Confirmé anti-pattern. Origine : Viewer3D initialise Three.js dans un `useEffect` (mount),
> mais les callbacks de visibilité (`setModelVisibility`, `setTypeVisibility`) sont closures sur la
> scene, qui est null au premier rendu. Résoudre ça proprement nécessite soit Context API soit
> Zustand pour que tous les composants partagent un handle stable vers le renderer.
>
> **Plan Phase 1 :**
> - Créer `BimContext` (React Context) avec `{ graph, registry, renderer }` où `renderer` est un
>   objet stable avec les méthodes de visibilité et de coupe
> - Supprimer tous les `window.__bim_*`
> - Rend les composants testables (on peut mock le context dans les tests)
>
> **Workaround Phase 0 :** Les globals fonctionnent après le premier re-render (quand la scene est
> initialisée), et la visibilité n'est utile qu'après le chargement d'un modèle. Acceptable pour
> une phase de fondation, pas pour la phase 1.

---

### Haute — Pas d'UI sur les erreurs Worker (silencieuses)

> **[Dev] Corrigé dans ce commit.** Ajout de :
> - `workerError: string | null` dans AppState
> - Actions `WORKER_ERROR` / `DISMISS_ERROR` dans le reducer
> - Banner rouge dismissable au-dessus du viewport quand le Worker envoie `ERROR`
> - Message contextualisé avec le nom du fichier

---

### Haute — Index spatial O(n) linéaire — plafonne à ~10k objets

> **[Dev]** Confirmé. `SpatialIndex.query()` est une boucle O(n) sur tous les expressIds.
> L'interface est conçue pour être remplacée sans toucher les appelants — c'est le but du pattern.
>
> **Plan Phase 2 :**
> - Remplacer l'implémentation par `three-mesh-bvh` (déjà listé dans la ROADMAP)
> - `SpatialIndex.insert()` alimente le BVH, `SpatialIndex.query()` utilise `bvh.intersectsBox()`
> - Zéro changement pour `SceneGraph` et les phases suivantes
>
> La limite de 10k objets avant dégradation perceptible est correcte. Les modèles Revit moyens
> (ARC complet) sont à 50-200k objets — le BVH est bloquant avant Phase 2.

---

### Moyenne — Fuite mémoire : Worker garde tous les API en mémoire après suppression

> **[Dev] Partiellement corrigé dans ce commit.** Ajout du message `REMOVE` dans `ToWorker` et
> du handler dans `ifc.worker.ts` qui appelle `api.CloseModel()` et supprime l'entrée du Map.
>
> Il n'y a pas encore d'UI "supprimer un modèle" — ce sera Phase 1. Mais le plomberie Worker est
> en place : quand on ajoutera le bouton, il suffira de `postMessage({ type: 'REMOVE', modelId })`
> depuis App.tsx.

---

### Moyenne — Bug dans le calcul du bbox global du Worker

> **[Dev] Corrigé dans ce commit.** Bug : les lignes 178 et 181 réassignaient la référence du
> tableau (`globalBboxMin = localBboxMin`) au lieu de mettre à jour les composants. Les lignes
> suivantes comparaient alors le tableau à lui-même → composants [1] et [2] jamais mis à jour
> quand le composant [0] était le minimum.
>
> Fix : `globalBboxMin[0] = localBboxMin[0]` (mise à jour par composant, pas réassignation).
> Impact : la bbox dans le message `DONE` était fausse pour des modèles multi-objets. Le SceneGraph
> calculait correctement sa propre bbox (union des bboxes reçues), donc les requêtes spatiales
> n'étaient pas affectées — seul `ModelRegistry.bbox` était corrompu.

---

### Faible — Pas de tests directs sur `SpatialIndex`, pas de tests d'intégration

> **[Dev]** `SpatialIndex` est couvert indirectement via `SceneGraph.queryVolume()` dans les tests
> SceneGraph. Tests d'intégration (Worker → SceneGraph) non prioritaires en Phase 0 car le Worker
> utilise web-ifc WASM qui ne tourne pas dans jsdom. Prévu Phase 1 avec un mock du Worker.

---

## Alignement avec la spec

| Critère | Statut | Notes |
|---------|--------|-------|
| Géométrie comme vérité primaire | ✅ | bbox depuis vertices, pas attributs déclarés |
| Règle "objet d'abord, pas le contenant" | ✅ | SceneGraph permet requêtes sans IfcSpace |
| Fédération multi-modèles | ✅ | ModelRegistry + modelId partout |
| Parsing non-bloquant | ✅ | Web Worker + transferables |
| Interface stable BVH/CSG Phase 2+ | ✅ | SpatialIndex.query() = seul point d'entrée |
| CSG / calculs volumiques réels | ❌ | Phase 4 — Manifold3D |
| Moteur de règles | ❌ | Phase 5 |
| Couche delta | ❌ | Phase 3 |

---

## Verdict

Phase 0 : livrée. La fondation spatiale est correcte et bien pensée. Le risque principal avant d'aller plus loin est le pattern window.* pour les communications inter-composants — à refactoriser avant que l'arbre de composants ne grossisse. Le reste des manques sont normaux pour une Phase 0.

La prochaine étape naturelle est Phase 1 (arbre des objets complet, filtres de visibilité, LOD) en parallèle avec le passage à Context API pour la gestion d'état.

> **[Dev]** Accord sur le diagnostic. Les trois points "Haute" sont légitimes. L'ordre de traitement
> pour Phase 1 : (1) window.* → Context API car c'est du fond architectural, (2) BVH car c'est le
> prérequis pour que les analyses Phase 2 soient exploitables, (3) le reste.
>
> La prochaine étape naturelle est **Phase 1 : arbre des objets complet, filtres de visibilité LOD,
> Context API** — en parallèle avec le correctif architectural window.*.
