#!/bin/bash
# =============================================================================
# SISAR Audit — Script d'initialisation de la base de données SQL Server
# Exécuté au démarrage du conteneur sqlserver
# =============================================================================

set -e

echo "⏳ Attente que SQL Server soit prêt..."
# Attendre que SQL Server soit disponible
for i in {1..60}; do
    if /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C -Q "SELECT 1" &> /dev/null; then
        echo "✅ SQL Server est prêt !"
        break
    fi
    echo "   Tentative $i/60..."
    sleep 2
done

# Exécuter les scripts d'initialisation
for script in /scripts/init/*.sql; do
    if [ -f "$script" ]; then
        echo "▶️  Exécution de $script ..."
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C -i "$script"
        echo "✅ $script exécuté avec succès."
    fi
done

echo "🎉 Initialisation terminée !"
