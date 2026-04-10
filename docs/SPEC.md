[![License: CC BY-SA 4.0](https://img.shields.io/badge/Specs-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)

# Spécification — Visionneuse IFC avec Analyse Spatiale

> Version 3.0 — Avril 2026  
> Statut : Référence de développement

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
9. [Visualisation 3D](#9-visualisation-3d)
10. [Recherche & Navigation](#10-recherche--navigation)
11. [Annotations](#11-annotations)
12. [Géoréférencement & Carte](#12-géoréférencement--carte)
13. [Comparaison de versions](#13-comparaison-de-versions)
14. [Ajout & Modification de paramètres](#14-ajout--modification-de-paramètres)
15. [Résultats & Exports](#15-résultats--exports)
16. [Historique des analyses](#16-historique-des-analyses)
17. [Couche IA](#17-couche-ia)
18. [Contraintes de performance](#18-contraintes-de-performance)
19. [Accès & Sauvegarde](#19-accès--sauvegarde)
20. [Licences](#20-licences)
21. [Glossaire](#21-glossaire)

---

## 1. Vision & Concept

### Principe fondamental

> Un fichier IFC est une carte. Chaque objet possède une **définition** (ce qu'il est) et une **position** (où il est). L'analyse consiste à comparer, regrouper et mesurer ces objets selon leurs positions et leurs relations spatiales.

La visionneuse adopte une logique **SIG (Système d'Information Géographique)** appliquée au bâtiment.

| SIG | Cette visionneuse |
|---|---|
| Carte géographique | Maquette IFC |
| Couches (routes, bâtiments…) | Disciplines (ARC, ELEC, STR…) |
| Objet avec coordonnées | Objet IFC avec position |
| Analyse spatiale | Vérifications sur les objets |

### Paradigme différenciateur

| Visionneuses classiques | Cette visionneuse |
|---|---|
| Interrogation par propriétés déclarées | Analyse par géométrie et position |
| Dépend du soin du modeleur | Fonctionne même si les propriétés sont absentes |
| Requête statique sur attributs | Inférence dynamique depuis la géométrie |
| Objets analysés en isolation | Objets analysés en relation |

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

Le moteur identifie automatiquement tous les objets nécessitant une maintenance selon leur type IFC, indépendamment de leur localisation dans le modèle :

| Entité IFC | Équipement |
|---|---|
| `IfcBoiler` | Chaudière, générateur |
| `IfcPump` | Pompe |
| `IfcHeatExchanger` | Échangeur thermique |
| `IfcCompressor` | Compresseur |
| `IfcUnitaryEquipment` | Équipement technique unitaire |
| `IfcFlowMovingDevice` | Équipements fluides actifs |

Pour les objets de type ambigu, l'agent demande validation à l'utilisateur.

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

### Versions IFC supportées

- **IFC 2x3** — version la plus répandue dans les fichiers réels
- **IFC 4.3** — version de référence actuelle buildingSMART
- La gestion des deux versions est transparente pour l'utilisateur

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

---

## 5. Moteur géométrique

### Principe

Chaque objet IFC expose sa géométrie selon le schéma buildingSMART. Le moteur extrait les **enveloppes géométriques** de chaque objet (définition + coordonnées) pour réaliser les analyses spatiales.

### Les 4 primitives spatiales fondamentales

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

## 9. Visualisation 3D

### Rendu

- Visionneuse 3D temps réel
- Navigation standard : orbite, zoom, pan
- Affichage multi-modèles simultané avec gestion de la visibilité par discipline

### Outils de navigation fondamentaux

- **Coupes planes** — sections horizontales et verticales pour voir l'intérieur du modèle
- **Arbre des objets IFC** — panneau de navigation dans la hiérarchie Site → Bâtiment → Étage → Local → Objet
- **Filtres de visibilité** — afficher/masquer par discipline, par étage, par type d'objet
- **Mesures manuelles** — cotation directe dans la vue (distance, surface, angle), indépendant du moteur de règles

### Mise en exergue des résultats

- Les objets concernés par une vérification sont **mis en surbrillance directement dans la vue 3D**
- Code couleur selon le statut : conforme / non conforme / avertissement
- Sélection d'un résultat → isolation et focus sur l'objet dans la visionneuse
- Export des objets sélectionnés ou filtrés

### Chargement progressif

- L'interface 3D est accessible avant que le fichier soit entièrement chargé
- Niveaux de détail (LOD) adaptés selon la distance de la caméra
- Analyse en streaming : les vérifications peuvent démarrer sur les objets déjà chargés

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

### Agent de Vérification Intelligent

L'IA ne se contente pas de traduire une règle littéralement. Elle **interprète l'intention réelle** de l'utilisateur, génère toutes les hypothèses plausibles et les traite simultanément — pour **tout type de vérification**, quel que soit l'objet, le domaine ou la complexité de la règle.

**Principe fondamental**

> Les visionneuses classiques vérifient des **données**. Cet agent vérifie des **intentions**.

Exemple : l'utilisateur écrit *"vérifier l'accessibilité des équipements de la chaufferie"*. L'agent comprend que l'intention est la maintenance des équipements techniques — il opère automatiquement la transformation vers une logique object-first, indépendante du nommage des espaces.

**Génération des hypothèses**

Pour toute règle soumise, l'agent :
1. Analyse l'intention réelle derrière la formulation
2. Identifie tous les cas plausibles dans le modèle
3. Traite chaque hypothèse avec la primitive spatiale appropriée
4. Présente un résultat complet couvrant tous les scénarios

**Deux modes d'exécution**

| Mode | Comportement |
|---|---|
| **Propose** | L'agent présente toutes les hypothèses identifiées et attend validation avant d'exécuter — l'utilisateur contrôle chaque décision |
| **Execute** | L'agent exécute directement et présente les résultats avec les hypothèses traitées — comme un agent d'exécution de code |

L'utilisateur choisit son mode selon son niveau de confiance dans la règle.

**Flux complet**

```
Règle utilisateur (langage naturel)
           ↓
   Interprétation de l'intention
           ↓
   Génération des hypothèses
           ↓
     Mode Propose          Mode Execute
  Validation user →            ↓
           ↓           Exécution directe
     Exécution
           ↓
  Résultats + hypothèses traitées + alertes
  Objets mis en exergue dans la vue 3D
```

### Interface IA

- L'utilisateur pose des questions en **langage naturel**
- L'IA dispose du graphe enrichi pour raisonner sur le modèle
- Trois usages :
  1. **Création de règles** (section 8 — Mode IA)
  2. **Interrogation directe** : *"Le garde-corps de la chambre 201 respecte-t-il la norme PMR ?"*
  3. **Vérification intelligente** : interprétation, hypothèses, exécution

---

## 18. Contraintes de performance

| Contrainte | Valeur cible |
|---|---|
| Taille max par fichier | 500 MB |
| Premiers objets affichés | < 5 secondes après chargement |
| Traitement | 100% local, sans serveur |
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
- Fonctionne localement, sans connexion internet requise
- Règles sauvegardées dans le fichier projet, **réutilisables sur n'importe quel autre modèle**
- Aucune donnée du modèle IFC n'est envoyée vers un serveur

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
