# BIM Viewer — Visionneuse IFC avec Analyse Spatiale

Visionneuse de maquettes numériques IFC avec moteur d'analyse spatiale. Exploite la géométrie et les relations entre objets pour vérifier des intentions métier — au-delà des simples requêtes sur propriétés.

> Voir les spécifications complètes : [`docs/SPEC.md`](docs/SPEC.md)

## Fonctionnalités

- **Chargement IFC** : glisser-déposer ou bouton "Charger IFC"
- **Navigation 3D** : orbite, pan (clic droit), zoom (molette)
- **Sélection d'éléments** : mode sélection avec affichage des propriétés (PSets, quantités)
- **Arbre du modèle** : structure Site > Bâtiment > Niveaux
- **Catégories** : visibilité par type IFC (murs, dalles, portes…)
- **Plan de coupe** : coupe selon les axes X, Y ou Z
- **Raccourcis clavier** : `O` orbite, `S` sélection, `F` recadrer, `Échap` déselectionner

## Démarrage

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Licence

- Le code source est sous licence [Apache 2.0](LICENSE)
- Les spécifications et la documentation sont sous licence [CC-BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

[![License](https://img.shields.io/badge/Code-Apache%202.0-blue.svg)](LICENSE)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/Specs-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)
