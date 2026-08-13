# ═══════════════════════════════════════════════════════════════════════════
# SISAR Audit — Makefile unifié (Windows + Linux / macOS)
# ═══════════════════════════════════════════════════════════════════════════

# Détection OS
ifeq ($(OS),Windows_NT)
    RM = if exist
    RMFLAG = del /q /s
    NPM = npm.cmd
    NPX = npx.cmd
    RMDIR = rmdir /s /q
else
    RM = rm -f
    RMFLAG =
    NPM = npm
    NPX = npx
    RMDIR = rm -rf
endif

.PHONY: help install dev dev:api dev:web build build:api build:web start test test:unit test:integration test:setup test:docker jenkins:up jenkins:down jenkins:logs k8s:apply k8s:delete k8s:status observability:up observability:down observability:logs backup:up backup:down backup:now backup:test-restore argocd:install argocd:password argocd:apps argocd:sync lint clean down reset

help: ## 📖 Affiche cette aide
	@echo "╔══════════════════════════════════════════════════╗"
	@echo "║   SISAR Audit — Commandes disponibles           ║"
	@echo "╚══════════════════════════════════════════════════╝"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Installation ──────────────────────────────────────────────────────────

install: ## 📦 Installation complète (1ère fois : dépendances + Prisma)
	$(NPM) install
	$(NPM) run prisma:generate
	@echo "✅ Installation terminée !"

# ── Développement ─────────────────────────────────────────────────────────

dev: ## 🚀 Lance tout en mode dev (DB + API + Web)
	docker compose up -d sqlserver
	@echo "⏳ Attente de SQL Server..."
	@sleep 10
	$(NPM) run dev

dev:api: ## 🚀 API seule en mode dev
	$(NPM) run dev:api

dev:web: ## 🚀 Frontend seul en mode dev
	$(NPM) run dev:web

# ── Docker ────────────────────────────────────────────────────────────────

up: ## 🐳 Lance tous les services Docker
	docker compose up -d --build

up:ext: ## 🐳 API+Web en Docker avec base SQL Server EXISTANTE (hors Docker)
	docker compose -f docker-compose.yml -f docker-compose.external-db.yml up -d --build api web

up:prod: ## 🐳 Lance en mode production
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

down: ## 🛑 Arrête les services Docker
	docker compose down

logs: ## 📜 Affiche les logs des services
	docker compose logs -f

reset: ## 🔄 Reset complet Docker (supprime les données !)
	docker compose down -v
	@echo "⚠️  Volume SQL Server supprimé — données perdues !"

# ── Build ─────────────────────────────────────────────────────────────────

build: ## 🔨 Build tout le projet (shared → database → api + web)
	$(NPM) run build

build:api: ## 🔨 Build API uniquement
	cd apps/api && npx tsc

build:web: ## 🔨 Build frontend uniquement
	cd apps/web && npx vite build

# ── Base de données ───────────────────────────────────────────────────────

db:generate: ## 🗄️ Génère le client Prisma
	$(NPM) run prisma:generate

db:migrate: ## 🗄️ Applique les migrations Prisma
	$(NPM) run prisma:migrate

db:push: ## 🗄️ Push direct du schéma (dev rapide)
	cd packages/database && npx prisma db push

db:studio: ## 🗄️ Ouvre Prisma Studio
	cd packages/database && npx prisma studio

# ── Qualité ───────────────────────────────────────────────────────────────

test: ## 🧪 Lance tous les tests (unitaires + intégration)
	$(NPM) run test

test:unit: ## 🧪 Tests unitaires uniquement (sans BDD)
	$(NPM) run test:unit

test:integration: ## 🧪 Tests d'intégration (base AuditDB_Test requise)
	$(NPM) run test:integration

test:setup: ## 🗄️ Prépare la base de test dédiée AuditDB_Test
	$(NPM) run test:setup

test:docker: ## 🐳 Lance tous les tests en Docker
	docker compose -f docker-compose.test.yml up --build --abort-on-container-exit

# ── Jenkins (Étape 2 — CI/CD interne) ────────────────────────────────────

jenkins:up: ## 🚀 Démarre Jenkins (contrôleur + Docker-in-Docker)
	docker compose -f docker-compose.jenkins.yml up -d --build

jenkins:down: ## 🛑 Arrête Jenkins
	docker compose -f docker-compose.jenkins.yml down

jenkins:logs: ## 📜 Logs Jenkins (mot de passe admin au 1er démarrage)
	docker compose -f docker-compose.jenkins.yml logs -f jenkins

# ── Kubernetes / k3s (Étape 3) ───────────────────────────────────────────

k8s:apply: ## ☸️ Applique les manifests Kubernetes (kubectl apply -k k8s)
	kubectl apply -k k8s

k8s:delete: ## ☸️ Supprime le déploiement Kubernetes
	kubectl delete -k k8s

k8s:status: ## ☸️ Statut des pods / services / ingress
	kubectl get pods,svc,ingress -n audit

# ── Observabilité (Étape 2 bis — Prometheus + Grafana) ───────────────────

observability:up: ## 📈 Démarre Prometheus + Grafana (monitoring)
	docker compose -f docker-compose.monitoring.yml up -d

observability:down: ## 📈 Arrête Prometheus + Grafana
	docker compose -f docker-compose.monitoring.yml down

observability:logs: ## 📈 Logs Prometheus + Grafana
	docker compose -f docker-compose.monitoring.yml logs -f

# ── Backup / DR (Étape 5 — base SQL Server) ──────────────────────────────

backup:up: ## 💾 Démarre les sauvegardes planifiées (SQL Server)
	docker compose -f docker-compose.backup.yml up -d --build

backup:down: ## 💾 Arrête les sauvegardes planifiées
	docker compose -f docker-compose.backup.yml down

backup:now: ## 💾 Backup immédiat (une fois)
	docker compose -f docker-compose.backup.yml run --rm db-backup /usr/local/bin/backup.sh

backup:test-restore: ## 🧪 Drill DR : restaure le dernier backup sur une instance de TEST
	docker compose -f docker-compose.backup.yml run --rm db-backup /usr/local/bin/restore-test.sh

# ── GitOps (Étape 6 — ArgoCD) ───────────────────────────────────────────

argocd:install: ## 🔁 Installe ArgoCD sur k3s (à lancer sur le nœud k3s)
	bash argocd/install.sh

argocd:password: ## 🔁 Mot de passe admin ArgoCD initial
	kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo ""

argocd:apps: ## 🔁 Déclare le projet + les applications GitOps
	kubectl apply -f argocd/project.yaml -f argocd/app-of-apps.yaml

argocd:sync: ## 🔁 Force la synchronisation des applications
	argocd app sync audit-apps --prune

lint: ## 🔍 Vérifie le code (TypeScript)
	cd apps/api && npx tsc --noEmit
	cd apps/web && npx tsc --noEmit

# ── Utilitaires ───────────────────────────────────────────────────────────

clean: ## 🧹 Nettoie les builds
	$(RMDIR) apps/api/dist 2>nul || true
	$(RMDIR) apps/web/dist 2>nul || true
	$(RMDIR) packages/database/dist 2>nul || true
	$(RMDIR) packages/shared/dist 2>nul || true
	@echo "✅ Nettoyage terminé !"

prune: ## 🧹 Nettoie node_modules (réinstallation complète)
	$(RMDIR) node_modules 2>nul || true
	$(RMDIR) apps/api/node_modules 2>nul || true
	$(RMDIR) apps/web/node_modules 2>nul || true
	$(RMDIR) packages/database/node_modules 2>nul || true
	$(RMDIR) packages/shared/node_modules 2>nul || true
	@echo "✅ node_modules supprimés. Faites 'make install' pour réinstaller."
