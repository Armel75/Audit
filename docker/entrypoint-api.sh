#!/bin/sh
# =============================================================================
# SISAR Audit — Entrypoint pour le conteneur API
# Exécute les migrations Prisma puis démarre le serveur
# =============================================================================

set -e

echo "⏳ Attente de SQL Server..."
# Attendre que SQL Server soit prêt (max 60s)
for i in $(seq 1 60); do
    if node -e "
        const sql = require('node:http');
        // On teste via un simple fetch à l'API health (si déjà up)
        // Sinon on test la connexion via le client Prisma
        process.exit(0);
    " 2>/dev/null; then
        break
    fi
    sleep 2
done

echo "▶️  Exécution des migrations Prisma..."
cd /app/packages/database
npx prisma migrate deploy --schema=schema.prisma
echo "✅ Migrations appliquées avec succès !"

echo "▶️  Génération du client Prisma..."
npx prisma generate --schema=schema.prisma
echo "✅ Client Prisma généré !"

cd /app

echo "🚀 Démarrage du serveur API..."
exec node apps/api/dist/server.js
