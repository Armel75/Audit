# SISAR - Système de Suivi des Audits et Recommandations

Ce projet est une application SaaS B2B de gestion et de suivi d'audit. Il est structuré sous forme de monorepo (utilisant les workspaces npm) et comprend un backend en Node.js/Express, un frontend en React/Vite, et une base de données SQL Server gérée avec Prisma.

## 📋 Prérequis

Avant de commencer, assurez-vous de disposer des éléments suivants sur votre machine :

- **Node.js** (version 18.x ou supérieure recommandée)
- **npm** (version 9.x ou supérieure)
- **SQL Server** (une instance locale ou distante accessible)

## 🚀 Mode Opératoire : Déploiement et Lancement en Local

Suivez ces étapes dans l'ordre pour configurer et lancer le projet sur votre machine locale.

### 1. Installation des dépendances

Placez-vous à la racine du projet et installez toutes les dépendances du monorepo (cela installera les paquets pour l'API, le Web, et les packages partagés) :

```bash
npm install
```

### 2. Configuration de l'environnement

Créez un fichier `.env` à la racine du projet (vous pouvez vous baser sur le fichier `.env.example` s'il existe) et configurez vos variables d'environnement. 

La variable la plus importante est la chaîne de connexion à votre base de données SQL Server :

```env
# Exemple de configuration de base de données SQL Server
DATABASE_URL="sqlserver://UTILISATEUR:MOT_DE_PASSE@HOST:PORT;database=NOM_BDD;encrypt=true;trustServerCertificate=true"

# Autres variables potentielles selon votre configuration
# JWT_SECRET="votre_secret_jwt_tres_securise"
# PORT=3000
```

### 3. Initialisation de la base de données (Prisma)

Une fois la connexion à la base de données configurée, vous devez générer le client Prisma et appliquer le schéma à votre base de données SQL Server.

Depuis la racine du projet, exécutez :

```bash
# 1. Générer le client Prisma
npm run prisma:generate

# 2. Appliquer les migrations à la base de données
npm run prisma:migrate
```
*(Note : Si vous êtes en phase de développement rapide sans historique de migration strict, vous pouvez également utiliser `npx prisma db push --schema=packages/database/schema.prisma`)*

### 4. Lancement de l'application (Mode Développement)

Pour lancer simultanément le serveur Backend (API) et le serveur Frontend (Web) avec rechargement à chaud, exécutez la commande suivante à la racine :

```bash
npm run dev
```

Cette commande utilise `concurrently` pour démarrer les deux environnements :
- **Frontend (Web)** : Généralement accessible sur [http://localhost:5173](http://localhost:5173)
- **Backend (API)** : Généralement accessible sur [http://localhost:3000](http://localhost:3000) (ou le port défini dans votre `.env`)

---

## 📦 Déploiement pour la Production (Build)

Si vous souhaitez tester la version compilée (optimisée pour la production) en local :

1. Compilez l'ensemble des workspaces (API et Web) :
   ```bash
   npm run build
   ```

2. Démarrez le serveur API compilé :
   ```bash
   npm run start
   ```
*(Note : En production, assurez-vous que votre API est configurée pour servir les fichiers statiques générés dans `apps/web/dist` ou utilisez un serveur web dédié comme Nginx).*

## 🏗️ Structure du Monorepo

- `apps/api/` : Backend Node.js / Express.
- `apps/web/` : Frontend React / Vite / Tailwind CSS.
- `packages/database/` : Schéma Prisma et client de base de données.
- `packages/shared/` : Types, interfaces et utilitaires partagés entre le front et le back.


<img width="1590" height="1205" alt="image" src="https://github.com/user-attachments/assets/0e7df642-41ab-4f1e-91a9-01395c504aea" />
