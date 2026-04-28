[![License: CC BY-SA 4.0](https://img.shields.io/badge/Specs-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)

# Spécification — Visionneuse IFC avec Analyse Spatiale

> Version 5.1 — Avril 2026  
> Statut : Référence de développement
>
> **Changelog 5.0 → 5.1** — refonte complète du sous-système vision : §9 étendue (chaîne d'extraction, moteurs orchestrés, profils canoniques, cadrage automatique, cache et auditabilité), §17.2 enrichie (séparation stricte des canaux, contrat avec le moteur de rendu), §17.5 ajoute le 6ᵉ volet « Complétude des rendus », nouvelle §22 « Palette de fallback IFC », glossaire enrichi.

---

## Table des matières

1. [Vision & Concept](#1-vision--concept)
2. [Principes d'architecture](#2-principes-darchitecture)
3. [Fichier projet encapsulé](#3-fichier-projet-encapsulé)
4. [Chargement & Fédération](#4-chargement--fédération)
5. [Moteur géométrique](#5-moteur-géométrique)
6. [Sélection libre de zone d'analyse](#6-sélection-libre-de-zone-danalyse)
7. [Moteur de règles](#7-moteur-de-règles)
8. [Éditeur de règles](#8-éditeur-de-règles)
9. [Visualisation 3D et sous-système de rendu](#9-visualisation-3d-et-sous-système-de-rendu)
    - [9.0 Vue d'ensemble](#90-vue-densemble)
    - [9.1 Visionneuse interactive](#91-visionneuse-interactive)
    - [9.2 Chaîne d'extraction géométrique](#92-chaîne-dextraction-géométrique)
    - [9.3 Moteurs de rendu — architecture trois paliers](#93-moteurs-de-rendu--architecture-trois-paliers)
    - [9.4 Profils de rendu canoniques](#94-profils-de-rendu-canoniques)
    - [9.5 Cadrage automatique](#95-cadrage-automatique)
    - [9.6 Cache, reproductibilité et auditabilité](#96-cache-reproductibilité-et-auditabilité)
    - [9.7 Contexte urbain (phase ultérieure)](#97-contexte-urbain-phase-ultérieure)
10. [Recherche & Navigation](#10-recherche--navigation)
11. [Annotations](#11-annotations)
12. [Géoréférencement & Carte](#12-géoréférencement--carte)
13. [Comparaison de versions](#13-comparaison-de-versions)
14. [Ajout & Modification de paramètres](#14-ajout--modification-de-paramètres)
15. [Résultats & Exports](#15-résultats--exports)
16. [Historique des analyses](#16-historique-des-analyses)
17. [Couche IA](#17-couche-ia)
    - [17.0 Le moteur comme environnement d'outils pour l'IA](#170-le-moteur-comme-environnement-doutils-pour-lia)
    - [17.1 Paradigme — l'IA comme expert](#171-paradigme--lia-comme-expert)
    - [17.2 Reconnaissance visuelle](#172-reconnaissance-visuelle)
    - [17.3 Agent de Vérification Intelligent](#173-agent-de-vérification-intelligent)
    - [17.4 Interface IA](#174-interface-ia)
    - [17.5 Rapport de santé du modèle](#175-rapport-de-santé-du-modèle)
18. [Contraintes de performance](#18-contraintes-de-performance)
19. [Accès & Sauvegarde](#19-accès--sauvegarde)
20. [Licences](#20-licences)
21. [Glossaire](#21-glossaire)
22. [Palette de fallback IFC (annexe normative)](#22-palette-de-fallback-ifc-annexe-normative)

---

## 1. Vision & Concept

### Principe fondamental

> Toute maquette qui entre dans cet environnement cesse d'être inerte. Sa géométrie parle.

Cet outil n'est pas une visionneuse. C'est un **environnement de compréhension** : un milieu actif dans lequel une maquette IFC est absorbée, lue et restituée comprise — sans configuration préalable, sans intervention de l'utilisateur. Dès l'entrée du fichier, la géométrie est parsée, les relations spatiales calculées, les bâtiments physiques détectés, l'état du modèle évalué, la reconnaissance visuelle lancée. Le modèle ne ressort pas tel qu'il est entré.

Un fichier IFC est un modèle spatial : chaque objet possède une **définition** (ce qu'il est) et une **position** (où il est). Ce que les outils classiques lisent comme des attributs à interroger, cet environnement le lit comme une **structure spatiale à comprendre**. La géométrie est la source de vérité — pas les étiquettes, pas les noms, pas la rigueur du modeleur.

L'environnement adopte une logique **SIG (Système d'Information Géographique)** appliquée au bâtiment : les objets sont d'abord des corps dans l'espace, leurs relations sont géométriques, et c'est depuis cette géométrie que tout le reste est déduit.

| SIG | Cet environnement |
|---|---|
| Carte géographique | Maquette IFC |
| Couches (routes, bâtiments…) | Disciplines (ARC, ELEC, STR…) |
| Objet avec coordonnées | Objet IFC avec position |
| Analyse spatiale | Vérifications sur les objets |

### Paradigme différenciateur

| Outils classiques | Cet environnement |
|---|---|
| Outil passif — le modèle reste inerte | Milieu actif — le modèle est décrypté à l'entrée |
| Interrogation par propriétés déclarées | Compréhension par géométrie et position |
| Dépend du soin du modeleur | Fonctionne même si les propriétés sont absentes |
| Requête statique sur attributs | Inférence dynamique depuis la géométrie |
| Objets analysés en isolation | Objets analysés en relation |
| L'IA recodes l'analyse à chaque session | L'environnement fournit le résultat — l'IA raisonne |

### Portée universelle

Le moteur n'est pas conçu pour des cas prédéfinis. Il est conçu pour **tout cas** exprimable à partir d'objets IFC, de leurs positions et de leurs relations spatiales. L'utilisateur formule une intention — le moteur et l'agent IA se chargent de la traduire en analyse, quels que soient les objets et les relations impliqués.

### Exemples illustratifs

Les exemples ci-dessous illustrent la logique du moteur. Ils ne définissent pas les limites du système.

- **Identifier les types de logements** en analysant la concomitance de pièces, murs, portes — sans que le logement soit explicitement déclaré dans le modèle
- **Compter les prises électriques par logement** en croisant les modèles ARC et ELEC par leurs positions spatiales, sans information ajoutée par l'utilisateur
- **Mesurer le linéaire de garde-corps** donnant sur un espace donné, même si le garde-corps est modélisé en un seul élément couvrant plusieurs niveaux
- **Calculer le ratio d'ouverture** d'une pièce en mettant en relation les surfaces de fenêtres et la surface de sol
- **Déduire la surface nette réelle** d'une pièce en soustrayant les emprises des objets encombrants sélectionnés par l'utilisateur
- **Vérifier la présence des équipements dans le cellier** en listant tous les objets contenus dans le volume du cellier, sans connaître leur type IFC à l'avance
- **Détecter les équipements mal dimensionnés** en croisant la référence fabricant dans le nom de l'objet IFC avec les fiches techniques réelles — un `IfcBuildingElementProxy` nommé "WOYA060LFCA" dont la bbox est 9× supérieure aux dimensions Daikin est automatiquement signalé, même sans classification précise
- **Vérifier la complétude réglementaire d'un local** en identifiant son type fonctionnel depuis son contenu (une toilette → WC), puis en vérifiant la présence de tous les éléments requis (porte, lave-mains) et la cohérence des locaux adjacents (WC non contigu à un espace de repas)

### Exemple détaillé — Vérification des équipements dans le cellier

Ce cas illustre le fonctionnement complet du moteur d'analyse spatiale.

**Étape 1 — Identifier le cellier**

Le moteur cherche un `IfcSpace` dont le nom correspond à "cellier".
- Si trouvé : le volume est extrait automatiquement
- Si absent ou mal nommé : l'utilisateur sélectionne l'espace manuellement dans la vue 3D (zone libre)

**Étape 2 — Primitive Containment**

```
POUR CHAQUE objet dans le modèle
  SI position(objet) EST CONTENUE DANS volume(cellier)
    → ajouter à la liste
```

Tous les objets physiquement dans ce volume sont remontés, sans distinction de type a priori.

**Étape 3 — Filtrage équipements**

| Entité IFC | Équipement correspondant |
|---|---|
| `IfcElectricAppliance` | Machine à laver, congélateur… |
| `IfcSanitaryTerminal` | Évier, chauffe-eau… |
| `IfcFlowTerminal` | Équipements fluides |
| `IfcFurnishingElement` | Mobilier technique |

**Étape 4 — Résultat**

- Liste des équipements présents dans le cellier
- Objets mis en surbrillance dans la vue 3D
- Exportable (PDF, Excel, BCF)

**La règle dans l'éditeur**

```
POUR CHAQUE IfcSpace WHERE nom = "cellier"
  LISTER tous objets CONTENUS DANS espace
  FILTRER catégorie = équipement
  AFFICHER résultat
```

> L'utilisateur n'a pas besoin de connaître les types IFC des équipements à l'avance. Le moteur trouve tout ce qui est physiquement dans l'espace. C'est la géométrie qui répond, pas les propriétés.

---

### Exemple détaillé — Accessibilité des équipements en chaufferie

**Contexte** : Local CHAUFFERIE / Production ECS collective  
**Règle normative** : Un espace libre d'au moins 0,50 m doit être disponible autour de chaque générateur  
**Vérification** : Tous les équipements nécessitant une maintenance sont-ils accessibles ?

**Primitives utilisées** : Détection par type + Mesure de distance + Intersection

**Logique fondamentale — Object-first**

L'intention réelle n'est pas "trouver les équipements dans un espace nommé chaufferie" mais **"vérifier que tout équipement nécessitant une maintenance est accessible"**. L'`IfcSpace` est une information secondaire, pas un prérequis. La vérification fonctionne même si aucun `IfcSpace` n'est défini.

**Étape 1 — Détection automatique des équipements de maintenance**

La détection combine deux sources complémentaires pour produire un **score de confiance composite** :

**Source A — Classification IFC**

Le moteur identifie automatiquement tous les objets selon leur type IFC déclaré :

| Entité IFC | Équipement | Confiance type |
|---|---|---|
| `IfcBoiler` | Chaudière, générateur | Haute |
| `IfcPump` | Pompe | Haute |
| `IfcHeatExchanger` | Échangeur thermique | Haute |
| `IfcCompressor` | Compresseur | Haute |
| `IfcUnitaryEquipment` | Équipement technique unitaire | Haute |
| `IfcFlowMovingDevice` | Équipements fluides actifs | Haute |
| `IfcBuildingElementProxy` | Objet sans classification | Faible |
| `IfcFlowSegment` | Peut être équipement ou tuyauterie | Moyenne |

**Source B — Reconnaissance visuelle IA (couche §17.2)**

La couche IA analyse la géométrie rendue en 3D exactement comme un ingénieur regarde la maquette. Elle peut identifier un équipement de maintenance par sa forme, ses dimensions, son contexte spatial et ses relations topologiques avec les objets voisins — **indépendamment de sa classification IFC**.

```
Rendu 3D de l'objet (+ voisins visibles)
        ↓
  Agent IA — vision
        ↓
"Chaudière murale, puissance estimée ~25 kW"  →  confiance: 0.93
        ↓
  Score composite = f(IFC_type, IA_vision, contexte_spatial)
```

**Confiance composite**

```
score = α × confiance_IFC + β × confiance_IA + γ × cohérence_spatiale
```

- `confiance_IFC` — qualité de la classification IFC déclarée (0 si non classifié, 1 si type précis)
- `confiance_IA` — confiance du modèle de vision sur le type fonctionnel reconnu
- `cohérence_spatiale` — accord entre le type reconnu et le contexte (ex: équipement dans une pièce technique = +)
- Seuil de validation automatique : configurable (défaut 0.80)
- En dessous du seuil : l'objet est présenté à l'utilisateur pour validation

Pour les objets sous le seuil de confiance, l'agent présente sa proposition et demande validation à l'utilisateur (voir §17.2).

**Étape 2 — Vérification du dégagement de 0,50 m**

Pour chaque équipement détecté, le moteur crée une **zone tampon de 0,50 m** et vérifie si elle est libre de tout objet solide.

```
DÉTECTER tous objets WHERE type = maintenance
POUR CHAQUE équipement détecté
  CRÉER buffer(équipement, 0.50m)
  SI intersection(buffer, autres_objets_solides) = vide
    → CONFORME
  SINON
    → NON CONFORME + identification de l'objet en conflit
```

**Étape 3 — Traitement parallèle des hypothèses**

L'agent traite simultanément tous les cas plausibles :

| Hypothèse | Traitement |
|---|---|
| Équipement détecté, dégagement suffisant | Conforme |
| Équipement détecté, dégagement insuffisant | Non-conformité |
| Équipement dans un espace inadéquat (bureau, logement…) | Alerte — emplacement suspect |
| Équipement sans `IfcSpace` associé | Vérifié quand même, signalé |
| Objet ambigu pouvant nécessiter maintenance | Demande de validation utilisateur |

**Étape 4 — Résultat**

- Équipements conformes / non conformes mis en surbrillance dans la vue 3D
- Objets en conflit identifiés
- Alertes pour équipements en emplacement suspect
- Exportable (PDF, Excel, BCF)

> Cette vérification est purement géométrique et indépendante du nommage des espaces. La norme définit une distance, la géométrie du modèle fournit les positions. L'`IfcSpace` est exploité comme information contextuelle secondaire, jamais comme condition bloquante.

### Les propriétés IFC en complément

La géométrie est la **source de vérité primaire**. Les propriétés déclarées dans le modèle IFC sont exploitées en **enrichissement secondaire**, comme dans les autres visionneuses.

### Conformité à la spec IFC

Toute décision technique est ancrée dans la terminologie et le schéma officiel IFC publié par **buildingSMART International** (ISO 16739). Aucune hypothèse ne sera faite hors spec. Les deux versions **IFC 2x3** et **IFC 4.3** sont supportées.

---

## 2. Principes d'architecture

### Déploiement

L'application peut être déployée en **web (navigateur)**, en **application desktop** ou en mode hybride. Le choix de la plateforme de déploiement est laissé à l'équipe de développement selon les contraintes de performance et d'usage.

### Traitement local

- Tout le traitement s'effectue **localement sur la machine de l'utilisateur** — aucun serveur requis pour l'analyse
- Aucune donnée du modèle IFC ne transite vers un serveur externe
- L'application doit fonctionner **sans connexion internet** une fois chargée

### Fonctionnalité connectée optionnelle — Reconnaissance visuelle IA

La **reconnaissance visuelle IA** (§17.2) constitue la seule exception au principe de traitement 100% local. Elle envoie des captures 3D anonymisées (pas le fichier IFC brut) à un fournisseur de vision IA :

- **Opt-in explicite** — la fonctionnalité est désactivée par défaut. L'utilisateur l'active délibérément et est informé de ce qui est transmis
- **Données transmises** : captures 3D rendues (images PNG des objets dans leur contexte), jamais le fichier IFC source
- **Fournisseur actuel** : API Claude Vision (Anthropic)
- **Évolution prévue** : intégration d'un modèle local (type Gemma 4 ou équivalent) lorsque les capacités des modèles embarqués le permettront — la fonctionnalité deviendra alors 100% locale
- **Sans connexion** : toutes les autres fonctions (parsing, analyse spatiale, moteur de règles, agent de vérification) restent pleinement opérationnelles hors ligne

### Versions IFC supportées

- **IFC 2x3** — version la plus répandue dans les fichiers réels
- **IFC 4.3** — version de référence actuelle buildingSMART
- La gestion des deux versions est transparente pour l'utilisateur

### Conçu pour le tool use via MCP

Le moteur géométrique expose ses primitives spatiales comme un **serveur MCP (Model Context Protocol)**. MCP est le protocole standard ouvert qui permet à un LLM de découvrir et d'appeler des outils externes de façon structurée — exactement comme Claude utilise `Bash`, `Read` ou `Grep` dans une session de code.

Tout LLM compatible MCP (Claude, et tout modèle adoptant le protocole) peut se connecter au serveur BIM et exécuter des vérifications complexes sur n'importe quelle maquette, sans entraînement BIM spécifique et sans développement d'intégration personnalisé.

Le serveur MCP est le **point de connexion universel** entre le moteur BIM et tout agent IA externe. Il évolue indépendamment de l'interface utilisateur.

### Indépendance technologique

La présente spécification décrit les **fonctionnalités et comportements attendus**. Les choix technologiques (langages, bibliothèques, moteurs de rendu, formats de stockage intermédiaires) sont laissés à l'équipe de développement. Aucune technologie spécifique n'est imposée par cette spec.

---

## 3. Fichier projet encapsulé

### Concept

L'utilisateur travaille avec un **fichier projet unique** qui contient tout le contexte de son analyse. L'extension est à définir (placeholder : `.bimview`).

### Contenu de l'archive

```
[nom-du-projet].[ext]
  ├── modele_ARC.ifc
  ├── modele_ELEC.ifc
  ├── modele_STR.ifc       ← tous les fichiers IFC du projet
  ├── delta.json            ← paramètres ajoutés / modifiés par l'utilisateur
  ├── regles.json           ← règles utilisateur sauvegardées
  ├── zones.json            ← zones libres définies par l'utilisateur
  ├── annotations.json      ← annotations sur les objets et zones
  └── historique.json       ← historique des sessions d'analyse
```

### Principe

- Le fichier IFC original n'est **jamais modifié**
- À l'ouverture, le moteur fusionne les IFC et le delta pour produire une vue enrichie
- Un seul fichier à partager — tout le contexte du projet est préservé

### Interopérabilité

Le format du fichier projet est **ouvert, documenté et non propriétaire** :
- Sa structure est publique et lisible par des outils tiers
- Aucune dépendance à un vendeur ou une technologie spécifique
- Importable et exportable par d'autres outils
- Aligné sur les standards ouverts existants (IFC, BCF) où pertinent

### Résilience des identifiants (GUID)

Les outils auteurs (Revit, ArchiCAD…) peuvent regénérer les identifiants uniques (GlobalId) des objets lors d'un ré-export. Or le delta, les annotations et l'historique s'accrochent à ces identifiants.

Le moteur implémente une **stratégie de réconciliation** : si un GUID ne correspond plus, l'objet est retrouvé par **empreinte composite** (Type IFC + Nom + Coordonnées spatiales). Cette stratégie garantit la continuité des données entre versions de modèle.

### Ouverture directe d'un IFC

Un fichier IFC peut être ouvert sans projet `.bimview` associé. L'environnement s'active immédiatement :

1. **Parsing & géométrie** — extraction des enveloppes géométriques, construction du SceneGraph
2. **Analyse spatiale automatique** — relations, composantes connexes, bâtiments physiques détectés
3. **Projet temporaire en mémoire** — aucun fichier créé sur disque
4. **Reconnaissance visuelle** — lancée en background si la fonctionnalité est activée (opt-in)
5. **Proposition de sauvegarde** — à la première modification (annotation, delta, règle), l'environnement propose de créer un fichier projet `.bimview`

Toutes les fonctions d'analyse sont disponibles dès l'ouverture directe. Seule la persistance des modifications requiert la création d'un projet.

---

## 4. Chargement & Fédération

### Modes de chargement

- **Glisser-déposer** (drag & drop) dans l'interface
- **Sélection via explorateur de fichiers**
- Ouverture d'un **fichier projet encapsulé** (section 3)

### Modèles fédérés

- Chargement **simultané de plusieurs fichiers IFC** dès la version initiale
- Chaque modèle conserve son identité (discipline : ARC, STR, ELEC, CVC, etc.)
- L'analyse spatiale peut croiser les objets **inter-modèles**
- Prérequis de fédération : même origine, même unité, même système de coordonnées de référence (SCR)
- En cas de décalage d'origine : **recalage manuel ou automatique** (voir section 12)

### Contrainte de taille

- **500 MB maximum par fichier**
- Chargement progressif : l'interface devient utilisable avant que le fichier soit entièrement chargé

### Cas du projet multi-bâtiments

Un fichier IFC peut déclarer un seul `IfcBuilding` tout en contenant plusieurs bâtiments physiquement distincts — c'est une pratique courante dans les exports de projets d'ensemble. L'environnement ne se fie pas à la déclaration IFC : il **détecte les bâtiments physiques réels** par analyse des composantes connexes (voir §5 et outil `detectBuildings`).

- Un ensemble de murs, planchers et toitures physiquement séparés constitue un bâtiment physique distinct, quelle que soit la hiérarchie `IfcSite / IfcBuilding` déclarée
- Chaque bâtiment physique détecté est indexé séparément dans le SceneGraph et peut faire l'objet d'une analyse indépendante
- Ce mécanisme s'applique dès le chargement d'un fichier seul — il ne requiert pas de fédération

---

## 5. Moteur géométrique

### Principe

Chaque objet IFC expose sa géométrie selon le schéma buildingSMART. Le moteur extrait les **enveloppes géométriques** de chaque objet (définition + coordonnées) pour réaliser les analyses spatiales.

### Les primitives spatiales fondamentales

| Primitive | Définition | Exemple d'usage |
|---|---|---|
| **Containment** | Le volume A contient l'objet B | Quelles prises sont dans ce logement ? |
| **Adjacence** | A et B partagent une face ou une frontière | Quelles fenêtres appartiennent à cet espace ? |
| **Intersection** | Les géométries de A et B se croisent | Quelle portion du garde-corps est dans cette pièce ? |
| **Mesure** | Surface, longueur, volume d'un objet ou d'un résultat | Linéaire, ratio, surface nette |
| **Composantes connexes** | Groupes d'éléments physiquement connectés (murs jointifs, planchers superposés) — indépendamment de la hiérarchie `IfcBuilding` | Combien de bâtiments physiques distincts dans ce fichier ? |

### Entités déduites

Le moteur permet de construire des **entités virtuelles** non déclarées dans le fichier IFC mais déduites de la topologie :

- **Logement** : cluster d'`IfcSpace` connectés via `IfcDoor`, délimités par une porte palière
- **Zone technique** : groupe d'objets MEP partageant un volume commun
- Toute entité définie par l'utilisateur via le moteur de règles ou la sélection libre

### Références IFC utilisées

| Entité IFC | Usage |
|---|---|
| `IfcSpace` | Volume de pièce, base de l'analyse spatiale |
| `IfcRelContainedInSpatialStructure` | Hiérarchie de containment |
| `IfcRelSpaceBoundary` | Limites entre espaces et éléments |
| `IfcRelConnects*` | Connexions physiques entre éléments |
| `IfcRelAggregates` | Décomposition d'éléments complexes |

### Gestion des tolérances géométriques

Les modèles IFC présentent des imprécisions de modélisation (joints à ±quelques mm). Le moteur intègre une **tolérance configurable** pour les calculs d'adjacence et d'intersection.

### Accélération spatiale

Pour garantir des performances en temps réel sur des modèles lourds, le moteur construit une **structure d'indexation spatiale** dès le chargement du modèle. Cette structure permet de localiser rapidement les objets dans l'espace sans tester l'intégralité du modèle à chaque requête.

### Cache des résultats spatiaux

Une fois une analyse spatiale calculée (ex : "objets contenus dans le cellier"), le résultat est **mis en cache**. Les requêtes suivantes filtrent le cache au lieu de recalculer depuis zéro. Le cache est invalidé lors de modifications du modèle ou du delta.

### Re-qualification des objets non typés

Certains objets IFC sont exportés sans type précis (équivalent d'une "boîte noire" sans catégorie). Le moteur permet leur **re-qualification sémantique via la couche delta** : l'utilisateur ou l'agent IA peut leur attribuer un type fonctionnel, ce qui permet aux règles métier de s'appliquer sur ces objets.

---

## 6. Sélection libre de zone d'analyse

### Problème couvert

Tous les regroupements pertinents ne correspondent pas à une entité IFC existante (ex : places de parking, zones de façade, tronçons de réseau). L'utilisateur peut définir **librement sa zone d'analyse**.

### Modes de sélection

| Mode | Description |
|---|---|
| **Rectangle** | Sélection rapide par boîte englobante dans la vue 3D |
| **Polygone libre** | L'utilisateur trace un contour en 3D |
| **Sélection manuelle** | L'utilisateur clique les objets qui composent la zone |

### Comportement

- La zone devient une **entité à part entière** dans le moteur d'analyse
- Elle dispose des mêmes coordonnées qu'un `IfcSpace` et peut faire l'objet des 4 primitives spatiales
- Elle est **sauvegardable** dans le fichier projet (zones.json)
- Les règles s'appliquent sur une zone libre exactement comme sur un `IfcSpace`

### Architecture

```
Source de la zone d'analyse
        ↓
IfcSpace (IFC natif)    OU    Zone libre (définie par l'utilisateur)
        ↓                              ↓
              Même moteur d'analyse
```

---

## 7. Moteur de règles

### Architecture

```
Règles prédéfinies          Règles utilisateur
      ↓                            ↓
   Catalogue                  Éditeur de règles
      ↓                            ↓
         Moteur d'exécution spatial
                  ↓
          Résultats / Rapports
```

Les deux types de règles reposent sur le **même moteur d'exécution**. Une règle prédéfinie est une règle utilisateur figée et validée.

### Règles prédéfinies

Organisées selon 3 axes de catégorisation :

**Par norme**
- Accessibilité PMR (dégagements, dimensions portes — EN 17210)
- Sécurité incendie (distances d'évacuation, compartimentage)
- Code de la construction (surfaces minimales par type de pièce)
- NF DTU (règles techniques par corps de métier)

**Par métier**
- Architecture (surfaces, ratios, typologies)
- Structure (connectivité, appuis)
- MEP — Électricité (prises, éclairage, tableaux)
- MEP — Fluides (continuité réseaux, distances)
- MEP — CVC (volumes traités, débits)

**Par usage**
- Contrôle qualité du modèle BIM (cohérence hiérarchie spatiale, objets non rattachés)
- Vérification de conformité réglementaire
- Métrés et quantitatifs
- Analyse de performance spatiale

### Règles utilisateur

- Créées via l'éditeur de règles (section 8)
- Sauvegardées dans le fichier projet et **réutilisables sur d'autres modèles**
- Partageables entre utilisateurs (export/import)
- Possibilité de contribution au catalogue commun

### Famille de règles : Connectivité géométrique (GEOMETRIC_CONNECTIVITY)

#### Principe

Les fichiers IFC n'exportent généralement pas les relations de connectivité réseau (`IfcRelConnectsPortToElement`, ports de raccordement). Le moteur ne s'y fie pas. Il vérifie la connectivité **uniquement par la géométrie** : un appareil physiquement raccordé touche ou frôle son réseau. Un écart mesurable révèle un problème de modélisation.

> **Règle fondamentale** : la géométrie est la source de vérité. Les relations IFC sont des annotations optionnelles — leur absence ne bloque pas la vérification.

#### Algorithme

```
Pour chaque équipement E de type source (ex. IfcSanitaryTerminal) :

  1. Pré-filtre spatial
     candidats ← spatialIndex.queryRadius(E.bbox.center, rayon_recherche)
     réseau    ← candidats filtrés par types cibles (ex. IfcPipeSegment)

  2. Test de présence
     si réseau est vide :
       → ERREUR : "aucun réseau d'évacuation détecté à proximité"

  3. Distance surface-à-surface
     distMin ← min( queryMeshDistance(E, r) pour r dans réseau )

  4. Décision
     si distMin > seuil :
       → ERREUR : "raccordement non effectif — écart de {distMin} mm (seuil : {seuil} mm)"
     sinon :
       → OK
```

**Pas de point de connexion prédéfini.** La distance minimale entre les deux maillages est calculée directement — elle est nulle ou quasi-nulle quand les éléments sont raccordés, mesurable quand ils ne le sont pas.

#### Illustration — WC non raccordé à l'évacuation

*Le WC est positionné au centre du local. L'évacuation est à plus d'un mètre du bas du maillage sanitaire. Distance surface-à-surface mesurée : ~1 400 mm. Seuil : 150 mm. Résultat : ERREUR.*

Ce type d'erreur est **invisible sur un plan 2D** et passe souvent inaperçu lors des contrôles visuels de la maquette. Le moteur le détecte automatiquement à l'ouverture du fichier.

#### Catalogue — règles de connectivité prédéfinies

| ID | Équipement source | Réseau cible | Seuil | Sévérité |
|---|---|---|---|---|
| `SANITARY_DRAIN_CONNECTION` | `IfcSanitaryTerminal` | `IfcPipeSegment`, `IfcPipeFitting` | 150 mm | Erreur |
| `HVAC_DUCT_CONNECTION` | `IfcAirTerminalBox`, `IfcFan` | `IfcDuctSegment`, `IfcDuctFitting` | 200 mm | Erreur |
| `HEATING_PIPE_CONNECTION` | `IfcSpaceHeater`, `IfcRadiator` | `IfcPipeSegment` | 100 mm | Erreur |
| `ELECTRICAL_PANEL_CIRCUIT` | `IfcElectricDistributionBoard` | `IfcCableSegment` | 300 mm | Avertissement |
| `PUMP_PIPE_CONNECTION` | `IfcPump`, `IfcValve` | `IfcPipeSegment` | 50 mm | Erreur |
| `LUMINAIRE_CABLE_CONNECTION` | `IfcLightFixture` | `IfcCableSegment` | 300 mm | Avertissement |

#### Implémentation technique

- **Phase 0** : approximation vertex-à-vertex, O(n×m) sur les maillages pré-filtrés par le SpatialIndex — précision suffisante, performance acceptable sur des voisinages réduits
- **Phase 2** : remplacement par `three-mesh-bvh` derrière `SpatialIndex.queryMeshDistance()` — distance exacte en O(log n), temps réel sur modèles lourds
- Le SceneGraph conserve les références de maillage en mémoire précisément pour permettre ces calculs

### Structure d'une règle du catalogue — format skill

Une règle du catalogue est un **skill LLM-exécutable** : un fichier combinant un frontmatter YAML (métadonnées stables) et un corps Markdown (instructions procédurales). L'agent IA peut lire ce fichier et l'exécuter directement en appelant les primitives MCP — sans moteur de règles intermédiaire.

```markdown
---
id: detect-dwellings
name: Détection des logements
version: 1.0
description: Identifier les logements comme clusters d'espaces connectés via une porte, délimités par une porte palière
category: { norme: "", metier: Architecture, usage: Logement }
primitives: [queryConnectedComponents, queryAdjacent, queryContained]
params:
  seuil_surface_min: { default: 9, unit: m², label: Surface plancher minimum }
triggers: [on_request]
---

## Instructions

1. Appeler `queryConnectedComponents` pour identifier les groupes d'espaces physiquement connectés
2. Pour chaque composante, utiliser `queryAdjacent` pour détecter les portes palières
   (IfcDoor adjacente à la limite du groupe + donnant sur une circulation commune)
3. Un logement = composante connexe délimitée par au moins une porte palière
4. Exclure les composantes dont la surface totale est inférieure à `seuil_surface_min`
5. Retourner la liste des logements avec leur composition (espaces, surface, étage)
```

**Pourquoi ce format** : `searchRules(intent)` retourne la règle complète — le LLM dispose immédiatement des métadonnées (primitives requises, paramètres) et des instructions pour l'exécuter. Le moteur de règles n'a pas à interpréter une logique déclarative : l'agent est le moteur d'exécution, les primitives MCP sont ses instruments.

Les paramètres (`params`) sont les **seuls éléments modifiables** lors d'un fork. Le corps procédural reste celui de la règle source.

### Fork d'une règle du catalogue

L'utilisateur peut à tout moment forker une règle du catalogue :
1. Sélectionner une règle
2. Modifier les paramètres (seuils, tolérances)
3. Sauvegarder sous un nouveau nom dans ses règles personnelles
4. La règle forkée reste liée à la règle source (traçabilité des modifications)

---

## 8. Éditeur de règles

### Philosophie

> L'utilisateur ne doit jamais se sentir bloqué. La syntaxe doit rester lisible par un non-développeur, avec une vocation à être la plus naturelle possible.

### 3 modes d'édition

**Mode Visuel** *(débutant)*
- Interface drag & drop de conditions
- Sélection des types d'objets depuis les objets présents dans le modèle ouvert
- Construction de règles par assemblage de blocs

**Mode Texte** *(intermédiaire)*
- Syntaxe inspirée du langage naturel
- Autocomplétion sur les entités IFC et les objets du modèle courant
- Exemple :
```
POUR CHAQUE logement
  COMPTER IfcElectricOutlet CONTENU DANS logement
  RÉSULTAT >= 1 PAR IfcSpace
```

**Mode IA** *(tous niveaux)*
- Saisie en langage naturel
- L'IA traduit la demande en règle structurée
- Exemple : *"Je veux compter les prises dans chaque logement"*
- L'utilisateur valide ou ajuste la règle générée avant exécution

### Navigation entre modes

L'utilisateur peut **basculer librement** entre les 3 modes. Une règle créée en mode visuel est visible en mode texte et vice versa.

---

## 9. Visualisation 3D et sous-système de rendu

### 9.0 Vue d'ensemble

Le sous-système de rendu est un composant **central** du moteur, pas une fonctionnalité secondaire de visualisation. Il sert quatre rôles distincts qui conditionnent ses exigences :

| Rôle | Destinataire | Cible de qualité |
|---|---|---|
| **Canal d'analyse autonome** | Agent IA (LLM multimodal) | Lisibilité géométrique nette, couleurs sémantiques contrastées, arêtes franches — exploitabilité par modèle de vision prime sur l'esthétique |
| **Communication avec l'humain** | MOA, AMO, élus, équipes projet | Lisibilité architecturale, propre, agréable, équivalent à une présentation d'architecte |
| **Preuve d'observation** | Tous destinataires d'un rapport d'analyse | Précision géométrique, cotation lisible, surimpressions (zones d'intérêt, anomalies signalées) |
| **Audit a posteriori** | Vérification des analyses passées | Reproductibilité absolue, versioning des paramètres, cache adressable par hash |

> **Positionnement** — Cet outil n'est **pas un moteur de rendu**. C'est un outil d'analyse qui produit les rendus dont il a besoin pour analyser et restituer. La cible esthétique du palier 3 s'apparente au style Twinmotion (PBR, ciel HDRI, ombres dures, sol matérialisé) sans en chercher la qualité matériaux artisanale, et le palier 4 (path tracing photoréaliste) reste optionnel pour les usages de communication exceptionnels.

Le sous-système se compose de cinq étages techniques, spécifiés dans les sections suivantes :

```
┌─────────────────────────────────────────────────────────┐
│ 9.2 — Extraction géométrique                            │
│       (mesh + matières + journal de complétude)         │
└──────────────┬──────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────────┐
│ 9.3 — Moteurs de rendu (3 paliers orchestrés)           │
│       Palier 1 (rapide) | Palier 2 (style) | Palier 3   │
└──────────────┬──────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────────┐
│ 9.4 — Profils canoniques                                │
│       (identification, analyse étage, focalisation)     │
└──────────────┬──────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────────┐
│ 9.5 — Cadrage automatique                               │
│       (axe d'inertie + orientation façades)             │
└──────────────┬──────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────────┐
│ 9.6 — Cache, reproductibilité, auditabilité             │
└─────────────────────────────────────────────────────────┘
```

---

### 9.1 Visionneuse interactive

La visionneuse interactive (intégrée à l'application web) est l'expression temps-réel du sous-système de rendu, distincte des rendus offscreen produits pour l'agent IA.

#### Rendu

- Visionneuse 3D temps réel (WebGL2 / WebGPU si disponible)
- Navigation standard : orbite, zoom, pan, vol libre (mode F)
- Affichage multi-modèles simultané avec gestion de la visibilité par discipline

#### Outils de navigation fondamentaux

- **Coupes planes** — sections horizontales et verticales pour voir l'intérieur du modèle
- **Arbre des objets IFC** — panneau de navigation dans la hiérarchie Site → Bâtiment → Étage → Local → Objet
- **Filtres de visibilité** — afficher/masquer par discipline, par étage, par type d'objet, par bâtiment détecté géométriquement
- **Mesures manuelles** — cotation directe dans la vue (distance, surface, angle), indépendant du moteur de règles

#### Mise en exergue des résultats

- Les objets concernés par une vérification sont **mis en surbrillance directement dans la vue 3D**
- Code couleur selon le statut : conforme / non conforme / avertissement
- Sélection d'un résultat → isolation et focus sur l'objet dans la visionneuse
- Export des objets sélectionnés ou filtrés

#### Chargement progressif

- L'interface 3D est accessible avant que le fichier soit entièrement chargé
- Niveaux de détail (LOD) adaptés selon la distance de la caméra
- Analyse en streaming : les vérifications peuvent démarrer sur les objets déjà chargés

---

### 9.2 Chaîne d'extraction géométrique

#### Principe

L'extraction des maillages depuis les entités IFC est l'étape la plus fragile du sous-système. Une extraction silencieusement défaillante (cf. cas Axtix : 37% des `IfcBuildingElementProxy` non triangulés sans aucune alerte) corrompt en cascade tous les rendus en aval, et donc toutes les analyses qui s'appuient sur le canal vision. La spec impose une discipline stricte de **journalisation par élément** et de **stratégie de repli graduée**.

#### Architecture

```
IfcElement
    ↓
[ Extraction tentative — Niveau 1 : mesh complet ]
    ↓ échec ?
[ Extraction tentative — Niveau 2 : bbox simplifiée ]
    ↓ échec ?
[ Marqueur visuel — Niveau 3 : élément signalé absent ]
    ↓
Journal d'extraction (par élément)
    ↓
Agrégation : taux de complétude par classe, par bâtiment, global
    ↓
Métadonnées du rendu + alimentation Health Report (volet 6, §17.5)
```

#### Stratégie de repli à 3 niveaux

| Niveau | Méthode | Usage de fallback |
|---|---|---|
| **L1 — Mesh complet** | Triangulation `ifcopenshell.geom.iterator` (ou équivalent natif WebAssembly) avec composition de placement absolu | Cas nominal, ~95% des éléments en moyenne sur maquettes saines |
| **L2 — Bbox simplifiée** | Si la triangulation échoue ou dépasse le timeout, l'élément est représenté par sa bounding box orientée (OBB) déduite des points cartésiens accessibles | Cas des CSG profonds, des `IfcBuildingElementProxy` à géométrie complexe non manifold, des `MappedItem` à transformations multiples |
| **L3 — Marqueur** | Si même la bbox n'est pas calculable (placement défaillant, géométrie absente), l'élément est représenté par un marqueur cubique 0.5×0.5×0.5m de couleur magenta vif (#FF00FF) à sa position déclarée, signalant visuellement l'anomalie | Cas extrêmes — typiquement <1% sur maquettes nominales, plus fréquent sur exports défaillants |

#### Contrat d'extraction

```typescript
interface ExtractionResult {
  elementId: string             // GUID IFC
  status: 'L1' | 'L2' | 'L3'    // niveau de fallback effectivement utilisé
  durationMs: number            // temps consommé
  vertexCount?: number          // si L1
  triangleCount?: number        // si L1
  failureReason?: string        // si L2 ou L3 : raison documentée
  fallbackBbox?: BoundingBox    // si L2
}

interface ExtractionJournal {
  modelId: string
  totalElements: number
  byStatus: { L1: number, L2: number, L3: number }
  byClass: Record<string, { L1: number, L2: number, L3: number }>
  byBuilding?: Record<string, { L1: number, L2: number, L3: number }>
  durationTotalMs: number
  schemaVersion: string         // version du schéma de journal
}
```

#### Seuils de complétude par profil

Chaque profil de rendu (cf. §9.4) déclare un **taux de complétude minimal L1** acceptable. En dessous, le rendu est produit mais marqué partiel et l'agent IA en est informé dans son contexte.

| Profil | Seuil L1 minimum | Comportement sous le seuil |
|---|---|---|
| Communication MOA, exports PDF | 95% | Filigrane *« RENDU PARTIEL — N% des éléments »* en bas du rendu, refus si < 80% |
| Identification du projet (Skill 1) | 90% | Avertissement dans les métadonnées, le rendu est utilisable mais l'agent doit pondérer |
| Analyse interne (Skill 2+) | 80% | Avertissement uniquement |
| Débogage / diagnostic | 0% | Aucun seuil, tous les éléments visibles avec leur niveau de fallback codé en couleur |

#### Exigences techniques

- **Timeout par élément** : 5 secondes par défaut (configurable). Au-delà, repli L2.
- **Timeout global** : 5 minutes par défaut pour une maquette de 500 Mo. Au-delà, abandon de l'extraction et rendu basé sur les éléments déjà extraits.
- **Parallélisation** : extraction par batch sur N workers (N = `navigator.hardwareConcurrency` côté web, `os.cpu_count()` côté serveur).
- **Cache d'extraction** : indexé par hash du fichier IFC + version du moteur d'extraction. Une maquette déjà extraite n'est pas re-extraite.

---

### 9.3 Moteurs de rendu — architecture trois paliers

#### Principe d'orchestration

La spec impose **trois paliers de rendu** correspondant à trois usages distincts. Aucun moteur unique ne couvre les trois — la spec retient une **architecture multi-moteur** orchestrée par une abstraction commune, exactement comme le `GeometryAIProvider` (§17.2) abstrait le fournisseur IA.

| Palier | Cible esthétique | Temps cible | Moteur de référence v1 | Usage |
|---|---|---|---|---|
| **Palier 1 — Analyse rapide** | Viewer BIM standard (équivalent xeokit, Speckle) | 1 à 3 s par vue | `three.js` headless en Web Worker (offscreen canvas) ou `pyrender`+OSMesa pour batch serveur | Canal vision agent (passes 1–3 §17.2), parcours d'inspection, `renderObjectView` à la volée, génération massive pour le harnais de tests (§22) |
| **Palier 2 — Style architectural** | Viewer BIM enrichi + lisibilité matériaux (équivalent Solibri, BIM Vision, *style* Twinmotion sans qualité matériaux artisanale) | 5 à 15 s par vue | `three.js` headless avec extensions PBR (KHR_materials_*) + ciel HDRI + shadow mapping de qualité | Fiches descriptives MOA, exports communicationnels, vue d'ensemble du Health Report, rendus du mode Describe |
| **Palier 3 — Photoréaliste** | Path tracing (équivalent Cycles, V-Ray, Corona) | 1 à 5 min par vue | `Blender --background` avec moteur Cycles ; export glTF intermédiaire | **Optionnel** — usages exceptionnels (plaquette commerciale, presse, BIMobjet manager). Toujours en file d'attente asynchrone, jamais bloquant pour une analyse |

#### Implémentation v1 et phasage

**Spec complète, implémentation phasée.** La spec couvre les trois paliers dans leur architecture, leurs contrats et leurs comportements. L'implémentation v1 du moteur livre **uniquement le palier 1**. Les paliers 2 et 3 sont implémentés selon la roadmap (à définir hors spec).

Cette discipline « spec complète, code phasé » garantit :
- Que les contrats d'API (renderProfile, ToolReturn) sont stables dès la v1, pas refaits à chaque palier ajouté
- Que le code v1 est nativement multi-moteur (l'abstraction `RenderProvider` existe dès le début)
- Que l'arrivée des paliers 2 et 3 n'oblige aucune refonte des skills ni des appelants

#### Contrat unifié — `RenderProvider`

```typescript
interface RenderProvider {
  /**
   * Identité du provider pour traçabilité dans les rendus.
   * Convention : "<famille>-<version>", ex. "threejs-headless-r158", "cycles-3.6"
   */
  readonly providerId: string
  
  /**
   * Palier auquel ce provider répond.
   */
  readonly tier: 1 | 2 | 3
  
  /**
   * Capacités du provider — utilisé par l'orchestrateur pour vérifier
   * qu'un profil de rendu est supportable.
   */
  readonly capabilities: {
    pbr: boolean                      // matériaux Physically-Based Rendering
    hdri: boolean                     // ciel HDRI
    shadowMapping: 'none' | 'simple' | 'high'
    ambientOcclusion: boolean
    rayTracing: boolean
    maxResolution: { width: number, height: number }
    transparency: boolean
  }
  
  /**
   * Rendu d'une scène configurée.
   * Le provider ne connaît pas les profils — il rend ce qu'on lui donne.
   */
  render(scene: RenderScene, options: RenderOptions): Promise<RenderResult>
}

interface RenderScene {
  meshes: ExtractedMesh[]             // résultat de §9.2
  camera: CameraSpec
  lights: LightSpec[]
  background: BackgroundSpec          // couleur unie, dégradé, HDRI
  ground?: GroundSpec                 // sol matérialisé optionnel
  annotations?: Annotation2D[]        // surimpressions 2D (cotes, légendes, flèche du nord)
}

interface RenderOptions {
  width: number
  height: number
  outputFormat: 'png' | 'jpeg' | 'webp'
  jpegQuality?: number                // 1-100 si jpeg
  antialiasing: 'off' | 'fxaa' | 'msaa-4x' | 'msaa-8x'
  seed?: number                       // pour reproductibilité (palier 3 path-traced)
}

interface RenderResult {
  imageData: Uint8Array
  durationMs: number
  providerId: string                  // copie pour traçabilité
  tierUsed: 1 | 2 | 3
  warnings: string[]
}
```

#### Orchestrateur — sélection de provider

L'orchestrateur reçoit une demande de rendu (profil + paramètres + cible de qualité) et sélectionne le provider approprié.

```typescript
interface RenderOrchestrator {
  /**
   * Rendre selon un profil canonique (§9.4).
   * L'orchestrateur compose la scène, choisit le provider selon le palier
   * exigé par le profil, applique le cadrage automatique (§9.5) si non spécifié,
   * consulte le cache (§9.6), et retourne le rendu.
   */
  renderProfile(
    profileName: string,              // ex. "iso_canonique_se", "plan_etage_R1"
    target: RenderTarget,             // modèle entier, bâtiment, zone, objet
    overrides?: Partial<ProfileParams>  // surcharges du profil
  ): Promise<ToolReturn<RenderManifest>>
  
  /**
   * Liste des providers disponibles dans cette installation.
   */
  listProviders(): RenderProvider[]
  
  /**
   * Forcer un palier (utilisé pour comparer la qualité ou pour tests).
   */
  setTierPolicy(policy: TierPolicy): void
}

type RenderTarget =
  | { kind: 'model', modelId: string }
  | { kind: 'building', buildingId: string }   // bâtiment détecté géométriquement
  | { kind: 'storey', storeyId: string }
  | { kind: 'zone', zoneId: string }            // zone libre (§6)
  | { kind: 'object', objectId: string }
  | { kind: 'objects', objectIds: string[] }
  
type TierPolicy = 'auto' | 'min' | 'tier1' | 'tier2' | 'tier3'
```

#### Outil MCP exposé à l'agent

```typescript
// — Rendu (canal vision agent) —
tool renderProfile(
  profile: string,                    // nom du profil canonique (§9.4)
  target: RenderTarget,
  overrides?: object                  // surcharges des paramètres du profil
): ToolReturn<RenderManifest>         // image + manifest complet
```

Le `RenderManifest` retourné est documenté en §9.6 (auditabilité).

---

### 9.4 Profils de rendu canoniques

#### Principe

Un profil est une **configuration nommée et versionnée** d'une scène de rendu. Il fixe : la composition (cadrage, caméra, lumières), la palette (couleurs sémantiques ou matériaux IFC), les annotations (échelle, flèche du nord, légendes), le palier de moteur exigé, le seuil de complétude requis (§9.2).

Les profils sont stockés en YAML versionnable dans le dépôt du projet. Un profil par défaut est livré pour chaque nom canonique ; l'utilisateur peut forker un profil pour ses besoins (même mécanique que les règles, §7).

#### Famille A — Profils d'identification du projet

Utilisés par le skill `project-understanding` (Skill 1).

| Profil | But | Caméra | Notes |
|---|---|---|---|
| **`plan_masse_zenithal`** | Vue strictement zénithale du projet entier dans son contexte | Orthographique, axe Z descendant | Cadrage sur enveloppe totale + 10% de marge, sol matérialisé, ombres douces, flèche du Nord au Nord vrai, échelle métrique en bas |
| **`iso_canonique_se`** | Vue isométrique sud-est calculée sur l'axe principal du projet | Perspective ~30° élévation, azimut = (axe_principal + 135°) | Cadrage automatique §9.5, sol vert simple, soleil sud-ouest 45°, ciel uniforme |
| **`iso_canonique_nw`** | Vue isométrique nord-ouest, complémentaire de la sud-est | Azimut = (axe_principal − 45°) | Mêmes paramètres que sud-est avec rotation 180° |
| **`roof_plan`** | Vue zénithale ne montrant que les éléments hauts (toitures, terrasses, équipements de toiture) | Orthographique zénithale, filtre Z ≥ Z_max(modèle) − 1.5m | Révèle les empreintes des toits indépendamment du bâti dessous, équivalent du « toits seuls » |
| **`elevation_sud`** | Élévation orthographique depuis le sud | Orthographique, direction = Nord | Cotes de niveaux annotées (RDC, R+1…), échelle métrique latérale |
| **`elevation_est`** | Élévation orthographique depuis l'est | Orthographique, direction = Ouest | Idem |
| **`elevation_nord`**, **`elevation_ouest`** | Élévations complémentaires | Selon | Produites uniquement si le bâtiment a des façades dans l'orientation correspondante |

#### Famille B — Profils analytiques par étage

Utilisés par les skills d'analyse interne (logements, équipements, circulations).

| Profil | But | Caméra | Notes |
|---|---|---|---|
| **`plan_etage_<storeyId>`** | Vue zénithale filtrée sur un étage donné | Orthographique zénithale, filtre Z ∈ [storey.elevation, storey.elevation + storey.height − 0.3m] | Mobilier et équipements optionnels (paramètre `includeFurniture`), équivalent plan d'architecte sans annotations textuelles |
| **`coupe_axe_NS`** | Coupe verticale par l'axe nord-sud principal | Orthographique, direction = Est, plan de coupe = X = X_central(projet) | Permet de lire la stratification verticale, escaliers, volumes traversants |
| **`coupe_axe_EO`** | Coupe verticale par l'axe est-ouest principal | Orthographique, direction = Sud, plan de coupe = Y = Y_central(projet) | Idem |
| **`coupe_personnalisee`** | Coupe verticale par un plan défini par 2 points | Orthographique, plan défini par paramètres | Pour analyses ad-hoc |

#### Famille C — Profils de focalisation

Utilisés pour les analyses ciblées et les preuves d'observation.

| Profil | But | Caméra | Notes |
|---|---|---|---|
| **`focus_object`** | Vue centrée sur un objet, contexte estompé | Perspective, distance/angle paramétrables | Étend `renderObjectView` (§17.2) avec gestion du contexte estompé (objets voisins en transparence 30%) |
| **`focus_zone`** | Vue centrée sur une bbox arbitraire | Perspective, distance calculée pour 60% d'occupation | Pour zones libres (§6) ou regroupement d'objets |
| **`walkthrough_space`** | Séquence d'inspection d'un espace | Voir §17.2 (déjà spécifié) | Reste inchangé — ce profil délègue à `renderSpaceWalkthrough` |
| **`facade_focus`** | Élévation focalisée d'une façade | Orthographique perpendiculaire à la façade | La façade est identifiée par PCA des normales des murs verticaux (§9.5) ou désignée explicitement |

#### Format YAML d'un profil

Chaque profil est un fichier `<profile_name>.profile.yaml` sous `renderer/profiles/` :

```yaml
---
name: iso_canonique_se
version: 1.0.0
description: |
  Vue isométrique sud-est calculée sur l'axe principal du projet.
  Cadrage automatique sur l'enveloppe totale avec 10% de marge.
  Lumière soleil sud-ouest, ciel uniforme bleu pâle.

tier: 1                                # palier minimum requis
fallback_tier: 1                       # palier acceptable si le minimum indispo
min_completeness_l1: 0.90              # seuil §9.2

camera:
  projection: perspective
  fov_deg: 33
  azimuth_deg: auto+135                # auto = axe principal projet
  elevation_deg: 30
  framing: auto                        # cadrage par §9.5
  framing_margin: 0.10                 # 10% de respiration

lights:
  - type: directional                  # soleil
    azimuth_deg: 225
    elevation_deg: 45
    intensity: 4.5
    color: [1.0, 0.96, 0.88]           # blanc chaud
  - type: directional                  # ciel
    direction: [0, 0, -1]
    intensity: 1.8
    color: [0.65, 0.75, 0.92]          # bleu froid
  - type: ambient
    intensity: 0.4

background:
  type: gradient
  top: [0.85, 0.88, 0.92]              # ciel clair
  bottom: [0.92, 0.94, 0.97]           # ciel sol

ground:
  enabled: true
  color: [0.45, 0.51, 0.41]            # vert herbe
  size_m: 250                          # carré 250×250m centré sur projet

palette: ifc_with_fallback             # cf. §22

annotations:
  north_arrow: true
  scale_bar: true
  building_labels: false               # peut être true via override
  watermark_partial: true              # filigrane si < seuil L1

resolution:
  default: { width: 1920, height: 1200 }
  thumbnail: { width: 480, height: 300 }
---
```

#### Surcharge de profil

L'agent ou l'utilisateur peut surcharger un profil sans le forker, via le paramètre `overrides` de `renderProfile` :

```typescript
renderProfile('iso_canonique_se', { kind: 'model', modelId: 'm1' }, {
  camera: { elevation_deg: 60 },       // vue plus surplombante
  resolution: { width: 3840, height: 2400 }  // 4K pour export
})
```

#### Versioning des profils

Chaque profil porte sa version semver. Une mise à jour des profils par défaut est tracée dans le changelog du dépôt. Un projet peut figer une version de profil pour garantir la stabilité des analyses sur la durée :

```yaml
# Dans le projet utilisateur
renderer:
  pinned_profiles:
    iso_canonique_se: "1.0.0"          # ne suit pas les futures mises à jour
```

---

### 9.5 Cadrage automatique

#### Principe

Un cadrage arbitraire (sud-est canonique sans tenir compte de la composition réelle du projet) produit des vues qui ratent l'axe principal et compromettent la lecture par le canal vision. Le cas Axtix l'a démontré : un projet aligné nord-ouest/sud-est présenté en ISO sud-est arbitraire devient illisible. La spec impose un **cadrage calculé par analyse géométrique** quand le profil le demande (`framing: auto`).

#### Algorithme

```
Étape 1 — Sélection des points de référence
  • Centroïdes XY des bâtiments détectés géométriquement (§5)
  • Filtre des outliers (§9.2 niveau L3 exclus du cadrage)

Étape 2 — Calcul de l'axe principal d'inertie
  • PCA 2D sur les centroïdes
  • Vecteur propre de plus grande variance = axe principal
  • Angle de cet axe par rapport au Nord = orientation_projet

Étape 3 — Vérification par les façades (raffinement)
  • Extraction des normales des murs verticaux (IfcWall.angle vs Z = 90° ± 5°)
  • PCA sur les normales projetées en XY
  • Si les deux modes principaux des normales font ~90° entre eux,
    leur orientation est l'orientation_façades
  • Si orientation_projet et orientation_façades divergent de plus de 15°,
    privilégier orientation_façades (porte mieux l'intention architecturale)

Étape 4 — Calcul de la bbox cadrée dans le repère orienté
  • Rotation des coordonnées dans le repère (axe_principal, perpendiculaire)
  • Bbox dans ce repère + marge (paramètre framing_margin)
  • Position caméra calculée pour que la bbox + marge remplisse le viewport

Étape 5 — Adaptation à l'orientation de profil
  • Profil ISO_SE → caméra à (axe + 135°, élévation, distance)
  • Profil ISO_NW → caméra à (axe − 45°, élévation, distance)
  • Profil ELEVATION_SUD → caméra perpendiculaire à façade sud (orthographique)
```

#### Contrat

```typescript
interface FramingComputation {
  /**
   * Calcule un cadrage automatique pour un target donné.
   * Retourne aussi les éléments de diagnostic (axe trouvé, méthode utilisée).
   */
  compute(
    target: RenderTarget,
    profile: RenderProfile
  ): FramingResult
}

interface FramingResult {
  cameraPose: { position: Vec3, target: Vec3, up: Vec3 }
  diagnostics: {
    method: 'pca_centroids' | 'pca_normals' | 'fallback_north'
    principalAxisAngleDeg: number     // par rapport au Nord
    confidence: number                 // 0–1, basé sur le rapport des valeurs propres PCA
    bboxRotated: BoundingBox           // bbox dans le repère orienté
  }
  warnings: string[]                   // ex. "Confiance PCA faible (0.3) — axe peut être indéterminé"
}
```

#### Cas dégradés

| Situation | Comportement |
|---|---|
| Un seul bâtiment détecté, plan compact (rapport longueur/largeur < 1.3) | PCA des normales prime ; si elle est aussi indéterminée, fallback Nord vrai |
| Aucun mur vertical exploitable (cas `IfcBuildingElementProxy` exclusivement) | Fallback Nord vrai, warning émis |
| Plusieurs bâtiments dispersés sans alignement clair (PCA confidence < 0.5) | Cadrage selon Nord vrai, warning *"Pas d'axe principal clair, cadrage sur Nord vrai"* |
| `framing: manual` dans le profil ou override | Le calcul automatique est court-circuité, paramètres caméra fournis directement |

---

### 9.6 Cache, reproductibilité et auditabilité

#### Principe

Tout rendu produit par le sous-système doit pouvoir être **rejoué à l'identique** ultérieurement, et tout rendu coûteux doit être **mis en cache**. C'est la condition pour que les analyses qui s'appuient sur le canal vision soient auditables, et pour que le système supporte les paliers 2 et 3 sans recalcul systématique.

#### Manifest de rendu

Chaque rendu produit accompagne le PNG d'un manifest YAML/JSON contenant tout ce qui est nécessaire pour le rejouer ou le vérifier :

```typescript
interface RenderManifest {
  // Identification
  renderId: string                    // UUID
  timestamp: string                   // ISO 8601
  
  // Source
  modelId: string
  ifcSourceHash: string               // SHA-256 du fichier IFC
  deltaVersion?: string               // version de la couche delta si appliquée
  
  // Profil et paramètres
  profileName: string
  profileVersion: string              // semver du profil
  effectiveParams: object             // paramètres après application des overrides
  
  // Provider et performance
  providerId: string                  // ex. "threejs-headless-r158"
  tierUsed: 1 | 2 | 3
  durationMs: number
  
  // Complétude
  extractionCompleteness: {
    overall: number                    // taux global L1 (0–1)
    byClass: Record<string, number>    // par classe IFC
    elementsRendered: number
    elementsFallbackL2: number
    elementsFallbackL3: number
  }
  
  // Cadrage (si automatique)
  framingDiagnostics?: FramingResult['diagnostics']
  
  // Avertissements
  warnings: string[]                   // ex. "Toitures rendues à 23% — fiabilité dégradée"
}
```

#### Cache adressable par hash

```
Clé de cache = hash(
  ifcSourceHash +
  deltaVersion +
  profileName + profileVersion +
  effectiveParams (sérialisé canonique) +
  providerId
)
```

Tant que tous ces éléments sont identiques, le rendu est servi depuis le cache. Une modification de la couche delta invalide les rendus qu'elle affecte (calculé via la traçabilité géométrique §14).

```typescript
interface RenderCache {
  /**
   * Lecture cache.
   * Retourne null si le rendu n'est pas en cache ou si le cache est invalidé.
   */
  get(cacheKey: string): Promise<RenderResult | null>
  
  /**
   * Écriture cache.
   * TTL configurable, par défaut illimité.
   */
  put(cacheKey: string, result: RenderResult, manifest: RenderManifest, ttlSec?: number): Promise<void>
  
  /**
   * Invalidation par modèle ou par delta.
   * Appelé automatiquement lorsque l'IFC source change ou la couche delta est modifiée.
   */
  invalidate(modelId: string, options?: { onlyDeltaAffected?: boolean }): Promise<number>
  
  /**
   * Statistiques d'utilisation pour monitoring.
   */
  stats(): CacheStats
}
```

#### Reproductibilité

Pour le palier 3 (path tracing), la reproductibilité exacte exige aussi de fixer les graines aléatoires. Le manifest enregistre `effectiveParams.seed`, et le provider est tenu de produire un résultat bit-à-bit identique pour deux exécutions avec la même graine.

#### Ressources MCP

```
resource render://manifest/{renderId}        → manifest complet d'un rendu
resource render://cache/stats                → statistiques globales du cache
resource render://profiles                   → liste des profils disponibles avec leurs versions
resource render://profile/{profileName}     → définition complète d'un profil
```

---

### 9.7 Contexte urbain (phase ultérieure)

#### Principe

Quand un projet est correctement géoréférencé (diagnostic §12 = `Formel` ou `Déductif` avec haute confiance), le sous-système peut récupérer le **contexte urbain immédiat** depuis OpenStreetMap (bâtiments voisins, voirie, parcelles cadastrales si disponibles) et l'incorporer aux rendus comme **contexte 3D simplifié** (extrusions de bâtiments, sol matérialisé route/trottoir/parc).

C'est ce qui permet de produire des rendus *« voici votre projet dans son quartier réel »*, démarcation forte vis-à-vis des viewers BIM classiques qui isolent la maquette de son contexte.

#### Statut

Cette fonctionnalité est **spécifiée dans les principes** mais **non implémentée en v1**. Elle dépend de plusieurs chantiers connexes qui doivent être stabilisés avant :

- Diagnostic de géoréférencement fiable et widely deployed (§12 — déjà spec, à valider en production)
- Chaîne d'extraction OSM → 3D simplifié (intégration `osmnx`, `blender-osm`, ou équivalent web)
- Gestion des droits d'usage des tuiles cartographiques selon fournisseur
- Cache des extractions OSM (les requêtes Overpass sont coûteuses)

#### Contrat anticipé

```typescript
interface UrbanContextProvider {
  /**
   * Récupère le contexte urbain dans un rayon donné autour d'un point géoréférencé.
   */
  fetch(
    centerLatLon: [number, number],
    radiusM: number,
    options?: {
      includeBuildings: boolean        // défaut true
      includeRoads: boolean            // défaut true
      includeWater: boolean            // défaut true
      includeVegetation: boolean       // défaut false
      simplificationLevel: 'high' | 'medium' | 'low'  // détail des extrusions
    }
  ): Promise<UrbanContextScene>
}
```

Les profils de rendu peuvent référencer `urban_context: true` dans leur YAML pour activer l'inclusion automatique. La spec garantit que ce paramètre est inerte tant que la fonctionnalité n'est pas implémentée — il sera activé sans changement de contrat ni des profils.

---

## 10. Recherche & Navigation

### Recherche par propriétés

- Recherche classique par nom, type, identifiant, valeur de propriété
- Filtrage multicritères

### Recherche par relations spatiales

- Recherche exploitant les relations entre objets, pas seulement leurs attributs
- Exemples :
  - *"Tous les IfcDoor adjacents à cet espace"*
  - *"Tous les objets contenus dans cette zone"*
  - *"Tous les IfcSpace connectés à cette pièce via une porte"*
- Les paramètres ajoutés par l'utilisateur (couche delta) sont également interrogeables

---

## 11. Annotations

- Ajout de **notes textuelles** sur des objets ou des zones directement dans la vue 3D
- Liées aux résultats de vérification ou ajoutées librement
- Sauvegardées dans le fichier projet (annotations.json)
- Exportables avec les rapports (PDF, BCF)

---

## 12. Géoréférencement & Carte

### Géoréférencement pour la fédération

- Détection automatique des décalages d'origine entre modèles fédérés
- **Recalage manuel** : l'utilisateur positionne les modèles les uns par rapport aux autres
- **Recalage automatique** : alignement sur la référence `IfcSite` / `IfcGeometricRepresentationContext`
- Tolérance de recalage configurable

### Gestion des systèmes de coordonnées (CRS)

Les maquettes IFC sont souvent mal géoréférencées ou modélisées loin de l'origine géographique réelle. L'application prévoit une interface permettant à l'utilisateur de **saisir manuellement un point de référence géographique** (latitude, longitude, rotation par rapport au Nord vrai) lorsque les métadonnées `IfcSite` sont absentes, incomplètes ou incorrectes. Ce point de référence est sauvegardé dans le fichier projet.

### Affichage sur carte

- Superposition du modèle sur une **carte géographique** (fond de plan cartographique)
- Basé sur les coordonnées géographiques définies dans `IfcSite`
- Permet la mise en contexte urbain et territorial du modèle
- Activable/désactivable par **toggle (ON/OFF)** depuis l'interface

### Toggle cartographique

| État | Comportement |
|---|---|
| **OFF** | Maquette seule sur fond neutre — vue isolée, focus sur le modèle |
| **ON** | Maquette au premier plan + données cartographiques en arrière-plan |

### Priorité de rendu — maquette toujours au premier plan

La carte pouvant contenir des données au même emplacement géographique (bâtiments voisins, végétation, voirie…), la maquette IFC est **toujours rendue en premier plan**, quelle que soit la densité des données cartographiques.

```
Couche 1 — Maquette IFC              ← premier plan (priorité absolue)
Couche 2 — Données cartographiques   ← contexte (bâtiments, routes…)
Couche 3 — Fond de carte             ← arrière-plan
```

- Les données cartographiques ne peuvent **jamais masquer** la maquette
- Transparence optionnelle des couches cartographiques pour lire le contexte sans gêner la maquette

### Diagnostic automatique de géoréférencement

À l'ouverture de chaque modèle, l'environnement évalue le niveau de fiabilité du géoréférencement et adapte son comportement en conséquence :

| Niveau | Condition | Comportement |
|---|---|---|
| **Formel** | `IfcMapConversion` + `IfcProjectedCRS` présents et cohérents | Superposition cartographique directe |
| **Déductif** | CRS inférable depuis les paramètres du fichier (ex : projection identifiable depuis les coordonnées) | Superposition avec avertissement de fiabilité |
| **Local** | Coordonnées locales sans CRS identifiable | Placement géographique manuel demandé à l'utilisateur |
| **Incohérent** | Métadonnées contradictoires ou coordonnées hors-limites géographiques | Alerte + placement manuel requis |

**Compensation par delta** : le point de référence géographique saisi manuellement est stocké dans `delta.json` et prend priorité sur les métadonnées IFC pour toutes les opérations de superposition cartographique. Le niveau de diagnostic est recalculé après toute correction.

---

## 13. Comparaison de versions

- Chargement de **deux versions du même modèle** (v1 et v2)
- Détection automatique des objets :
  - **Ajoutés** entre les deux versions
  - **Supprimés** entre les deux versions
  - **Modifiés** (géométrie ou propriétés)
- Visualisation des différences directement dans la vue 3D (code couleur)
- Comparaison des **résultats d'analyse** entre les deux versions pour suivre l'évolution de la conformité

### Réconciliation inter-versions

La comparaison s'appuie sur la **stratégie de réconciliation des identifiants** décrite en section 3. Si les GUID ont changé entre v1 et v2, le moteur retrouve les objets correspondants par empreinte composite pour assurer une comparaison fiable.

---

## 14. Ajout & Modification de paramètres

### Principe

L'utilisateur peut ajouter ou modifier des propriétés sur les objets IFC pour enrichir l'analyse. Ces modifications sont utilisées dans une **logique de lecture** — elles n'ont pas vocation à être réexportées vers les outils auteurs.

### Architecture : couche delta

```
Fichier IFC original (immuable)
        +
Couche delta — delta.json (ajouts/modifs utilisateur)
        =
Vue enrichie dans la visionneuse
```

Le fichier IFC source n'est jamais altéré.

### Fonctionnalités

- **Ajout** de paramètres manquants sur un objet (ex : type de porte palière)
- **Correction** d'une valeur erronée pour l'analyse
- **Modification en masse** : appliquer une valeur à une sélection d'objets
- Les paramètres ajoutés sont **interrogeables dans le moteur de règles** exactement comme les propriétés IFC natives
- Les paramètres ajoutés sont **interrogeables via la recherche** (section 10)

### Traçabilité géométrique des entrées delta

Chaque entrée delta produite par l'agent IA est **horodatée et liée à son origine** — la frame du parcours d'inspection ou l'appel MCP qui a justifié la correction :

```json
{
  "expressId": 1234,
  "functionalType": "chaudière",
  "source": "wt_a3f:f4",
  "timestamp": "2026-04-28T10:23:00Z",
  "geometryHash": "a3f4b2…",
  "validatedBy": "user | auto"
}
```

**Re-validation en comparaison de versions** : lors d'un chargement de version (§13), les entrées delta sont re-évaluées. Si la géométrie de l'objet cible a changé au-delà d'une tolérance configurable (détecté via `geometryHash`), l'entrée est marquée **"à re-vérifier"** — la correction reste active mais l'utilisateur est alerté que l'objet a évolué depuis la validation.

---

## 15. Résultats & Exports

### Affichage dans l'interface

- Panneau de résultats intégré à l'interface
- **Tableau de bord de synthèse** : X règles vérifiées, Y non-conformités, Z avertissements
- Résultats liés aux objets 3D (clic sur un résultat → sélection dans la vue)
- Filtrage et tri des résultats

### Formats d'export

| Format | Usage |
|---|---|
| **PDF** | Rapport de vérification imprimable |
| **Excel (.xlsx)** | Analyse quantitative, tableaux de données |
| **BCF (BIM Collaboration Format)** | Communication des problèmes vers les outils BIM authoring |

---

## 16. Historique des analyses

- Sauvegarde automatique des résultats de chaque session d'analyse dans le fichier projet
- Comparaison des résultats entre deux sessions sur le même modèle
- Suivi de l'évolution de la conformité dans le temps
- Exportable

---

## 17. Couche IA

La couche IA du moteur n'est pas un assistant conversationnel greffé sur un viewer. C'est un **agent expert** qui raisonne sur le modèle exactement comme le ferait un ingénieur ou un architecte expérimenté — il "voit" la maquette, comprend les objets par leur forme et leur contexte, et utilise les outils du moteur géométrique comme ses instruments de mesure.

---

### 17.0 Le moteur comme serveur MCP

#### Principe fondamental

Un agent IA moderne (Claude, GPT-4, Gemini…) peut raisonner, planifier et agir en appelant des outils externes via le protocole MCP. Donner à cet agent `Bash`, `Read`, `Grep` — et il devient capable de faire de l'ingénierie logicielle. Donner à ce même agent les primitives spatiales du moteur BIM via un serveur MCP — et il devient capable de vérifier n'importe quelle intention architecturale ou technique sur n'importe quelle maquette.

Il n'y a pas de différence de nature. C'est le même paradigme.

```
BIM Viewer (MCP Server local)
    expose : queryRadius, queryContained, measureClearance, renderObjectView…

Agent IA (MCP Client — Claude ou autre)
    → appelle queryRadius("chaudière_01", 0.60)     ← MCP tool call
    → appelle getObjectRelations("chaudière_01")    ← MCP tool call
    → appelle renderObjectView("chaudière_01", …)   ← MCP tool call
    → raisonne sur les résultats
    → produit : conformité, anomalies, recommandations
```

Aucun entraînement BIM spécifique n'est requis pour l'agent. Le serveur MCP fournit le contexte spatial précis ; l'agent apporte le raisonnement.

#### Architecture MCP

Le moteur expose **un serveur MCP local** (démarré avec le viewer, accessible via transport stdio ou HTTP+SSE selon le mode de déploiement). Tout client MCP peut s'y connecter et découvrir les outils disponibles via le mécanisme de découverte standard du protocole.

```
┌─────────────────────────────────────┐
│           BIM Viewer                │
│                                     │
│  ┌──────────────┐  ┌─────────────┐  │
│  │  SceneGraph  │  │  Renderer   │  │
│  │  SpatialIdx  │  │  (Three.js) │  │
│  └──────┬───────┘  └─────────────┘  │
│         │                           │
│  ┌──────▼──────────────────────┐    │
│  │       MCP Server            │    │
│  │  (primitives spatiales      │    │
│  │   exposées comme MCP tools) │    │
│  └──────────────┬──────────────┘    │
└─────────────────┼───────────────────┘
                  │ stdio / HTTP+SSE
          ┌───────▼────────┐
          │   MCP Client   │
          │ (Claude, autre │
          │  LLM MCP-compat│
          └────────────────┘
```

#### Outils MCP exposés — Contrat stable

L'ensemble des outils MCP exposés forme un **contrat fonctionnel stable**. Toute implémentation conforme est substituable — que le client soit Claude, un autre LLM MCP-compatible, ou un agent spécialisé. Le contrat est versionné indépendamment du viewer.

```typescript
// MCP Tool definitions (schéma JSON Schema sous le capot)

// — Requêtes spatiales —
tool queryRadius(objectId: string, radiusMeters: number): ToolReturn<IFCObject[]>
tool queryContained(zone: ZoneId | BoundingBox): ToolReturn<IFCObject[]>
tool queryIntersecting(objectId: string): ToolReturn<IFCObject[]>
tool queryAdjacent(objectId: string, toleranceMeters?: number): ToolReturn<IFCObject[]>
tool queryConnectedComponents(
  seed?: string,            // expressId de départ — si absent, analyse tout le modèle
  connectionTypes?: ('wall-wall' | 'floor-ceiling' | 'structural')[]
): ToolReturn<ComponentGroup[]>
tool detectBuildings(
  modelId?: string          // si absent, modèle courant
): ToolReturn<BuildingDetectionResult>  // N bâtiments physiques, bbox, objets membres, confiance

// — Mesures —
tool measureDistance(objectId1: string, objectId2: string): number   // mètres
tool measureClearance(
  objectId: string,
  direction?: 'devant' | 'derrière' | 'gauche' | 'droite' | 'haut' | 'bas'
): number                                                             // mètres
tool measureVolume(objectId: string): number                          // m³
tool measureSurface(objectId: string): number                         // m²
tool queryMeshDistance(
  objectId1: string,
  objectId2: string
): number                                                             // mm — distance surface-à-surface exacte entre maillages

// — Informations —
tool getObjectProperties(objectId: string): Properties
tool getObjectRelations(objectId: string): Relations
tool getObjectBBox(objectId: string): BoundingBox
tool getObjectAIRecognition(objectId: string): AIRecognitionResult

// — Recherche —
tool findByIFCType(ifcType: string): IFCObject[]
tool findByFunctionalType(functionalType: string): IFCObject[]
tool querySceneGraph(filter: ObjectFilter): IFCObject[]

// — Catalogue de règles métiers —
tool searchRules(intent: string): Rule[]                // recherche sémantique dans le catalogue
tool applyRule(
  ruleId: string,
  zone: ZoneId | BoundingBox,
  overrides?: Partial<RuleParams>                       // modification des seuils à la volée
): VerificationResult

// — Ressources MCP (lecture directe, sans appel de fonction) —
resource scenegraph://model/{modelId}        → état complet d'un modèle
resource scenegraph://object/{objectId}      → données complètes d'un objet
resource scenegraph://summary                → statistiques globales du projet
resource bim-rules://catalogue/{category}   → règles du catalogue par catégorie
resource bim-rules://rule/{ruleId}          → définition complète d'une règle

// — Données externes (fabricants, normes, web) —
tool searchProductSpec(
  reference: string,
  manufacturer?: string
): ProductSpec                      // dimensions réelles, poids, contraintes d'installation
tool webSearch(query: string): SearchResult[]   // recherche documentaire générale

// — Vision (opt-in, nécessite connexion — voir §2) —
tool renderSpaceWalkthrough(spaceId: string): WalkthroughSequence   // parcours d'inspection simulé (§17.2)
tool renderObjectView(
  objectId: string,
  options?: {
    distance?: 'close' | 'medium' | 'far' | number  // mètres depuis la surface — défaut 'medium'
    angle?:    'front' | 'side' | 'top' | '3/4'     // direction du regard — défaut '3/4'
    context?:  number                                // rayon des voisins visibles en mètres — défaut 3m
  }
): InspectionSequence   // l'agent dirige la caméra comme un opérateur humain
```

**Tout ce qui est vérifiable dans une maquette IFC est exprimable via ce contrat MCP.** Les primitives spatiales (§5) sont l'implémentation des outils. Les ressources MCP donnent accès en lecture directe au SceneGraph enrichi.

#### Composabilité

Le viewer et l'agent IA sont découplés par le protocole MCP. Aucune modification du viewer n'est nécessaire pour changer d'agent. Aucune modification de l'agent n'est nécessaire pour une nouvelle version du viewer, tant que le contrat MCP est respecté.

#### Convention de retour des outils MCP

Tous les outils MCP du contrat retournent un `ToolReturn<T>`. Le champ `summary` permet à l'agent de raisonner immédiatement sur le résultat en langage naturel, sans avoir à parser la structure `data` :

```typescript
interface ToolReturn<T> {
  data:     T          // résultat structuré (IFCObject[], number, BoundingBox…)
  summary:  string     // résumé en langage naturel — l'agent raisonne dessus directement
  metadata: {
    executionTimeMs: number
    modelId:         string
    objectCount?:    number
    warnings?:       string[]
  }
}
```

**Principe de conception** : chaque outil MCP répond à une **question complète** au bon niveau d'abstraction. L'agent ne doit jamais avoir à reconstituer par des appels en série ce que l'environnement peut fournir en un appel. Exposer des briques élémentaires et laisser le LLM recoder l'analyse, c'est précisément le paradigme que cet environnement remplace.

---

### 17.1 Paradigme — l'IA comme expert

**Le moteur géométrique est le jeu d'outils de l'IA, pas son gardien.**

Un ingénieur qui vérifie l'accessibilité d'un équipement ne commence pas par la classification administrative de l'objet. Il regarde l'équipement, il mesure le dégagement, il compare à la norme. Si la classification est absente, incohérente ou douteuse, il voit quand même ce que c'est. La règle administrative peut compléter — elle ne conditionne pas le jugement.

L'agent IA opère de la même façon :

| Rôle | Analogie humaine | Rôle dans le système |
|---|---|---|
| **Agent IA** | Ingénieur expert | Juge, raisonne, décide |
| **Reconnaissance visuelle** | Coup d'œil de l'expert | Identifie par la forme et le contexte |
| **Classification IFC** | Étiquette administrative | Complément, pas condition |
| **Moteur géométrique** | Instruments de mesure | Fournit les données pour le raisonnement |
| **Primitives spatiales** | Mètre, distancemètre, jauge | Distance, containment, intersection, volume |

> Les visionneuses classiques vérifient des **données**. Cet agent vérifie des **intentions**.

L'agent opère systématiquement en **logique object-first** : il part des objets physiques, identifiés par leur forme et leur type fonctionnel, et les relations spatiales sont calculées depuis leur géométrie réelle. L'`IfcSpace`, les noms de pièces, la hiérarchie Site/Bâtiment/Étage sont des informations secondaires, jamais des conditions bloquantes.

---

### 17.2 Reconnaissance visuelle

#### Problème couvert

Les fichiers IFC du monde réel contiennent massivement des objets mal classifiés, non classifiés (`IfcBuildingElementProxy`), ou classifiés avec des types trop génériques pour permettre une analyse métier fiable. Cette réalité rend les vérifications basées sur le seul type IFC peu robustes.

La reconnaissance visuelle résout ce problème : l'IA reconnaît chaque objet par sa **forme géométrique 3D rendue**, son **contexte spatial**, ses **dimensions** et ses **relations topologiques avec les objets voisins** — exactement comme un expert reconnaît un équipement en regardant la maquette.

#### Déclenchement

La reconnaissance visuelle est lancée **dès le chargement complet d'un modèle**, en tâche de fond, sans bloquer l'interface. Elle ne nécessite aucune interaction de l'utilisateur pour démarrer. Les résultats se matérialisent progressivement dans le SceneGraph au fil de l'analyse.

#### WalkthroughEngine — architecture parallèle

Le moteur de parcours est le cœur de la reconnaissance visuelle. Sa performance conditionne directement la qualité et la rapidité de l'identification. Il opère en trois étapes dont deux sont parallélisées :

```
Chargement du modèle
        ↓
┌─────────────────────────────────────────┐
│  PathPlanner — tous les espaces         │
│  en parallèle (Web Workers)             │
│  ├── Space_001 → chemin calculé         │
│  ├── Space_002 → chemin calculé         │
│  └── Space_N   → chemin calculé         │
└──────────────┬──────────────────────────┘
               ↓  tous les chemins prêts avant le premier rendu
┌──────────────────────────────────────────┐
│  FrameCapture — file de rendu            │
│  (WebGL : un contexte, file optimisée)   │
│  Priorité :                              │
│  1. Espaces avec objets non classifiés   │
│  2. Espaces techniques                   │
│  3. Reste du bâtiment                    │
└──────────────┬───────────────────────────┘
               ↓  séquences envoyées à mesure
┌──────────────────────────────────────────┐
│  File IA — traitement parallèle          │
│  ├── Space_001 → IA (batch 1)            │
│  ├── Space_003 → IA (batch 1)            │
│  └── Space_002 → IA (batch 2)            │
│  → résultats → SceneGraph (continu)      │
└──────────────────────────────────────────┘
```

| Étape | Parallélisation | Mécanisme |
|---|---|---|
| PathPlanner | ✅ Complète | Web Workers — calcul pur, sans rendu |
| FrameCapture | ⚠️ File optimisée | Un contexte WebGL — file par priorité |
| Traitement IA | ✅ Complète | Indépendant du rendu, par batch |

**Règle fondamentale :** tous les chemins sont calculés avant que le premier frame soit rendu. Le rendu alimente la file IA en continu. L'IA ne attend jamais le PathPlanner — le moteur ne crée jamais de goulot d'étranglement amont.

**Ce que ça produit :** une connaissance accumulée, pas de l'omniscience. L'IA a parcouru chaque espace séquentiellement — comme un inspecteur après une tournée complète. Les angles morts (objets partiellement cachés) sont traités par la caméra dirigée (`renderObjectView`).

#### Architecture — 3 passes de reconnaissance

La reconnaissance s'effectue en 3 passes hiérarchiques, imitant la démarche naturelle d'inspection visuelle d'un expert :

```
Passe 1 — Vue d'ensemble du modèle
        ↓
  Contexte global : discipline principale, typologies dominantes,
  zones techniques probables, organisation volumique
        ↓
Passe 2 — Par espace / zone : parcours d'inspection simulé
        ↓
  Pour chaque espace IFC ou cluster spatial :
  simulation du cheminement d'un inspecteur humain à travers l'espace
  → l'IA reçoit une séquence ordonnée de frames, pas des vues isolées
  → identification des objets par type fonctionnel dans leur contexte spatial
        ↓
Passe 3 — Par objet (ciblée, priorités)
        ↓
  Objets non classifiés, scores faibles en passe 2,
  objets demandés explicitement par l'utilisateur
  → approche simulée depuis le couloir + inspection rapprochée de l'objet
  → identification précise avec estimation de paramètres
```

**Pourquoi 3 passes ?**

Passer 200 000 objets en appels API individuels n'est ni économique ni pertinent. La passe 1 donne le contexte global (une chaufferie identifiée en passe 1 donne un prior fort aux objets contenus en passe 2). Les passes 2 et 3 sont ciblées et parallélisables.

#### Parcours d'inspection simulé

L'agent ne reçoit pas un ensemble de vues déconnectées — il reçoit une **séquence de frames ordonnées** qui simule le cheminement d'un inspecteur humain à travers l'espace. La cohérence spatiale de la séquence est ce qui permet à l'IA de comprendre le projet.

**Calcul du chemin d'inspection**

Le chemin est calculé automatiquement depuis la topologie de l'espace :

```
1. Point d'entrée     ← porte(s) de l'espace (IfcDoor adjacent)
2. Scan depuis le seuil ← vue depuis l'entrée, orientée vers l'intérieur
3. Déplacement au centre ← centroïde de l'espace à 1.70m
4. Points d'intérêt   ← objets contenus, triés par score d'intérêt
                          (non classifiés en priorité, puis par type)
5. Approche de chaque objet ← caméra qui s'avance vers l'objet
6. Inspection rapprochée ← cadrage serré, objet + voisins immédiats
7. Sortie             ← retour vers la porte de sortie
```

**Qualité du rendu**

- **Couleurs IFC préservées** — les styles de surface (`IfcStyledItem`, `IfcColourRgb`) sont rendus tels quels. Les couleurs sont de la donnée visuelle à part entière.
- **Ambient Occlusion** — donne la profondeur spatiale en complément des couleurs
- **Ombres douces** — permettent de distinguer les volumes entre eux
- **Caméra orientée dans la direction du déplacement** — chaque frame est cohérente avec la précédente

**Ce que l'IA reçoit**

```
WalkthroughSequence {
  walkthroughId: string     // identifiant unique de session — référence stable pour toute la suite
  frames: Frame[]           // séquence ordonnée
  metadata: {
    spaceId: string
    path: PathPoint[]       // positions caméra dans l'espace
    objectsEncountered: string[]  // expressIds dans l'ordre du parcours
  }
}

Frame {
  frameId: string           // identifiant unique — format : "{walkthroughId}:f{index}"
  index: number             // position dans la séquence
  type: FrameType           // 'entry' | 'overview' | 'approach' | 'inspection' | 'exit'
  image: ImageData          // rendu couleur IFC + AO + ombres
  position: [x, y, z]      // position caméra dans l'espace
  direction: [x, y, z]     // direction du regard
  visibleObjectIds: string[] // tous les expressIds visibles dans ce frame (frustum)
  focusObjectId?: string       // expressId de l'objet ciblé
  focusObjectPosition?: [x, y, z]  // centroïde de l'objet — renfort spatial si l'ID est instable
}
```

**Concordance visuel ↔ SceneGraph**

Chaque frame porte ses références. Quand l'agent identifie un objet dans une frame, il peut le relier au SceneGraph via `focusObjectId` ou `visibleObjectIds`. Toute interaction ultérieure (vérification, annotation, re-rendu) utilise ces mêmes IDs.

```
Agent reçoit frameId "wt_a3f:f4", visibleObjectIds ["1234", "1235", "890"]
Agent : "l'objet cylindrique central est une chaudière"
→ corrélation : expressId 1234 (focusObjectId du frame)
→ stockage delta : { expressId: 1234, functionalType: "chaudière", source: "wt_a3f:f4" }
→ renderObjectView("1234", { distance: 'close' }) si confirmation nécessaire
```

Cette séquence est envoyée en un seul appel à l'IA. Elle reçoit le récit visuel complet de l'espace — exactement comme un inspecteur humain le parcourrait.

#### Caméra dirigée par l'agent

Le parcours standard est un point de départ. Si l'agent a besoin de plus d'information sur un objet — parce que l'identification est ambiguë, parce qu'un détail est inaccessible depuis le chemin standard — il peut **diriger la caméra** via `renderObjectView`.

```
Parcours standard (Passe 2)
        ↓
Agent : identification incertaine sur l'objet X
        ↓
renderObjectView("X", { distance: 'close', angle: 'front' })
→ nouvelle frame : vue rapprochée de face
        ↓
Agent : toujours ambigu — veut voir le dessus
        ↓
renderObjectView("X", { distance: 'close', angle: 'top', context: 1 })
→ nouvelle frame : vue de dessus avec 1m de voisinage
        ↓
Identification résolue
```

L'agent dispose de la même liberté qu'un expert humain qui s'approche, recule, tourne autour d'un objet pour l'identifier. La caméra est son instrument de regard.

| Paramètre | Valeur | Effet |
|---|---|---|
| `distance: 'close'` | ~0.5m surface | Détails fins, matière, inscriptions |
| `distance: 'medium'` | ~1.5m surface | Vue d'ensemble de l'objet |
| `distance: 'far'` | ~3–5m surface | Objet dans son contexte spatial |
| `distance: number` | X mètres exact | Contrôle précis |
| `angle: 'front'` | Face principale | Vue de travail standard |
| `angle: 'side'` | Profil | Profondeur, raccordements latéraux |
| `angle: 'top'` | Dessus | Emprise au sol, connexions en tête |
| `angle: '3/4'` | Vue naturelle | Compréhension volumique générale |
| `context: N` | N mètres | Objets voisins visibles dans le rayon N |

#### Données transmises au modèle de vision

**Contrat avec le sous-système de rendu** — toute frame transmise à un modèle de vision est produite par les profils canoniques §9.4, via l'orchestrateur §9.3. Cela garantit que le rendu transmis au LLM est tracé (manifest §9.6), reproductible, et conforme aux seuils de complétude exigés (§9.2). Le code de la reconnaissance visuelle ne contient **aucune logique de rendu** — il appelle `renderProfile(...)` et reçoit les images. Cette séparation des responsabilités est une exigence de spec, pas une convention.

Pour chaque appel, l'agent transmet :

```
Séquence de frames du parcours d'inspection (images PNG rendues localement)
  — produites par profils §9.4 (typiquement walkthrough_space, focus_object)
  — couleurs IFC réelles (palette §22 en fallback), AO, ombres, caméra cohérente
  — manifest §9.6 disponible pour audit
  +
Contexte textuel structuré :
  - Passe précédente : discipline identifiée, type de zone
  - ifcType déclaré (si disponible) — indice parmi d'autres, pas vérité
  - Dimensions AABB : L × l × H en mètres
  - Relations topologiques : "adjacent à [mur porteur], [réseau eau chaude]"
  - Position dans le bâtiment : étage, position relative
  - Index du parcours : objets rencontrés dans l'ordre
```

Le fichier IFC source n'est **jamais transmis** — seulement des frames rendues localement et des métadonnées géométriques agrégées.

#### Indépendance stricte des canaux (mode audit)

Le score composite (cf. plus bas) suppose l'indépendance des trois canaux IFC, IA, cohérence spatiale. Quand le contexte textuel transmis à l'IA inclut l'`ifcType déclaré`, cette indépendance est imparfaite : l'IA peut être biaisée par le hint, même si elle est instruite de le traiter comme un indice non contraignant.

La spec impose donc deux modes :

| Mode | Contexte transmis à l'IA | Usage |
|---|---|---|
| **Standard** (défaut) | Tous les indices y compris `ifcType` déclaré | Optimal pour la performance et la convergence rapide. Convient à la majorité des analyses |
| **Strict** (audit) | Frames + dimensions + topologie uniquement, **sans** `ifcType` ni nom d'objet | Requis pour les analyses dont la fiabilité doit être auditable, les rapports d'écart déclaration ↔ observation, les contributions au corpus de validation |

Le mode est sélectionnable par appel via `recognizeObject(..., { mode: 'strict' })`. Le mode utilisé est consigné dans le SceneGraph enrichi pour traçabilité.

#### Traçabilité de production

Le SceneGraph enrichi conserve, pour chaque score composite, la séquence de production des trois sous-scores (ordre temporel, contexte effectivement transmis à chaque canal, manifest des rendus utilisés). Cette trace est auditable a posteriori via :

```
resource scenegraph://provenance/{objectId}
→ {
    ifc:     { score: 0.0, source: "IfcBuildingElementProxy" },
    ai:      { score: 0.87, mode: "strict", renderManifests: ["render_a3f...", "render_b21..."] },
    spatial: { score: 0.72, neighbours: [...] },
    composite: 0.76,
    weights: [0.0, 0.7, 0.3]
  }
```

#### Fournisseur IA — abstraction et évolution

```typescript
interface GeometryAIProvider {
  recognizeObject(
    renders: ImageData[],       // PNG renders (multi-angle)
    context: ObjectAIContext,   // dimensions, relations, IFC type hint
  ): Promise<AIRecognitionResult>

  recognizeSpace(
    render: ImageData,          // espace + objets contenus
    context: SpaceAIContext,
  ): Promise<SpaceRecognitionResult>

  recognizeModel(
    render: ImageData,          // vue d'ensemble
    modelInfo: ModelAIContext,
  ): Promise<ModelRecognitionResult>
}

interface AIRecognitionResult {
  functionalType:  string        // "chaudière murale", "pompe circulatrice"…
  ifcTypeProposed: string        // 'IfcBoiler', 'IfcPump'…
  confidence:      number        // 0–1
  estimatedParams: Record<string, string | number>  // "puissance: ~24kW"…
  reasoning:       string        // explication lisible par l'utilisateur
  requiresValidation: boolean    // true si confidence < seuil configuré
}
```

**Fournisseurs supportés**

| Fournisseur | Mode | Disponibilité |
|---|---|---|
| **Claude Vision (Anthropic)** | API distante, opt-in | Actuellement implémenté |
| **Modèle local embarqué** | 100% offline, sans opt-in | Prévu — dépend de la maturité des modèles multimodaux embarqués (type Gemma 4+) |

La transition API → modèle local sera transparente pour l'utilisateur et ne nécessitera aucun changement d'interface. L'abstraction `GeometryAIProvider` garantit que les deux modes sont interchangeables.

#### Score de confiance composite

Pour chaque objet, le score final combine trois sources :

```
score_composite = α × confiance_IFC + β × confiance_IA + γ × cohérence_spatiale

avec α + β + γ = 1  (pondération configurable, défaut 0.20/0.60/0.20)
```

| Composante | Signification | Valeur |
|---|---|---|
| `confiance_IFC` | Précision de la classification IFC déclarée | 0 si `Proxy`, 0.5 si type générique, 1 si type précis |
| `confiance_IA` | Confiance du modèle de vision | Score retourné par `AIRecognitionResult.confidence` |
| `cohérence_spatiale` | Accord type reconnu ↔ contexte | Chaudière dans salle technique = +0.3, dans bureau = −0.5 |

**Seuils**

| Score | Action |
|---|---|
| ≥ 0.80 | Reconnaissance automatique, validée silencieusement |
| 0.60 – 0.79 | Notification passive — l'utilisateur peut consulter et corriger |
| < 0.60 | Demande de validation active — présentée à l'utilisateur avec la proposition |

#### Provenance du score composite

Chaque score composite est accompagné de sa **décomposition par canal** — visible par l'agent et par l'utilisateur. Quand un canal est structurellement non-informatif (ex : modèle exporté entièrement en `IfcBuildingElementProxy`, canal IFC systématiquement nul), la pondération effective peut être ajustée pour ne pas pénaliser les deux autres canaux.

```
resource scenegraph://provenance/{objectId}
→ { ifc: 0.0, ai: 0.87, spatial: 0.72, composite: 0.76, weights: [0.0, 0.7, 0.3] }
```

#### Flux de validation utilisateur

Pour les objets sous le seuil de validation automatique :

```
Objet identifié avec confidence < seuil
         ↓
"L'IA propose : Chaudière murale (~24 kW) — confiance 67%
 Classification IFC déclarée : IfcBuildingElementProxy
 Raison : forme cylindrique verticale, connexions réseau eau chaude
 [Confirmer]  [Corriger]  [Ignorer]"
         ↓
Utilisateur confirme / corrige / ignore
         ↓
Résultat stocké dans la couche delta (§14)
         ↓
Disponible pour toutes les analyses suivantes
```

Les corrections de l'utilisateur enrichissent le delta du projet et prennent priorité sur la reconnaissance IA pour les analyses. Elles sont aussi exportables et partageables avec le fichier projet.

#### Cycle de vie de la reconnaissance

```
Chargement du modèle (DONE)
    ↓
Lancement automatique de la reconnaissance (background)
    ↓
Passe 1 — vue d'ensemble (1 appel IA)
    ↓
Passe 2 — par espace (N appels, parallélisés par batch)
    ↓
Passe 3 — objets ciblés (à la demande + sous-seuil passe 2)
    ↓
Résultats disponibles dans le SceneGraph
(enrichissement progressif — l'analyse peut démarrer avant que la reconnaissance soit complète)
```

---

### 17.3 Agent de Vérification Intelligent

#### Graphe d'objets enrichi

Après analyse géométrique et reconnaissance visuelle, chaque objet IFC est représenté comme un nœud enrichi dans le SceneGraph :

```json
{
  "expressId": 1234,
  "ifcType": "IfcBuildingElementProxy",
  "aiRecognition": {
    "functionalType": "chaudière murale",
    "ifcTypeProposed": "IfcBoiler",
    "confidence": 0.93,
    "validatedBy": "auto",
    "estimatedParams": { "puissance_kW": 24 }
  },
  "scoreComposite": 0.89,
  "bbox": { "min": [12.3, 0.1, 5.6], "max": [13.0, 0.8, 7.1] },
  "relations": {
    "containedIn": 890,
    "adjacentTo": [1235, 1236, 1240]
  },
  "relations_calculees": {
    "dégagement_libre": { "avant": 0.72, "gauche": 0.48, "droite": 0.51 }
  }
}
```

#### Fonctionnement de l'agent

L'agent ne traduit pas une règle littéralement. Il **interprète l'intention réelle** de l'utilisateur, consulte le catalogue de règles métiers, génère des hypothèses et les traite — pour **tout type de vérification**, quel que soit l'objet, le domaine ou la complexité.

Pour toute demande soumise, l'agent :

1. Analyse l'intention réelle derrière la formulation (langage naturel)
2. **Consulte le catalogue** (`searchRules`) — cherche des règles existantes correspondant à l'intention
3. Consulte le SceneGraph enrichi (types IFC + reconnaissance visuelle + relations calculées)
4. **Interroge les données externes si pertinent** — références fabricants dans les noms d'objets, normes techniques, fiches produits (`searchProductSpec`, `webSearch`)
5. **Évalue l'ambiguïté** : l'intention est-elle suffisamment précise pour générer des hypothèses ?
   - Si **ambiguïté critique** → pose une question ciblée (une seule) avant de continuer
   - Sinon → génère directement les hypothèses
6. Présente les hypothèses avec, le cas échéant, les règles du catalogue correspondantes
7. Sélectionne les primitives spatiales appropriées (§5) et exécute

#### Trois modes d'interaction

| Mode | Déclenchement | Comportement |
|---|---|---|
| **Ask** | Ambiguïté critique — deux interprétations radicalement différentes possibles | L'agent pose une question ciblée (une seule) pour lever l'ambiguïté avant de proposer |
| **Propose** | Intention interprétable | L'agent présente les hypothèses identifiées et les règles du catalogue associées — attend validation avant d'exécuter |
| **Execute** | Mode choisi par l'utilisateur ou intention non ambiguë | L'agent exécute directement et présente les résultats avec les hypothèses traitées |
| **Describe** | Demande de description ou de compréhension — sans vérification de conformité | L'agent produit une fiche descriptive du modèle ou d'une zone : structure, typologies, organisation spatiale |

#### Interaction avec le catalogue de règles

Quand `searchRules` retourne des résultats, l'agent les présente comme point de départ :

```
Agent : "J'ai trouvé 2 règles correspondantes dans le catalogue :
  → [NF Habitat] Ratio de circulation ≤ 18% (logements)
  → [Interne] Espaces résiduels < 3 m²
  Appliquer l'une, les deux, adapter les seuils, ou travailler autrement ?"
```

L'utilisateur peut **sélectionner** une règle telle quelle, **modifier les paramètres** à la volée (les `overrides` sont passés à `applyRule`), ou ignorer le catalogue et laisser l'agent générer ses propres hypothèses.

#### Flux complet

```
Demande utilisateur (langage naturel)
         ↓
   Interprétation de l'intention
         ↓
   searchRules(intention) ──────────────────────────────────┐
         ↓                                                   │
   Règles trouvées ?                               Règles du catalogue
   ├── Oui → les présenter comme hypothèses ←─────────────┘
   └── Non → générer les hypothèses depuis le SceneGraph
         ↓
   Ambiguïté critique ?
   ├── Oui → [Mode Ask] : 1 question ciblée → réponse → retour étape précédente
   └── Non ↓
         ↓
     Mode Propose                    Mode Execute
  Présente hypothèses                     ↓
  + règles catalogue associées    Exécution directe
  Validation user →
         ↓
     Exécution (applyRule ou primitives directes)
         ↓
  Résultats + hypothèses traitées + alertes
  Objets mis en exergue dans la vue 3D
  Objets à faible confiance signalés
```

#### Vérification dimensionnelle par référence fabricant

Quand le nom ou le tag d'un objet IFC contient une **référence fabricant identifiable**, l'agent peut interroger les spécifications techniques réelles de l'équipement et comparer avec la géométrie modélisée.

**Cas type :** un équipement modélisé en `IfcBuildingElementProxy` sans dimensions exportées (pratique courante pour les équipements MEP) dont la bbox IFC ne correspond pas aux dimensions réelles du produit.

```
Objet : WOYA060LFCA (IfcBuildingElementProxy)
    ↓
searchProductSpec("WOYA060LFCA")
→ Daikin VRV outdoor 6HP : L 930mm × H 1345mm × P 320mm
    ↓
getObjectBBox("WOYA060LFCA")
→ Bbox IFC : L 3100mm × H 2800mm × P 3100mm
    ↓
Écart détecté : facteur ×3 à ×9 selon l'axe
    ↓
queryContained(local_bbox, objectId) → false
→ L'objet déborde du local et intersecte la structure

Résultat :
① Dimensions non conformes — objet modélisé hors gabarit fabricant (×3 à ×9)
② Position incorrecte — conséquence probable de l'anomalie ①
→ Cause probable : objet modélisé sans import des dimensions réelles du fabricant
```

Cette vérification s'applique à **tout équipement dont la référence est identifiable** — équipements CVC, électriques, sanitaires, équipements de levage, etc. Elle ne nécessite aucune configuration préalable : l'agent reconnaît le pattern de référence fabricant dans le nom de l'objet.

Quand `searchProductSpec` ne retourne pas de résultat structuré, l'agent replie sur `webSearch` pour chercher la fiche technique.

#### Vérification de complétude d'un local

L'agent peut vérifier qu'un local contient tous les éléments requis par la réglementation ou les bonnes pratiques, **sans que le local soit explicitement étiqueté dans le modèle**.

Le local est identifié par son contenu (object-first) : une toilette dans un volume = WC, un lit dans un volume = chambre. Une fois le type fonctionnel établi, l'agent consulte le catalogue pour les exigences associées et vérifie leur présence.

```
Flux : vérification de complétude d'un WC

queryContained(local_bbox)
→ IfcSanitaryTerminal (toilette) reconnu par l'IA
→ Type fonctionnel : "WC / cabinet d'aisances"
    ↓
searchRules("WC complétude réglementaire")
→ Règles trouvées : porte requise, lave-mains requis (DTU / CCH)
    ↓
queryAdjacent(local_id, { ifcType: "IfcDoor" }) → aucune porte
queryContained + queryAdjacent pour lave-mains          → aucun
    ↓
Flags :
① Porte manquante — ouverture dans le mur sans IfcDoor associé
② Lave-mains absent — exigence DTU non satisfaite
```

#### Vérification d'adjacence sémantique

Au-delà de "X est-il dans Y", l'agent évalue si le **voisinage fonctionnel d'un local est cohérent**. Il identifie le type fonctionnel des locaux adjacents et vérifie leur compatibilité avec les exigences réglementaires ou les règles du catalogue.

```
Flux : vérification de l'environnement d'un WC

queryAdjacent(wc_id)
→ local_adjacent : contient chaises, table
→ Type fonctionnel reconnu : "salle à manger / espace de repas"
    ↓
searchRules("WC adjacence espace alimentaire")
→ Règle trouvée : séparation sanitaire requise,
  pas de communication directe entre WC et espace de repas
    ↓
Vérification : y a-t-il une porte entre les deux locaux ? → non
Flag : "WC en contact direct avec espace de repas — vérifier cloisonnement"
```

Ce pattern s'applique à tout cas où la compatibilité fonctionnelle entre locaux voisins est une exigence : chambre non communicante avec cuisine, local technique non adjacent à une salle de réunion, cage d'escalier non ouverte sur un local à risque incendie.

#### Traitement des objets ambigus dans les vérifications

L'agent traite explicitement les cas d'incertitude :

| Cas | Traitement |
|---|---|
| Objet reconnu avec confiance ≥ 0.80 | Traité directement dans l'analyse |
| Objet reconnu avec confiance 0.60–0.79 | Traité, résultat signalé "confiance partielle" |
| Objet reconnu avec confiance < 0.60 | Présenté à l'utilisateur avant l'analyse |
| Objet sans reconnaissance IA et sans type IFC précis | Signalé "objet non qualifié" — vérification partielle |
| Objet dont la validation utilisateur contredit l'IA | La correction utilisateur a priorité absolue |
| Référence fabricant dans le nom → dims IFC incohérentes | Flag "dimensions non conformes" — double vérification position |

---

### 17.4 Interface IA

- L'utilisateur pose des questions en **langage naturel**
- L'IA dispose du SceneGraph enrichi (géométrie + reconnaissance visuelle + relations calculées) et du catalogue de règles métiers pour raisonner
- Six usages :
  1. **Création de règles** (section 8 — Mode IA)
  2. **Interrogation directe** : *"Le garde-corps de la chambre 201 respecte-t-il la norme PMR ?"*
  3. **Vérification intelligente** : interprétation, consultation catalogue, hypothèses, exécution
  4. **Validation de la reconnaissance** : consulter, confirmer ou corriger les identifications visuelles
  5. **Navigation dans le catalogue** : parcourir, sélectionner, forker et appliquer des règles existantes
  6. **Description** : *"Décris-moi la structure de ce projet"* — fiche narrative sans analyse de conformité

#### Fiche descriptive du modèle (Mode Describe)

L'agent produit une description narrative et structurée du modèle ou d'une zone — utile pour documenter, préparer un audit, ou comprendre un projet inconnu.

```typescript
tool describeModel(
  scope?: ZoneId | 'full',          // zone ciblée ou modèle complet
  detail?: 'summary' | 'detailed'   // niveau de détail — défaut 'summary'
): ToolReturn<ModelDescription>     // description narrative + statistiques structurées
```

Le mode Describe n'exécute aucune règle de conformité. Il synthétise ce que l'environnement a compris : discipline, typologies dominantes, organisation spatiale, bâtiments physiques détectés, état du géoréférencement.

**Panneau de reconnaissance**

Un panneau dédié affiche l'état de la reconnaissance visuelle :
- Progression de la reconnaissance (passeN/N, objets traités/total)
- Objets en attente de validation (classés par priorité d'analyse)
- Historique des validations de la session
- Statistiques : % classifiés, % reconnus par IA, % validés manuellement

---

### 17.5 Rapport de santé du modèle

À l'ouverture de tout modèle, l'environnement produit automatiquement un **rapport de santé** — un diagnostic de l'état du fichier IFC selon six volets. Ce rapport est disponible immédiatement, avant toute analyse métier.

| Volet | Ce qui est évalué |
|---|---|
| **Placement** | Objets dont la position géométrique réelle est incohérente avec leur niveau déclaré (au-delà d'une tolérance configurable) |
| **Géoréférencement** | Niveau de fiabilité du géoréférencement selon le diagnostic §12 (Formel / Déductif / Local / Incohérent) |
| **Population attributaire** | Taux d'objets avec un `IfcType` précis, un nom non vide, un niveau renseigné |
| **Fermeture géométrique** | Espaces non fermés, murs non jointifs, trous dans planchers — incohérences topologiques |
| **Cohérence schéma** | Adéquation entre la déclaration IFC (hiérarchie Site/Bâtiment/Étage) et la structure physique réelle détectée |
| **Complétude des rendus** | Taux global d'extraction L1 (cf. §9.2) ; détail par classe IFC ; identification des classes pour lesquelles le canal vision est dégradé. Sur Axtix, ce volet aurait remonté immédiatement « toitures extraites à 23% — fiabilité dégradée des analyses visuelles » |

**Score de santé global** : moyenne pondérée des six volets, configurable (0–100). Affiché dans un panneau dédié à l'ouverture.

```
resource scenegraph://healthreport/{modelId}
→ rapport complet JSON avec score global, détail par volet, liste des objets signalés
```

```typescript
// Aussi accessible comme outil MCP pour l'agent
tool getModelHealthReport(modelId?: string): ToolReturn<HealthReport>
```

Le rapport de santé ne bloque aucune analyse — il informe. L'environnement traite le modèle tel qu'il est. Le rapport permet à l'utilisateur et à l'agent de calibrer leur confiance dans les résultats.

---

## 18. Contraintes de performance

| Contrainte | Valeur cible |
|---|---|
| Taille max par fichier | 500 MB |
| Premiers objets affichés | < 5 secondes après chargement |
| Traitement | 100% local, sans serveur *(exception : reconnaissance visuelle IA, opt-in — voir §2)* |
| Analyse démarrée avant fin de chargement | Oui (streaming) |
| Niveaux de détail (LOD) | Oui, adaptés à la distance caméra |

### Exigences de performance

- **Chargement progressif** — les objets s'affichent au fur et à mesure du parsing, l'interface n'est jamais bloquée
- **Traitement en arrière-plan** — le parsing et les calculs spatiaux s'effectuent sans bloquer l'interface
- **Niveaux de détail** — le rendu adapte la précision géométrique selon la distance de la caméra
- **Analyse incrémentale** — les règles s'exécutent au fur et à mesure du chargement
- **Gestion mémoire** — seuls les objets visibles ou en cours d'analyse sont chargés en mémoire active ; la géométrie parsée est stockée localement pour éviter les rechargements

---

## 19. Accès & Sauvegarde

- Application en **accès libre** — aucun compte requis
- Fonctionne localement, sans connexion internet requise pour l'ensemble des fonctionnalités de base
- Règles sauvegardées dans le fichier projet, **réutilisables sur n'importe quel autre modèle**
- Le fichier IFC source n'est **jamais transmis** vers un serveur externe

**Exception — Reconnaissance visuelle IA (opt-in)** : lorsque cette fonctionnalité est activée par l'utilisateur, des captures 3D rendues localement (images PNG des objets dans leur contexte) sont transmises au fournisseur IA configuré. Aucune donnée brute du modèle IFC n'est incluse dans ces transmissions. L'utilisateur est informé explicitement avant activation et peut désactiver à tout moment.

---

## 20. Licences

| Composant | Licence |
|---|---|
| **Spécifications** (ce document) | CC-BY-SA 4.0 — Attribution, Partage dans les mêmes conditions |
| **Code source** | Apache 2.0 |

### CC-BY-SA 4.0 pour les spécifications

Toute personne peut utiliser, modifier et redistribuer ces spécifications à condition de **citer l'auteur** et de publier les dérivés sous la **même licence**. Cela garantit que la méthode d'analyse spatiale reste ouverte et qu'aucun acteur ne peut s'en approprier la propriété intellectuelle.

### Apache 2.0 pour le code

Licence permissive incluant une **clause de protection sur les brevets**. Tout contributeur apportant du code garantit implicitement qu'aucune poursuite pour brevet ne sera engagée contre les utilisateurs du moteur.

---

## 21. Glossaire

| Terme | Définition |
|---|---|
| **IFC** | Industry Foundation Classes — standard ISO 16739 (buildingSMART) pour l'échange de données BIM |
| **Entité IFC** | Classe définie dans le schéma IFC (ex: `IfcSpace`, `IfcWall`, `IfcDoor`) |
| **Modèle fédéré** | Ensemble de plusieurs fichiers IFC (disciplines) chargés simultanément et analysés ensemble |
| **Inférence spatiale** | Déduction d'informations sémantiques (ex: "ce groupe de pièces forme un logement") à partir de la géométrie uniquement |
| **Primitives spatiales** | Opérations géométriques de base : containment, adjacence, intersection, mesure |
| **Zone libre** | Zone d'analyse définie librement par l'utilisateur dans la vue 3D, traitée comme une entité IFC |
| **Couche delta** | Fichier JSON contenant les ajouts et modifications de paramètres de l'utilisateur, superposé au fichier IFC original |
| **BCF** | BIM Collaboration Format — format standard pour la communication de problèmes entre outils BIM |
| **LOD** | Level of Detail — niveau de détail géométrique adapté à la distance de la caméra |
| **SIG** | Système d'Information Géographique — paradigme d'analyse spatiale par objets et positions |
| **GUID** | Global Unique Identifier — identifiant unique attribué à chaque objet IFC |
| **CRS** | Coordinate Reference System — système de coordonnées géographiques |
| **Empreinte composite** | Combinaison Type IFC + Nom + Coordonnées spatiales utilisée pour retrouver un objet dont le GUID a changé |
| **Cache spatial** | Résultats d'analyses spatiales mémorisés pour éviter les recalculs |
| **Agent IA** | Module qui raisonne sur le SceneGraph enrichi pour interpréter des intentions et exécuter des vérifications complexes |
| **Reconnaissance visuelle** | Couche IA qui identifie les objets IFC par leur apparence 3D rendue, indépendamment de leur classification IFC déclarée |
| **Confiance composite** | Score combinant la qualité de la classification IFC, la confiance de la reconnaissance visuelle IA, et la cohérence spatiale (α × IFC + β × IA + γ × contexte) |
| **Passe de reconnaissance** | Unité de traitement de la reconnaissance visuelle (passe 1 = vue d'ensemble, passe 2 = par espace, passe 3 = par objet ciblé) |
| **Fournisseur IA** | Implémentation concrète du moteur de vision (API Claude Vision actuellement, modèle local embarqué en perspective) |
| **Type fonctionnel** | Type d'un objet tel que reconnu par l'IA depuis sa géométrie ("chaudière murale"), indépendant du type IFC déclaré ("IfcBuildingElementProxy") |
| **Object-first** | Paradigme d'analyse qui part des objets physiques (géométrie, reconnaissance) plutôt que des contenants hiérarchiques (IfcSpace, niveaux) |
| **Validation utilisateur** | Action de l'utilisateur qui confirme, corrige ou ignore une proposition de l'IA pour un objet sous le seuil de confiance automatique |
| **SceneGraph enrichi** | SceneGraph contenant, en plus des données géométriques et IFC, les résultats de reconnaissance visuelle et les relations calculées par les primitives spatiales |
| **MCP** | Model Context Protocol — protocole standard ouvert (Anthropic) permettant à un LLM de découvrir et d'appeler des outils externes de façon structurée. Le moteur BIM expose ses primitives via un serveur MCP. |
| **Serveur MCP** | Composant du moteur BIM qui expose les primitives spatiales comme outils MCP appelables par tout LLM compatible. Tourne localement avec le viewer (transport stdio ou HTTP+SSE). |
| **Ressource MCP** | Données lisibles directement par l'agent via le protocole MCP sans appel de fonction — état du SceneGraph, données d'un objet, statistiques du projet. |
| **Tool use** | Paradigme d'interaction où un LLM appelle des outils externes pour obtenir des données ou déclencher des actions, et raisonne sur les résultats. MCP est le protocole qui standardise ce mécanisme. |
| **Function calling** | Mécanisme par lequel un LLM déclare vouloir appeler une fonction, reçoit le résultat, et continue son raisonnement. Implémentation sous-jacente de MCP tool calls. |
| **Composabilité** | Propriété du moteur garantie par le protocole MCP : tout LLM compatible peut être branché sans modifier le viewer, et toute mise à jour du viewer est transparente pour l'agent tant que le contrat MCP est respecté. |
| **Catalogue de règles** | Base de règles métiers fournies et maintenues par l'équipe, organisées par norme / métier / usage. Chaque règle est sélectionnable, forkable et modifiable par l'utilisateur. Interrogeable par l'agent via `searchRules`. |
| **Fork de règle** | Copie d'une règle du catalogue dans les règles personnelles de l'utilisateur, avec modification des paramètres. La règle forkée reste traçable vers sa règle source. |
| **Mode Ask** | Mode d'interaction de l'agent où une ambiguïté critique est détectée — l'agent pose une question ciblée (une seule) avant de générer les hypothèses. Précurseur du mode Propose. |
| **searchRules** | Outil MCP qui recherche dans le catalogue les règles correspondant sémantiquement à une intention exprimée en langage naturel. |
| **applyRule** | Outil MCP qui exécute une règle du catalogue sur une zone donnée, avec possibilité de surcharger les paramètres à la volée (overrides). |
| **searchProductSpec** | Outil MCP qui interroge les bases de données fabricants pour obtenir les spécifications techniques réelles d'un équipement à partir de sa référence (dimensions, poids, contraintes d'installation). |
| **Vérification dimensionnelle** | Comparaison entre la bbox IFC d'un objet et ses dimensions réelles issues des spécifications fabricant. Détecte les équipements modélisés à la mauvaise échelle, cas fréquent pour les `IfcBuildingElementProxy` sans dimensions exportées. |
| **Référence fabricant** | Identifiant produit présent dans le nom ou le tag d'un objet IFC (ex : "WOYA060LFCA"), utilisé par l'agent pour interroger les spécifications techniques réelles et détecter les anomalies de modélisation. |
| **Vérification de complétude** | Contrôle que tous les éléments requis par la réglementation ou les règles du catalogue sont présents dans un local, à partir de son type fonctionnel identifié depuis son contenu (object-first). |
| **Adjacence sémantique** | Vérification de la compatibilité fonctionnelle entre locaux voisins (ex : WC non contigu à un espace de repas) — va au-delà de la proximité géométrique pour évaluer la cohérence réglementaire du voisinage. |
| **GEOMETRIC_CONNECTIVITY** | Famille de règles vérifiant la connectivité des équipements à leurs réseaux (plomberie, CVC, électrique) par distance surface-à-surface entre maillages — sans dépendre des relations IFC déclarées. |
| **queryMeshDistance** | Outil MCP calculant la distance minimale surface-à-surface entre les maillages géométriques de deux objets (en mm). Fondement de la vérification GEOMETRIC_CONNECTIVITY. Phase 0 : approximation vertex, Phase 2 : BVH exact. |
| **Distance surface-à-surface** | Distance minimale entre les surfaces géométriques réelles de deux objets, distincte de la distance entre leurs centres ou leurs bbox. Nulle quand deux éléments se touchent, mesurable quand ils sont déconnectés. |
| **RenderProvider** | Implémentation concrète d'un moteur de rendu (three.js headless, Cycles…). Expose un contrat unifié `render(scene, options)` indépendant du moteur. La spec en distingue trois paliers (§9.3). |
| **Palier de rendu** | Niveau de qualité/performance d'un moteur de rendu : palier 1 (rapide, ~1-3s, viewer BIM), palier 2 (style architectural, ~5-15s), palier 3 (photoréaliste, ~1-5min, optionnel). |
| **Profil de rendu** | Configuration nommée et versionnée d'une scène (cadrage, caméra, lumières, palette, annotations) qui répond à une question précise (§9.4). Stocké en YAML, forkable comme une règle. |
| **Cadrage automatique** | Calcul de la position caméra à partir de l'axe principal d'inertie du projet (PCA centroïdes) raffiné par l'orientation des façades (PCA normales murs verticaux). §9.5. |
| **Manifest de rendu** | Métadonnées attachées à chaque rendu produit : profil utilisé, version moteur, paramètres effectifs, complétude d'extraction, hash IFC source. Fondement de l'auditabilité (§9.6). |
| **Extraction L1/L2/L3** | Stratégie de fallback à 3 niveaux pour la triangulation des éléments IFC : L1 = mesh complet, L2 = bbox simplifiée, L3 = marqueur magenta. §9.2. |
| **Complétude d'extraction** | Pourcentage d'éléments correctement triangulés en L1 sur le total tenté. Constitue le 6ᵉ volet du Health Report (§17.5). |
| **Mode strict (vision)** | Mode d'appel au modèle de vision où le contexte transmis exclut `ifcType` et nom d'objet, garantissant l'indépendance du canal IA des canaux IFC et attributaire. Requis pour les analyses auditables. §17.2. |
| **Palette de fallback IFC** | Bibliothèque versionnée de couleurs et matériaux par défaut appliqués aux objets IFC sans `IfcStyledItem` ni `IfcMaterial` exploitable. §22. |

---

## 22. Palette de fallback IFC (annexe normative)

### Principe

Quand un objet IFC ne porte pas de matériau ou de style exploitable (`IfcStyledItem`, `IfcSurfaceStyle`, `IfcMaterial` absents ou réduits à des valeurs invalides), le sous-système de rendu (§9) applique une **palette de fallback par défaut**. Cette palette est versionnée et publiée comme annexe normative pour garantir :

- La **cohérence visuelle** entre rendus successifs du même modèle
- La **comparabilité** entre rendus de modèles différents
- La **lisibilité sémantique** par le canal vision agent (les classes IFC sont visuellement distinctes)
- La **stabilité dans le temps** (un rendu produit aujourd'hui aura les mêmes couleurs de fallback dans cinq ans, sauf changement de version palette explicite)

### Palette par défaut — version 1.0.0

Couleurs au format hexadécimal RGB. Les matériaux PBR (palier 2+) ajoutent rugosité (R), métallicité (M), réflexion (Refl).

| Classe IFC | Couleur RGB | R | M | Refl | Notes |
|---|---|---|---|---|---|
| `IfcWall`, `IfcWallStandardCase` | `#D9D4C8` | 0.8 | 0.0 | 0.05 | Béton/enduit clair, mat |
| `IfcSlab` (sol) | `#A89F8E` | 0.7 | 0.0 | 0.10 | Béton brut, légèrement réfléchissant |
| `IfcSlab` (toiture-terrasse) | `#5A5650` | 0.9 | 0.0 | 0.02 | Étanchéité bitumineuse |
| `IfcRoof` | `#A05D3F` | 0.85 | 0.0 | 0.05 | Tuile cuite |
| `IfcColumn`, `IfcBeam` | `#9E9587` | 0.75 | 0.0 | 0.05 | Béton ou bois — défaut neutre |
| `IfcDoor` | `#8B6F47` | 0.6 | 0.0 | 0.15 | Bois moyen |
| `IfcWindow` (cadre) | `#3A3A3A` | 0.4 | 0.5 | 0.30 | Aluminium ou PVC sombre |
| `IfcWindow` (vitrage) | `#A8C5DD` (alpha 0.35) | 0.05 | 0.0 | 0.85 | Verre, transparent |
| `IfcStair`, `IfcStairFlight` | `#7A7167` | 0.7 | 0.0 | 0.10 | Béton |
| `IfcRailing` | `#5A5A5A` | 0.4 | 0.6 | 0.40 | Acier ou aluminium brossé |
| `IfcCovering` (plafond) | `#F2EFE8` | 0.85 | 0.0 | 0.05 | Plâtre peint blanc |
| `IfcCovering` (sol) | `#8B7C5F` | 0.65 | 0.0 | 0.15 | Bois ou stratifié moyen |
| `IfcFurnishingElement` | `#A88E6E` | 0.7 | 0.0 | 0.10 | Bois ameublement |
| `IfcSanitaryTerminal` | `#FAFAFA` | 0.3 | 0.0 | 0.40 | Céramique blanche |
| `IfcFlowTerminal` | `#7A7A7A` | 0.4 | 0.6 | 0.30 | Métal — diffuseur, bouche, terminal |
| `IfcSpace` | `#FFE89A` (alpha 0.20) | — | — | — | Volume éclairé jaune transparent (uniquement en mode debug ou profil analytique) |
| `IfcBuildingElementProxy` | `#C49E80` | 0.7 | 0.0 | 0.05 | Beige neutre — signe la non-classification, sera relayé par couleur sémantique si reconnu IA |
| `IfcBuildingElementPart` | `#B8A088` | 0.7 | 0.0 | 0.05 | Variante plus claire pour distinguer sous-composants |
| `IfcOpeningElement` | non rendu | — | — | — | Réservation, jamais rendue |
| `IfcAnnotation` | non rendu par défaut | — | — | — | Profil debug uniquement |
| **Élément en fallback L2** | `#FFB347` | 0.9 | 0.0 | 0.0 | Orange visible — bbox simplifiée signalée |
| **Élément en fallback L3** | `#FF00FF` | 0.5 | 0.0 | 0.0 | Magenta vif — anomalie explicite (§9.2) |

### Mode "couleurs sémantiques par classe" (override)

Pour le canal vision agent (palier 1, profils d'identification), la spec recommande optionnellement un mode où **chaque classe IFC majeure prend une couleur fortement distincte** indépendamment de tout matériau IFC. Cela améliore la lisibilité par le LLM multimodal.

```yaml
# Override applicable à un profil §9.4
palette: semantic_classes_v1
```

| Classe | Couleur sémantique |
|---|---|
| `IfcWall` | `#E0CDA8` (sable) |
| `IfcSlab` | `#9CA0A8` (gris bleuté) |
| `IfcRoof` | `#C44E2A` (terre cuite vif) |
| `IfcColumn`, `IfcBeam` | `#5C4A3A` (brun foncé) |
| `IfcDoor` | `#8B4513` (marron franc) |
| `IfcWindow` | `#4A90D9` (bleu vif) |
| `IfcStair` | `#9B59B6` (violet) |
| `IfcSpace` | `#F1C40F` (jaune vif) |
| `IfcBuildingElementProxy` | `#EC7063` (rouge corail — signal de non-classification) |

Le mode sémantique n'est **jamais** utilisé pour la communication MOA — il est explicitement réservé au canal agent et au mode debug.

### Versioning de la palette

La palette est versionnée en semver. Toute modification fait l'objet d'un changelog dans le dépôt. Un projet peut figer une version :

```yaml
# Dans le projet utilisateur
renderer:
  palette_version: "1.0.0"
```

### Évolution

Les futures versions de la palette pourront enrichir :
- Variations contextuelles (matériau différent selon position : `IfcWall` extérieur vs intérieur)
- Inférence de matériau par mots-clés du `Name` (ex. `mur_brique` → texture brique)
- Support de `IfcMaterialLayerSet` pour les murs multicouches

Ces enrichissements sont **opt-in** et marqués comme tels dans les manifests de rendu pour ne pas être confondus avec une lecture fidèle des matériaux IFC source.
