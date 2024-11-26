# Full-Stack Application avec React, Node.js et Firebase

## Description
Application web full-stack utilisant React pour le frontend, Node.js pour le backend, et Firebase pour la base de données.

## Structure du Projet
- `/frontend` : Application React
- `/backend` : Serveur Node.js
- `/config` : Fichiers de configuration

## Prérequis
- Node.js (v14 ou supérieur)
- npm ou yarn
- Compte Firebase

## Installation

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Configuration Firebase
1. Créer un projet dans Firebase Console
2. Configurer les variables d'environnement
3. Initialiser Firebase dans l'application

## Variables d'Environnement
Créer un fichier `.env` dans le dossier backend et frontend avec les variables nécessaires.

## Sécurité
- Utilisation de variables d'environnement pour les informations sensibles
- Authentification Firebase
- CORS configuré
- Protection des routes API
