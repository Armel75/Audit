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

.PHONY: help install dev dev:api dev:web build build:api build:web start test lint clean down reset

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

test: ## 🧪 Lance tous les tests
	@echo "📌 Aucun test configuré pour le moment"
	# cd apps/api && $(NPM) test
	# cd apps/web && $(NPM) test

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
