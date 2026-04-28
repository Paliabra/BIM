# Amendements SPEC v4.6 — Audit maquette 01CEH

> Date : 28 avril 2026  
> Source : analyse analytique de la maquette `01CEH_Maquette_ARC_DCE.ifc`  
> Auteur : Claude (dialogue d'audit du 27 avril 2026)  
> Statut : document de travail — 10 amendements intégrés en v5.0, 2 écartés

---

## Contexte

L'analyse de la maquette 01CEH a mis en évidence plusieurs lacunes et opportunités d'évolution dans la SPEC v4.6. Ce document consigne les 12 propositions d'amendements issues de cette session, avec leur priorité, leur effort estimé, leurs critères d'acceptation, et la décision prise pour chacune.

Observations clés sur la maquette 01CEH :
- 2 bâtiments physiques distincts déclarés comme 1 seul `IfcBuilding`
- Tous les `IfcSpace` nommés de façon uniforme — nommage non différenciant
- Éléments structuraux dont la position géométrique est incohérente avec leur niveau déclaré
- Géoréférencement déductif (paramètres de projection identifiables) mais pas formel (`IfcMapConversion` absent)
- Configuration en pilotis invisible dans la déclaration IFC — seule la géométrie révèle la structure

---

## P1 — Primitive queryConnectedComponents + detectBuildings

**Priorité** : Haute  
**Effort** : Moyen  
**Sections** : §5 (table des primitives), §17.0 (contrat MCP)

### Problème

La maquette 01CEH contient 2 bâtiments physiquement distincts déclarés comme 1 `IfcBuilding`. Aucun outil du contrat MCP ne permet de détecter cette situation automatiquement — l'agent doit reconstruire la topologie manuellement.

### Proposition

Ajouter une primitive de **composantes connexes** et un outil de **détection de bâtiments physiques** :

```typescript
tool queryConnectedComponents(
  seed?: string,
  connectionTypes?: ('wall-wall' | 'floor-ceiling' | 'structural')[]
): ToolReturn<ComponentGroup[]>

tool detectBuildings(
  modelId?: string
): ToolReturn<BuildingDetectionResult>
```

### Critères d'acceptation

- Sur une maquette avec N bâtiments physiques distincts déclarés comme 1 `IfcBuilding`, `detectBuildings()` retourne N composantes
- Le `summary` décrit chaque bâtiment physique (bbox, nombre d'objets, étages détectés)

### Décision

✅ **Intégré en v5.0**

---

## P2 — Model Health Report

**Priorité** : Haute  
**Effort** : Moyen  
**Sections** : §17.5 (nouvelle section)

### Problème

À l'ouverture d'une maquette, l'utilisateur et l'agent n'ont aucune visibilité sur l'état du fichier IFC. Les anomalies (éléments mal placés, géoréférencement faible, nommage uniforme, structure physique incohérente avec la déclaration) ne sont découvertes qu'au fil de l'analyse.

### Proposition

Un rapport de santé automatique en 5 volets, produit à l'ouverture, sans bloquer l'analyse :

| Volet | Ce qui est évalué |
|---|---|
| Placement | Objets géométriquement incohérents avec leur niveau déclaré |
| Géoréférencement | Niveau selon le diagnostic §12 |
| Population attributaire | Taux de classification, nommage, niveaux renseignés |
| Fermeture géométrique | Incohérences topologiques |
| Cohérence schéma | Déclaration IFC vs. structure physique réelle |

### Critères d'acceptation

- Rapport disponible < 5 secondes après chargement (sur modèle ≤ 100 MB)
- Accessible via `scenegraph://healthreport/{modelId}` et `getModelHealthReport()`
- N'interrompt pas l'analyse — le moteur fonctionne quel que soit le score

### Décision

✅ **Intégré en v5.0**

---

## P3 — Convention de retour ToolReturn MCP

**Priorité** : Haute  
**Effort** : Faible  
**Sections** : §17.0 (contrat MCP)

### Problème

Les outils MCP retournent des structures brutes. L'agent doit parser chaque résultat pour en extraire le sens. Sur une session complexe (dizaines d'appels), le coût de parsing s'accumule et la lisibilité du raisonnement diminue.

### Proposition

Enveloppe `ToolReturn<T>` universelle avec un champ `summary` en langage naturel :

```typescript
interface ToolReturn<T> {
  data:     T
  summary:  string   // l'agent raisonne dessus directement
  metadata: { executionTimeMs, modelId, objectCount?, warnings? }
}
```

### Critères d'acceptation

- Tous les outils MCP du contrat retournent `ToolReturn<T>`
- Le champ `summary` est suffisant pour qu'un LLM raisonne sans parser `data`

### Décision

✅ **Intégré en v5.0**

---

## P4 — Mode Describe

**Priorité** : Haute  
**Effort** : Faible  
**Sections** : §17.3 (table des modes), §17.4 (Interface IA)

### Problème

Les 3 modes actuels (Ask / Propose / Execute) sont tous orientés vérification de conformité. Il n'existe pas de mode pour répondre à "décris-moi ce projet" — une demande fréquente et légitime, en particulier pour un projet inconnu ou en début d'audit.

### Proposition

Ajouter un mode **Describe** et l'outil MCP associé :

```typescript
tool describeModel(
  scope?: ZoneId | 'full',
  detail?: 'summary' | 'detailed'
): ToolReturn<ModelDescription>
```

### Critères d'acceptation

- L'agent reconnaît les demandes de description et bascule en mode Describe sans analyse de conformité
- La description inclut : discipline, typologies, organisation spatiale, bâtiments détectés, état du géoréférencement

### Décision

✅ **Intégré en v5.0**

---

## P5 — Corpus de validation

**Priorité** : Moyenne  
**Effort** : Élevé  
**Sections** : §22 (nouvelle section)

### Problème

Aucun corpus de validation ne garantit la non-régression des primitives spatiales entre versions. Les corrections sur des maquettes réelles ne sont pas formalisées comme tests.

### Proposition

Constituer un corpus de maquettes de référence avec vérité-terrain YAML, un harnais de non-régression automatisé, et des critères de release fondés sur les résultats du corpus.

### Critères d'acceptation

- Corpus : ≥ 5 maquettes (IFC2x3 + IFC4, résidentiel + tertiaire + infrastructure)
- Harnais : exécutable en CI, rapport de couverture par primitive
- Release bloquée si régression sur toute primitive couverte

### Décision

❌ **Écarté de v5.0** — chantier QA dédié, ne relève pas de la spec produit. À traiter dans un document de stratégie de test séparé.

---

## P6 — Indépendance des canaux du score composite

**Priorité** : Moyenne  
**Effort** : Faible  
**Sections** : §17.2 (score composite)

### Problème

Quand un modèle est exporté entièrement en `IfcBuildingElementProxy`, le canal IFC est systématiquement nul pour tous les objets. La formule `α × IFC + β × IA + γ × spatial` pénalise mécaniquement tous les scores — non parce que les objets sont ambigus, mais parce que le fichier est mal exporté.

### Proposition

Exposer la décomposition par canal via une ressource MCP, avec possibilité d'ajuster la pondération effective :

```
resource scenegraph://provenance/{objectId}
→ { ifc: 0.0, ai: 0.87, spatial: 0.72, composite: 0.76, weights: [...] }
```

### Critères d'acceptation

- La ressource provenance est disponible pour tout objet du SceneGraph
- L'agent peut interroger la provenance pour calibrer son interprétation du score

### Décision

✅ **Intégré en v5.0** (simplifié — principe et ressource MCP, sans sur-spécifier le mécanisme d'ajustement)

---

## P7 — Diagnostic géoréférencement 4 niveaux

**Priorité** : Haute  
**Effort** : Faible  
**Sections** : §12 (Géoréférencement)

### Problème

La maquette 01CEH a un géoréférencement déductible (projection identifiable depuis les paramètres) mais pas formel. La SPEC actuelle ne distingue pas ces cas — or le comportement du moteur doit différer (superposition directe vs. superposition avec avertissement vs. placement manuel).

### Proposition

Table à 4 niveaux : Formel / Déductif / Local / Incohérent, avec comportement défini pour chaque niveau et compensation par delta.

### Critères d'acceptation

- Le niveau est affiché à l'utilisateur à l'ouverture du modèle
- La correction manuelle est stockée dans `delta.json` et persiste entre sessions

### Décision

✅ **Intégré en v5.0**

---

## P8 — Cas du projet multi-bâtiments

**Priorité** : Haute  
**Effort** : Faible  
**Sections** : §4 (Chargement & Fédération)

### Problème

La maquette 01CEH contient 2 bâtiments physiques dans 1 `IfcBuilding`. La SPEC §4 ne couvre pas ce cas — elle décrit la fédération multi-fichiers mais pas la multi-bâtiments intra-fichier.

### Proposition

Documenter explicitement que le moteur détecte les bâtiments physiques réels par composantes connexes, indépendamment de la déclaration IFC.

### Critères d'acceptation

- La détection multi-bâtiments fonctionne sur un fichier seul (sans fédération)
- Chaque bâtiment physique est indexé séparément dans le SceneGraph

### Décision

✅ **Intégré en v5.0**

---

## P9 — Traçabilité géométrique des entrées delta

**Priorité** : Moyenne  
**Effort** : Faible  
**Sections** : §14 (Ajout & Modification de paramètres)

### Problème

Les entrées delta produites par l'agent IA ne sont pas liées à leur origine (quelle frame, quel appel MCP). En comparaison de versions, il est impossible de savoir si une correction est toujours valide après évolution de la géométrie.

### Proposition

Enrichir le format delta avec `source` (frameId ou appel MCP), `timestamp`, et `geometryHash`. En comparaison de versions, re-valider automatiquement les entrées dont la géométrie cible a changé.

### Critères d'acceptation

- Toute entrée delta produite par l'IA contient `source`, `timestamp`, `geometryHash`
- En comparaison de versions, les entrées impactées sont marquées "à re-vérifier"

### Décision

✅ **Intégré en v5.0**

---

## P10 — Limitations IFC2x3

**Priorité** : Basse  
**Effort** : Très faible  
**Sections** : §2 (Versions IFC supportées)

### Problème

La SPEC affirme "la gestion des deux versions est transparente pour l'utilisateur". Cette formulation paraît optimiste — IFC2x3 a des limitations réelles (`IfcRelSpaceBoundary` absent, `IfcSpace` rarement géométrisé, etc.).

### Proposition

Remplacer l'affirmation par une liste explicite des limitations IFC2x3.

### Décision

❌ **Écarté de v5.0** — contradictoire avec le paradigme geometry-first. Les "limitations" listées sont précisément ce que le moteur compense par construction : §5 déduit les limites depuis les murs, la reconnaissance visuelle compense les types manquants, l'empreinte composite gère les GUID instables. L'affirmation "transparente pour l'utilisateur" est correcte dans ce paradigme — la transparence est une conséquence du choix geometry-first, pas un vœu pieux.

---

## P11 — Ouverture d'un IFC sans projet associé

**Priorité** : Haute  
**Effort** : Faible  
**Sections** : §3 (Fichier projet encapsulé)

### Problème

La SPEC §3 ne décrit que le cas du fichier projet `.bimview`. Le cas courant — un utilisateur ouvre directement un IFC — n'est pas spécifié. Le comportement du moteur dans ce cas est ambigu.

### Proposition

Flow en 5 étapes : parsing → analyse spatiale → projet temporaire → reconnaissance visuelle (background) → proposition de sauvegarde à la première modification.

### Critères d'acceptation

- L'ouverture directe d'un IFC déclenche immédiatement l'environnement (pas de dialog de création de projet requis)
- Aucun fichier n'est créé sur disque sans action explicite de l'utilisateur

### Décision

✅ **Intégré en v5.0**

---

## P12 — Rules as LLM skills

**Priorité** : Haute  
**Effort** : Moyen  
**Sections** : §7 (Moteur de règles — Structure d'une règle)

### Problème

Les règles du catalogue sont en JSON déclaratif — un format pour un moteur d'exécution algorithmique. Or dans l'architecture MCP, c'est le LLM qui est le moteur d'exécution. Un LLM ne peut pas "exécuter" un JSON déclaratif — il a besoin d'instructions procédurales.

### Proposition

Format **skill file** : frontmatter YAML (métadonnées stables) + corps Markdown (instructions procédurales exécutables par le LLM). Le LLM reçoit la règle via `searchRules()` et l'exécute directement en appelant les primitives MCP.

### Critères d'acceptation

- `searchRules(intent)` retourne le skill complet (frontmatter + corps)
- Un LLM peut exécuter le skill sans moteur de règles intermédiaire
- Le format `params` est compatible avec le fork de règle existant

### Décision

✅ **Intégré en v5.0** — format propre au projet, indépendant de tout standard externe
