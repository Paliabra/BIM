# Bilan global — Vision, Spec & Dev

_Analyse produite le 2026-04-11. Couvre l'ensemble de la production depuis le début du projet._

---

## 1. Ce qui a été produit

| Livrable | Version | État |
|---|---|---|
| `docs/SPEC.md` | v4.3 — 1217 lignes, 21 sections | Référence de développement |
| `ROADMAP.md` | 9 phases + 6A/6B | Séquencé, critères de validation par phase |
| `CONTRIBUTING.md` | — | Licences, vision, process de contribution |
| `LICENSE` | Apache 2.0 | Officiel |
| Dev branch `claude/ifc-viewer-spatial-ygVhv` | Phase 0 livrée | TypeScript + React + web-ifc WASM |
| `docs/analyses/` | Bilan Phase 0 avec réponses dev | Convention de suivi établie |

---

## 2. Vision — Solidité du concept

### Ce qui est juste et différenciant

**Le paradigme spatial-first est fondé.** L'intuition centrale — traiter l'IFC comme une carte d'objets positionnés plutôt que comme une base de données de propriétés — est la bonne abstraction. Elle est cohérente avec ce que le format IFC permet réellement (géométrie + relations topologiques) et contourne le problème structurel des visionneuses classiques : leur dépendance à la qualité de saisie des modeleurs.

**L'approche object-first est la conséquence logique.** Une vérification qui part de l'objet physique (par sa forme, sa position, ses connexions) et non du contenant déclaré (IfcSpace, niveau) résiste aux modèles mal structurés — qui représentent la majorité des fichiers IFC du monde réel.

**Le serveur MCP est la bonne architecture.** Exposer les primitives spatiales via MCP permet à n'importe quel LLM de raisonner sur une maquette IFC sans formation BIM spécifique. C'est exactement le paradigme utilisé par les assistants IA modernes — il n'y a pas de différence entre donner `Bash` à Claude et lui donner `queryRadius`. Le viewer devient un outil universel pour les agents IA, pas seulement une interface utilisateur.

**La couche IA à trois niveaux est cohérente.**
- Reconnaissance visuelle au chargement → identifie les objets par leur forme
- Agent de vérification → interprète les intentions, utilise les outils comme instruments
- Catalogue de règles → ancre les vérifications dans les référentiels métiers

Ces trois niveaux sont complémentaires et non redondants.

### Ce qui reste à préciser

**L'extension du fichier projet.** Le placeholder `.bimview` a été rejeté depuis le début mais aucun nom n'a été retenu. C'est une décision de communication autant que technique — le nom doit évoquer l'usage (analyse spatiale BIM, pas juste une "vue"). Ce report crée une incohérence mineure dans la spec (§3 parle de `.bimview` comme "placeholder").

**La gouvernance du catalogue de règles.** La spec décrit la structure technique du catalogue mais ne dit pas : qui valide une règle avant qu'elle entre dans le catalogue commun ? Quel est le processus de contribution externe ? Comment les versions de règles sont-elles gérées quand une norme évolue ? Ce sont des questions de produit, pas de code, mais elles conditionnent la valeur à long terme du catalogue.

---

## 3. Spec — Analyse v4.3

### Forces

**Tech-agnostic rigoureuse.** Aucune bibliothèque, aucun framework nommé dans les exigences fonctionnelles. La spec décrit des comportements et des contrats — les choix d'implémentation sont laissés au développeur. C'est la bonne posture pour un document de référence à longue durée de vie.

**Progression logique des phases.** La ROADMAP séquence correctement les dépendances : l'index spatial (Phase 2) avant les primitives avancées (Phase 4), la couche delta (Phase 3) avant le moteur de règles (Phase 5), la reconnaissance visuelle (Phase 6A) avant l'agent complet (Phase 6B). Le dev ne peut pas implémenter Phase N+1 sans les fondations de Phase N.

**Le MCP est entré au bon endroit.** §17.0 comme section fondamentale avant les détails de l'agent (§17.1–17.4) est la bonne organisation — le protocole précède les usages.

**Le modèle de confiance composite est précis.** La formule `α × confiance_IFC + β × confiance_IA + γ × cohérence_spatiale` avec pondération configurable et seuils définis (0.80 / 0.60) donne au dev des critères d'implémentation clairs et à l'utilisateur une lisibilité du comportement de l'IA.

**Le Mode Ask est le bon ajout.** Les deux modes initiaux (Propose / Execute) ne couvraient pas le cas où l'intention est trop ambiguë pour générer des hypothèses pertinentes. Mode Ask comme précurseur de Propose est plus robuste et plus honnête — l'agent ne génère pas des hypothèses par défaut quand il ne sait pas.

### Faiblesses

**La structure de la règle du catalogue est sous-spécifiée.** §7 pose un JSON minimal — c'est voulu ("on améliorera plus tard") mais le dev qui implémente Phase 5 devra définir lui-même comment les règles s'exécutent, comment les overrides interagissent avec la logique spatiale, comment les résultats sont structurés. Ce manque d'interface formelle entre la règle et le moteur d'exécution est un risque d'incohérence entre le catalogue et les règles utilisateur.

**La fédération multi-modèles manque de détail sur les conflits.** §4 décrit la fédération (plusieurs IFC simultanés, disciplines) mais ne spécifie pas : que se passe-t-il quand deux modèles ont des GUIDs qui se chevauchent ? Comment les relations inter-modèles (un équipement ELEC adjacent à un mur ARC) sont-elles résolues ? Ces cas arrivent en production et méritent une spécification avant Phase 4.

**Le §5 (Moteur géométrique) ne spécifie pas les tolérances.** La ROADMAP phase 2 mentionne "Gestion des tolérances géométriques (objets à ±quelques mm)" mais §5 ne donne pas de valeurs de référence. Une tolérance implicite = comportement imprévisible sur les modèles réels.

**La gestion des erreurs côté utilisateur est absente.** Que voit l'utilisateur si un fichier IFC est malformé ? Si une requête spatiale dépasse le timeout ? Si le fournisseur IA est indisponible ? La spec décrit les flux nominaux, pas les flux d'erreur.

---

## 4. Dev Phase 0 — Analyse

_Voir [2026-04-10_phase-0_bilan.md](./2026-04-10_phase-0_bilan.md) pour le bilan complet avec réponses dev._

### Résumé

La Phase 0 est livrée avec une fondation spatiale correcte. Les choix architecturaux (TypeScript + React + Web Worker + web-ifc WASM) sont cohérents et défendables. Le découplage SceneGraph ↔ SpatialIndex ↔ Three.js est la décision la plus importante : elle garantit que le moteur spatial peut évoluer indépendamment du rendu.

### Points critiques traités dans les correctifs post-Phase 0

- Erreurs Worker silencieuses → banner UI d'erreur ajouté
- Bug bbox global dans le Worker → corrigé (réassignation vs mise à jour par composant)
- Fuite mémoire Worker → message `REMOVE` implémenté, `api.CloseModel()` appelé

### Points critiques ouverts pour Phase 1

| Point | Impact | Plan dev |
|---|---|---|
| `window.__bim_*` anti-pattern | Tests impossibles, couplage implicite | → Context API en Phase 1 |
| SpatialIndex O(n) linéaire | Plafonne à ~10k objets | → BVH (`three-mesh-bvh`) en Phase 2 |
| Pas de tests d'intégration Worker | Bugs masqués | → Mock Worker en Phase 1 |

---

## 5. Cohérence vision ↔ spec ↔ implémentation

| Principe | Dans la spec | Dans le dev Phase 0 |
|---|---|---|
| Géométrie comme vérité primaire | ✅ §5 — source de vérité explicite | ✅ bbox depuis vertices, pas attributs déclarés |
| Object-first (pas container-first) | ✅ §17.1 — décrit formellement | ✅ SceneGraph sans dépendance à IfcSpace |
| Parsing non-bloquant | ✅ §18 — exigence de performance | ✅ Web Worker + transferables |
| Fédération multi-modèles | ✅ §4 | ✅ ModelRegistry + modelId partout |
| Interface stable pour swap BVH | ✅ implicite dans §5 | ✅ SpatialIndex.query() = seul point d'entrée |
| MCP server | ✅ §17.0 — spécifié | ❌ Phase 6B — non commencé |
| Reconnaissance visuelle IA | ✅ §17.2 — spécifié | ❌ Phase 6A — non commencé |
| Couche delta | ✅ §14 | ❌ Phase 3 — non commencé |
| Moteur de règles | ✅ §7–8 | ❌ Phase 5 — non commencé |
| Catalogue de règles | ✅ §7 v4.3 | ❌ Phase 5 — non commencé |

La cohérence entre vision, spec et implémentation Phase 0 est bonne sur les fondations. Les écarts sont normaux pour une Phase 0 et correspondent exactement aux phases futures planifiées.

---

## 6. Risques

### Risque 1 — Performance à l'échelle (Critique avant Phase 2)

L'index spatial linéaire O(n) plafonne à ~10 000 objets. Un modèle IFC réel (ARC complet, Revit) contient 50 000 à 200 000 objets. Le critère de validation Phase 2 — "requête adjacente sur 100 000 objets en < 100ms" — est **inatteignable** avec l'implémentation actuelle.

**Mitigation :** BVH planifié en Phase 2. L'interface est stable, le swap est sans impact pour les couches supérieures. Mais c'est un prérequis bloquant avant Phase 4 (primitives avancées).

### Risque 2 — Qualité de la reconnaissance visuelle (Inconnu)

La reconnaissance IA par rendu 3D n'a pas été testée sur des données réelles. La qualité dépend de :
- La qualité des renders générés (éclairage, angle, résolution)
- La capacité du modèle de vision à distinguer des équipements techniques similaires en 3D
- La diversité des styles de modélisation IFC (Revit vs ArchiCAD vs autres)

La cible de 85% de reconnaissance correcte pour les `IfcBuildingElementProxy` est ambitieuse. Elle n'est validable que sur des fichiers IFC réels — ce qui ramène à la question des fichiers de test.

**Mitigation :** La validation utilisateur est le filet de sécurité. La reconnaissance IA est opt-in. La couche delta capture les corrections.

### Risque 3 — Complexité Phase 6B (MCP + Agent)

Phase 6B combine le serveur MCP, l'agent de vérification, l'intégration du catalogue et la reconnaissance visuelle de Phase 6A. C'est la phase la plus complexe du projet et celle dont les composants ont le plus de dépendances croisées.

**Mitigation :** Le découplage MCP garantit que le serveur peut être développé et testé indépendamment de l'interface utilisateur. Commencer par le serveur MCP (contrat stable) avant l'interface de chat.

### Risque 4 — Alimentation du catalogue (Long terme)

La valeur du catalogue de règles dépend de sa richesse normative. Encoder les règles NF Habitat, PMR, DTU, sécurité incendie correctement demande une expertise métier que l'équipe de développement n'a pas seule. Un catalogue pauvre ou incorrect est pire qu'un catalogue vide — il donne une fausse légitimité aux résultats.

**Mitigation :** Commencer par 5 à 10 règles de référence parfaitement documentées plutôt qu'un catalogue large approximatif. Prévoir un processus de validation externe (expert métier) avant d'intégrer une règle normative dans le catalogue commun.

### Risque 5 — Fichiers IFC de test absents

Les fichiers IFC de référence sont dans le dépôt privé `paliabra/bim-examples`, non intégré. Sans fichiers de test réels, la validation des critères de performance (100ms pour 100k objets, 85% reconnaissance) est impossible. Les tests automatisés existants utilisent des données synthétiques.

**Mitigation :** Intégrer au minimum un fichier IFC de taille réelle (50MB minimum) dans le pipeline de test avant Phase 2.

---

## 7. Recommandations

**Décisions à prendre maintenant (bloquantes pour la suite)**

1. **Nommer l'extension du fichier projet.** Arrêter de reporter. La décision impacte la communication, la documentation, et les choix d'implémentation de Phase 3.

2. **Définir les tolérances géométriques de référence** dans §5. Sans valeur explicite, chaque développeur choisira la sienne — incohérence garantie entre les primitives spatiales.

3. **Intégrer un fichier IFC réel** dans le pipeline de test. Sans données réelles, les critères de validation de Phase 2 et 6A ne peuvent pas être mesurés.

**Décisions à anticiper (Phase 2–3)**

4. **Spécifier l'interface d'exécution des règles** du catalogue avant Phase 5. La structure JSON d'une règle est posée — il manque le contrat entre la règle et le moteur d'exécution (comment une règle du catalogue appelle les primitives MCP).

5. **Clarifier la gestion des conflits de GUID en fédération.** Phase 3 introduit la couche delta et la réconciliation GUID. Phase 4 ajoute les requêtes inter-modèles. Ces deux phases ont besoin d'une réponse sur les collisions de GUID entre modèles de disciplines différentes.

**Pour le catalogue de règles**

6. **Identifier 3 experts métiers** (architecte, BET fluides, contrôleur technique) pour valider les premières règles avant de les intégrer dans le catalogue commun. La légitimité du catalogue est sa valeur.

---

## 8. Verdict global

Le projet est en bonne santé. La vision est fondée et différenciante. La spec v4.3 couvre correctement le périmètre fonctionnel avec une cohérence interne satisfaisante. La Phase 0 du dev a posé des fondations spatiales solides, avec les bons découplages pour les phases suivantes.

Les risques principaux ne sont pas techniques au sens strict — ils portent sur la qualité des données (fichiers IFC réels, catalogue de règles riche) et sur la complexité d'intégration de Phase 6B. Ces risques sont anticipables et gérables avec une bonne planification.

**La prochaine étape critique** est Phase 1 côté dev (arbre des objets, Context API, filtres de visibilité) en parallèle avec Phase 2 (BVH) dont le planning doit être arrêté rapidement — c'est le prérequis de tout ce qui suit.
