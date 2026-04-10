# Feuille de Route — Visionneuse IFC avec Analyse Spatiale

> Document de référence pour le développement  
> À lire conjointement avec [`docs/SPEC.md`](docs/SPEC.md)

---

## Principes de développement

> **"Pense comme un horloger, pas comme un maçon."**
> La manipulation de fichiers IFC de 500 MB demande une précision extrême sur la gestion mémoire. L'interface doit être sobre — l'analyse spatiale est complexe, l'UI doit être simple. S'inspirer des outils SIG pour la rigueur, garder la fluidité d'un outil moderne pour l'usage.

Les choix technologiques (langages, bibliothèques, moteurs) sont laissés au développeur. Ce document décrit les **fonctionnalités à livrer** et les **critères de validation**, pas les implémentations.

---

## Phase 0 — Socle & Environnement

**Objectif :** Mettre en place un environnement de développement stable et performant.

- Configuration du projet (build, tests, linting)
- Parsing d'un fichier IFC et affichage basique en 3D
- Navigation dans la scène (orbite, zoom, pan)
- Sélection d'un objet au clic avec affichage de ses propriétés IFC
- L'interface reste réactive pendant le chargement (parsing en arrière-plan)

**Critère de validation :** Charger un fichier IFC de 200 MB. L'interface ne se fige pas pendant le parsing.

---

## Phase 1 — Visualisation complète

**Objectif :** Offrir une visionneuse IFC complète et exploitable.

- Arbre des objets IFC (hiérarchie Site → Bâtiment → Étage → Local → Objet)
- Filtres de visibilité par discipline, étage, type d'objet
- Coupes planes (X, Y, Z)
- Mesures manuelles (distance, surface, angle)
- Niveaux de détail (LOD) selon la distance caméra
- Chargement multi-modèles simultané (fédération)

**Critère de validation :** Charger 3 modèles fédérés (ARC + STR + ELEC). Naviguer et couper les 3 simultanément.

---

## Phase 2 — Indexation spatiale

**Objectif :** Rendre le modèle interrogeable spatialement en temps réel.

- Construction d'une structure d'indexation spatiale au chargement
- Calcul des enveloppes géométriques pour chaque entité IFC
- Première requête spatiale : "Trouver tous les objets à moins de X mètres de cet objet"
- Gestion des tolérances géométriques (objets à ±quelques mm)

**Critère de validation :** Requête "objets adjacents" sur un modèle de 100 000 objets. Temps de réponse < 100ms.

---

## Phase 3 — Fichier projet & Couche delta

**Objectif :** Gérer la persistance sans modifier le fichier IFC original.

- Format de fichier projet encapsulé (extension à définir — voir SPEC section 3)
- Structure documentée et ouverte : IFC + delta + règles + zones + annotations + historique
- Ajout / modification de paramètres sur les objets (couche delta)
- Re-qualification des objets non typés via le delta
- Algorithme de réconciliation des identifiants (GUID) par empreinte composite

**Critère de validation :** Ajouter un paramètre sur un objet, exporter le fichier projet, réimporter — le paramètre est présent. Modifier le GUID d'un objet dans l'IFC, réimporter — le delta se reconnecte correctement.

---

## Phase 4 — Sélection libre de zone & Primitives spatiales

**Objectif :** Permettre à l'utilisateur de définir son périmètre d'analyse et exécuter les 4 primitives.

- Outil de sélection libre de zone (rectangle, polygone, sélection manuelle)
- Primitive **Containment** : quels objets sont dans cette zone ?
- Primitive **Adjacence** : quels objets partagent une frontière avec cet objet ?
- Primitive **Intersection** : quelle portion de cet objet est dans cette zone ?
- Primitive **Mesure** : surface, longueur, volume d'un objet ou d'un résultat
- Cache des résultats spatiaux

**Critère de validation :** Créer une zone dans une pièce. La liste des objets contenus correspond exactement à ce qui est visible à l'écran. Deuxième requête identique exécutée depuis le cache — temps de réponse < 10ms.

---

## Phase 5 — Moteur de règles

**Objectif :** Transformer des intentions en vérifications automatisées.

- Éditeur de règles (3 modes : visuel, texte, IA)
- Exécution des règles sur une zone IFC native ou une zone libre
- Résultats mis en surbrillance dans la vue 3D (conforme / non conforme / avertissement)
- Catalogue de règles prédéfinies organisé par norme / métier / usage
- Sauvegarde et réutilisation des règles utilisateur

**Critère de validation :**
- Règle "dégagement 0,50m autour de chaque équipement de maintenance" — les objets en conflit sont correctement identifiés et surlignés
- Règle exportée, chargée sur un autre modèle — fonctionne sans reconfiguration

---

## Phase 6 — Agent de Vérification Intelligent (IA)

**Objectif :** Rendre l'outil accessible en langage naturel et capable d'interpréter des intentions.

- Interface de chat en langage naturel
- Traduction d'une intention en règle structurée (via LLM)
- Mode **Propose** : l'agent présente les hypothèses et attend validation
- Mode **Execute** : l'agent exécute directement et présente les résultats
- Graphe d'objets enrichi (relations calculées accessibles par l'IA)
- Détection des objets de maintenance sans `IfcSpace` associé

**Critère de validation :** Demande "Vérifie si les extincteurs sont accessibles". L'agent identifie les extincteurs par leur type IFC, propose un dégagement adapté, exécute la vérification et surligne les non-conformités.

---

## Phase 7 — Géoréférencement & Carte

**Objectif :** Contextualiser le modèle dans son environnement géographique réel.

- Lecture du géoréférencement depuis `IfcSite`
- Interface de saisie manuelle (Lat/Long + rotation Nord) si `IfcSite` est absent ou incorrect
- Toggle cartographique ON/OFF
- Maquette toujours au premier plan (priorité de rendu absolue)
- Recalage multi-modèles (fédération avec origines différentes)

**Critère de validation :** Modèle positionné correctement sur sa parcelle réelle (vérifiable via vue satellite). Toggle ON/OFF fluide sans rechargement.

---

## Phase 8 — Comparaison de versions & Exports

**Objectif :** Suivre l'évolution des modèles et produire des livrables exploitables.

- Comparaison V1 / V2 : objets ajoutés, supprimés, modifiés
- Comparaison des résultats d'analyse entre sessions
- Export PDF (rapport avec captures des non-conformités)
- Export Excel (données tabulaires)
- Export BCF (communication vers outils auteurs)
- Historique des analyses dans le fichier projet

**Critère de validation :** Rapport PDF généré avec captures d'écran des objets non conformes surlignés. Import BCF dans un outil auteur (Revit, ArchiCAD) — les issues apparaissent correctement.

---

## Phase 9 — Optimisation & Solidité

**Objectif :** Robustesse industrielle et performances sur modèles lourds.

- Gestion mémoire : seuls les objets visibles ou en cours d'analyse sont en mémoire active
- Géométrie parsée mise en cache local pour éviter les rechargements
- Gestion des géométries malformées (mesh healing)
- Fonctionnement hors-ligne complet une fois l'application chargée
- Documentation technique intégrée

**Critère de validation :** Modèle fédéré de 3 × 500 MB chargé et analysé sans crash. Mémoire active < 4 GB.

---

## Livrables attendus

1. **Code source** — propre, avec README et instructions de build
2. **Fichier projet d'exemple** — un `.bimview` pré-configuré avec des règles de test
3. **Suite de tests spatiaux** — preuve que les calculs sont corrects au centimètre près

---

## Fichiers IFC de test

Les fichiers IFC de référence sont disponibles dans le dépôt privé **`paliabra/bim-examples`**.
Accès sur demande auprès du porteur du projet.

Pour les utiliser en développement :
```bash
git clone https://github.com/paliabra/bim-examples examples
```
