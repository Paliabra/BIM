# Spécification — Visionneuse IFC avec Analyse Spatiale

> Version 1.1 — Mars 2026  
> Statut : Référence de développement

---

## Table des matières

1. [Vision & Concept](#1-vision--concept)
2. [Stack technique](#2-stack-technique)
3. [Chargement & Fédération](#3-chargement--fédération)
4. [Moteur géométrique](#4-moteur-géométrique)
5. [Zones d'analyse](#5-zones-danalyse)
6. [Moteur de règles](#6-moteur-de-règles)
7. [Éditeur de règles](#7-éditeur-de-règles)
8. [Visualisation 3D](#8-visualisation-3d)
9. [Résultats & Exports](#9-résultats--exports)
10. [Couche IA](#10-couche-ia)
11. [Contraintes de performance](#11-contraintes-de-performance)
12. [Accès & Sauvegarde](#12-accès--sauvegarde)

---

## 1. Vision & Concept

### Principe fondamental

> Un fichier IFC est une carte. Chaque objet possède une **définition** (ce qu'il est) et une **position** (où il est). L'analyse consiste à comparer, regrouper et mesurer ces objets selon leurs positions et leurs relations spatiales.

La visionneuse adopte une **logique SIG (Système d'Information Géographique)** appliquée au bâtiment. Comme dans un SIG, les objets sont analysés par leurs positions et leurs relations dans l'espace — indépendamment de la hiérarchie déclarée dans le fichier.

### Paradigme SIG appliqué au BIM

| SIG | Cette visionneuse |
|---|---|
| Carte géographique | Maquette IFC |
| Couches (routes, bâtiments...) | Disciplines (ARC, STR, ELEC, CVC...) |
| Objet avec coordonnées | Objet IFC avec position |
| Zone dessinée par l'utilisateur | Zone d'analyse libre |
| Analyse spatiale | Vérifications par primitives géométriques |
| Couches dérivées | Entités déduites (logement, groupe, zone) |

### Ce que la visionneuse permet

Exemples représentatifs (non exhaustifs) :

- **Identifier les types de logements** en analysant la concomitance de pièces, murs, portes — sans que le logement soit explicitement déclaré dans le modèle
- **Compter les prises électriques par logement** en croisant les modèles ARC et ELEC par leurs positions spatiales, sans information ajoutée par l'utilisateur
- **Mesurer le linéaire de garde-corps** donnant sur un espace donné, même si le garde-corps est modélisé en un seul élément couvrant plusieurs niveaux
- **Calculer le ratio d'ouverture** d'une pièce en mettant en relation les surfaces de fenêtres et la surface de sol
- **Déduire la surface nette réelle** d'une pièce en soustrayant les emprises des objets encombrants sélectionnés par l'utilisateur
- **Analyser des places de parking par groupe** en définissant librement les zones d'analyse dans la visionneuse, sans dépendre de la hiérarchie IFC

### Ce qui distingue cette visionneuse

| Visionneuses classiques | Cette visionneuse |
|---|---|
| Interrogation par propriétés déclarées | Analyse par géométrie et position |
| Dépend du soin du modeleur | Fonctionne même si les propriétés sont absentes |
| Requête statique sur attributs | Inférence dynamique depuis la géométrie |
| Objets analysés en isolation | Objets analysés en relation |
| Zones imposées par la hiérarchie IFC | Zones librement définies par l'utilisateur |

### Les propriétés IFC en complément

La géométrie est la **source de vérité primaire**. Les propriétés déclarées dans le modèle IFC sont exploitées en **enrichissement secondaire**, comme dans les autres visionneuses.

### Conformité à la spec IFC

Toute décision technique est ancrée dans la terminologie et le schéma officiel IFC publié par **buildingSMART International** (ISO 16739). Aucune hypothèse ne sera faite hors spec.

---

## 2. Stack technique

### Technologies principales

| Rôle | Technologie |
|---|---|
| Langage | TypeScript |
| Rendu 3D | Three.js |
| Parsing IFC | web-ifc (C++ compilé en WebAssembly) |
| Framework BIM | @thatopen/components |
| Build | Vite |

### Versions IFC supportées

- **IFC 2x3** — version la plus répandue dans les fichiers réels
- **IFC 4.3** — version de référence actuelle buildingSMART

Le moteur doit gérer les deux versions de manière transparente pour l'utilisateur.

### Traitement

- **100% client-side** — aucun serveur requis pour l'analyse
- Aucune donnée du modèle ne transite vers un serveur externe
- Le traitement s'effectue dans le navigateur via WebAssembly

---

## 3. Chargement & Fédération

### Modes de chargement

- **Glisser-déposer** (drag & drop) dans l'interface
- **Sélection via explorateur de fichiers**

### Modèles fédérés

- Chargement **simultané de plusieurs fichiers IFC** dès la version initiale
- Chaque modèle conserve son identité (discipline : ARC, STR, ELEC, CVC, etc.)
- L'analyse spatiale peut croiser les objets **inter-modèles**
- Prérequis de fédération : même origine, même unité, même système de coordonnées de référence (SCR)

### Contrainte de taille

- **500 MB maximum par fichier**
- Chargement progressif : l'interface devient utilisable avant que le fichier soit entièrement chargé

---

## 4. Moteur géométrique

### Principe

Chaque objet IFC expose sa géométrie selon le schéma buildingSMART. Le moteur extrait les **enveloppes géométriques** de chaque objet pour réaliser les analyses spatiales.

Un objet = sa définition de type IFC + ses coordonnées dans l'espace.

### Les 4 primitives spatiales fondamentales

Tous les cas d'analyse se ramènent à ces 4 opérations :

| Primitive | Définition | Exemple d'usage |
|---|---|---|
| **Containment** | Le volume A contient l'objet B | Quelles prises sont dans ce logement ? |
| **Adjacence** | A et B partagent une face ou une frontière | Quelles fenêtres appartiennent à cet espace ? |
| **Intersection** | Les géométries de A et B se croisent | Quelle portion du garde-corps est dans cette pièce ? |
| **Mesure** | Surface, longueur, volume d'un objet ou d'un résultat | Linéaire, ratio, surface nette |

### Entités déduites

Le moteur permet de construire des **entités virtuelles** non déclarées dans le fichier IFC mais déduites de la topologie :

- **Logement** : cluster d'`IfcSpace` connectés via `IfcDoor`, délimités par une porte palière
- **Zone technique** : groupe d'objets MEP partageant un volume commun
- **Zone libre** : entité définie par l'utilisateur directement dans la visionneuse (voir section 5)
- Toute entité définie par l'utilisateur via le moteur de règles

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

---

## 5. Zones d'analyse

### Principe

La zone d'analyse est le **périmètre spatial sur lequel une règle s'applique**. Elle peut provenir de la hiérarchie IFC native ou être librement définie par l'utilisateur.

Cette approche découple l'analyse de la structure du fichier IFC : même si un regroupement n'est pas modélisé (places de parking, façade, tronçon de réseau), l'utilisateur peut définir sa propre zone et obtenir les mêmes capacités d'analyse.

### Sources de zones d'analyse

**Source 1 — Hiérarchie IFC native**
- `IfcSite`, `IfcBuilding`, `IfcBuildingStorey`, `IfcSpace`
- Utilisée automatiquement quand la hiérarchie est présente et pertinente

**Source 2 — Entités déduites**
- Logements, zones techniques, clusters calculés par le moteur géométrique
- Construites automatiquement ou via une règle utilisateur

**Source 3 — Zones libres définies par l'utilisateur**
- Dessinées directement dans la visionneuse 3D
- Indépendantes de la hiérarchie IFC
- Sauvegardables et réutilisables

### Modes de sélection de zone libre

| Mode | Description | Usage typique |
|---|---|---|
| **Rectangle** | Boîte englobante dessinée en 2D/3D | Sélection rapide |
| **Polygone libre** | Contour tracé point par point dans la vue | Zones irrégulières |
| **Sélection manuelle** | Clic sur les objets qui composent la zone | Groupes non contigus |
| **Buffer** | Zone étendue autour d'un objet (distance X) | Dégagements, proximité |

### Traitement uniforme

Quelle que soit sa source, une zone d'analyse est traitée identiquement par le moteur :

```
Zone IFC native     Entité déduite     Zone libre utilisateur
       ↓                  ↓                     ↓
            Enveloppe géométrique (coordonnées)
                          ↓
               Moteur d'analyse (4 primitives)
                          ↓
                       Résultats
```

### Sauvegarde des zones

- Les zones libres peuvent être **nommées et sauvegardées**
- Réutilisables sur le même modèle ou sur un modèle mis à jour
- Exportables pour partage

---

## 6. Moteur de règles

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
- Accessibilité PMR (dégagements, dimensions portes — EN 17210, réglementation nationale)
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

- Créées via l'éditeur de règles (voir section 7)
- Sauvegardées localement et **réutilisables sur d'autres modèles**
- Partageables entre utilisateurs (export/import de règles)
- Possibilité de contribution au catalogue commun

---

## 7. Éditeur de règles

### Philosophie

> L'utilisateur ne doit jamais se sentir bloqué. La syntaxe doit rester lisible par un non-développeur.

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

## 8. Visualisation 3D

### Rendu

- Visionneuse 3D WebGL via Three.js
- Navigation standard : orbite, zoom, pan
- Affichage multi-modèles simultané avec gestion de la visibilité par discipline

### Mise en exergue des résultats

- Les objets concernés par une vérification sont **mis en surbrillance directement dans la vue 3D**
- Code couleur selon le statut : conforme / non conforme / avertissement
- Sélection d'un résultat → isolation et focus sur l'objet dans la visionneuse

### Dessin des zones libres

- Outils de dessin intégrés à la visionneuse (rectangle, polygone, buffer)
- Les zones dessinées sont affichées comme des calques transparents colorés
- Distinction visuelle claire entre zones IFC natives et zones utilisateur

### Chargement progressif

- L'interface 3D est accessible avant que le fichier soit entièrement chargé
- Niveaux de détail (LOD) adaptés selon la distance de la caméra
- Analyse en streaming : les vérifications peuvent démarrer sur les objets déjà chargés

---

## 9. Résultats & Exports

### Affichage dans l'interface

- Panneau de résultats intégré à l'interface
- Résultats liés aux objets 3D (clic sur un résultat → sélection dans la vue)
- Filtrage et tri des résultats

### Formats d'export

| Format | Usage |
|---|---|
| **PDF** | Rapport de vérification imprimable |
| **Excel (.xlsx)** | Analyse quantitative, tableaux de données |
| **BCF (BIM Collaboration Format)** | Communication des problèmes vers les outils BIM authoring |

### Export des objets

- Les objets sélectionnés ou filtrés peuvent être exportés avec leurs données associées

---

## 10. Couche IA

### Graphe d'objets enrichi

Après analyse géométrique, chaque objet IFC est représenté comme un nœud enrichi :

```json
{
  "id": "Garde-corps_N2_A",
  "type": "IfcRailing",
  "proprietes": { "..." },
  "geometrie": { "..." },
  "relations_calculees": {
    "intersecte": ["Chambre_201", "Chambre_202"],
    "mesures": {
      "Chambre_201": { "lineaire": 3.2 },
      "Chambre_202": { "lineaire": 1.8 }
    }
  }
}
```

### Interface IA

- L'utilisateur pose des questions en **langage naturel**
- L'IA dispose du graphe enrichi pour raisonner sur le modèle
- Deux usages :
  1. **Création de règles** (voir section 7 — Mode IA)
  2. **Interrogation directe** du modèle : *"Le garde-corps de la chambre 201 respecte-t-il la norme PMR ?"*

### Principe de fonctionnement

```
Question utilisateur (langage naturel)
           ↓
        Modèle IA
           ↓
  Graphe d'objets enrichi
           ↓
    Réponse structurée + objets mis en exergue
```

---

## 11. Contraintes de performance

| Contrainte | Valeur cible |
|---|---|
| Taille max par fichier | 500 MB |
| Premiers objets affichés | < 5 secondes après chargement |
| Traitement | 100% client-side (WebAssembly) |
| Analyse démarrée avant fin de chargement | Oui (streaming) |
| Niveaux de détail (LOD) | Oui, adaptés à la distance caméra |

### Stratégies techniques

- **Parsing en streaming** via web-ifc — pas de chargement intégral en mémoire
- **Web Workers** pour le parsing en arrière-plan sans bloquer l'interface
- **LOD géométrique** pour le rendu 3D selon la distance caméra
- **Analyse incrémentale** — les règles s'exécutent au fur et à mesure du chargement

---

## 12. Accès & Sauvegarde

### Accès

- Application **en accès libre** — aucun compte requis
- Fonctionne entièrement dans le navigateur

### Sauvegarde des règles utilisateur

- Règles sauvegardées **localement** (localStorage ou fichier exportable)
- **Réutilisables sur n'importe quel autre modèle IFC**
- Export/import de règles pour partage entre utilisateurs

### Sauvegarde des zones libres

- Zones sauvegardées localement et nommées
- Réutilisables sur un modèle mis à jour
- Exportables avec les règles associées

### Données

- Aucune donnée du modèle IFC n'est envoyée vers un serveur
- Les règles, zones et résultats restent sur le poste de l'utilisateur

---

## Annexe — Glossaire

| Terme | Définition |
|---|---|
| **IFC** | Industry Foundation Classes — standard ISO 16739 (buildingSMART) pour l'échange de données BIM |
| **Entité IFC** | Classe définie dans le schéma IFC (ex: `IfcSpace`, `IfcWall`, `IfcDoor`) |
| **Modèle fédéré** | Ensemble de plusieurs fichiers IFC (disciplines) chargés simultanément et analysés ensemble |
| **Inférence spatiale** | Déduction d'informations sémantiques (ex: "ce groupe de pièces forme un logement") à partir de la géométrie uniquement |
| **Primitives spatiales** | Opérations géométriques de base : containment, adjacence, intersection, mesure |
| **Zone d'analyse** | Périmètre spatial sur lequel une règle s'applique — peut être IFC natif, déduit, ou libre |
| **Zone libre** | Zone dessinée directement par l'utilisateur dans la visionneuse, indépendante de la hiérarchie IFC |
| **SIG** | Système d'Information Géographique — paradigme d'analyse spatiale par objets géolocalisés |
| **BCF** | BIM Collaboration Format — format standard pour la communication de problèmes entre outils BIM |
| **LOD** | Level of Detail — niveau de détail géométrique adapté à la distance de la caméra |
| **web-ifc** | Bibliothèque open source parsant les fichiers IFC via un moteur C++ compilé en WebAssembly |
