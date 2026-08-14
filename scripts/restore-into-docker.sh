#!/usr/bin/env bash
# =============================================================================
# Restaure un backup (.bak) dans le conteneur SQL Server local (audit-db)
# -----------------------------------------------------------------------------
# Usage (sur le serveur Ubuntu) :
#   SA_PASSWORD='TonMotDePasse' bash scripts/restore-into-docker.sh /chemin/AuditDB.bak
#
# Le script gère automatiquement le "MOVE" des fichiers : un .bak contient les
# chemins internes du serveur d'origine (Windows) qui n'existent pas sur Linux.
# Sans MOVE, la restauration échouerait — c'est le piège classique des .bak.
# =============================================================================
set -euo pipefail

CONTAINER="${CONTAINER:-audit-db}"
DB_NAME="${2:-AuditDB}"
SA_PASSWORD="${SA_PASSWORD:?SA_PASSWORD requis (ex: SA_PASSWORD=xxx bash $0 <bak>)}"
BAK="${1:-}"

if [ -z "$BAK" ] || [ ! -f "$BAK" ]; then
  echo "❌ Usage : SA_PASSWORD=xxx bash $0 /chemin/vers/AuditDB.bak [DB_NAME]"
  exit 1
fi

SQLCMD="/opt/mssql-tools18/bin/sqlcmd"

# ── Vérifications ────────────────────────────────────────────────────────────
docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$" \
  || { echo "❌ Conteneur ${CONTAINER} non démarré. Lancez : docker compose up -d sqlserver"; exit 1; }

BAK_NAME="$(basename "$BAK")"
echo "[RESTORE] Conteneur : ${CONTAINER} | Base : ${DB_NAME} | Backup : ${BAK_NAME}"

# ── Copie du .bak dans le conteneur ──────────────────────────────────────────
# S'assure que le dossier de backup existe dans le conteneur
# (sinon `docker cp` échoue : "Error response from daemon")
docker exec "${CONTAINER}" mkdir -p /var/opt/mssql/backup
docker cp "$BAK" "${CONTAINER}:/var/opt/mssql/backup/${BAK_NAME}"
echo "[RESTORE] ✅ Backup copié dans le conteneur"

rs() { docker exec "$CONTAINER" "$SQLCMD" -S localhost -U sa -P "$SA_PASSWORD" -C -b "$@"; }

# ── Lecture des noms logiques / physiques (colonne 1, 2 et type 3 = D/L) ─────
echo "[RESTORE] Lecture des fichiers logiques du backup..."
FILES="$(rs -h -1 -W -s '|' -Q "SET NOCOUNT ON; RESTORE FILELISTONLY FROM DISK = N'/var/opt/mssql/backup/${BAK_NAME}';")"

DATA_ROW="$(printf '%s\n' "$FILES" | awk -F'|' '$3=="D"{print; exit}')"
LOG_ROW="$(printf '%s\n' "$FILES" | awk -F'|' '$3=="L"{print; exit}')"
DATA_LOGICAL="$(printf '%s' "$DATA_ROW" | cut -d'|' -f1)"
LOG_LOGICAL="$(printf '%s' "$LOG_ROW" | cut -d'|' -f1)"
# Le chemin physique du backup est un chemin Windows (ex: C:\...\AuditDB.mdf) :
# on ne garde que le NOM du fichier (sinon le MOVE crée des chemins invalides)
DATA_PHYS="$(printf '%s' "$DATA_ROW" | cut -d'|' -f2 | sed 's|.*[/\\]||')"
LOG_PHYS="$(printf '%s' "$LOG_ROW" | cut -d'|' -f2 | sed 's|.*[/\\]||')"

echo "[RESTORE] Données : ${DATA_LOGICAL} → ${DATA_PHYS} | Journal : ${LOG_LOGICAL} → ${LOG_PHYS}"

MOVE="MOVE '${DATA_LOGICAL}' TO '/var/opt/mssql/data/${DATA_PHYS}'"
[ -n "$LOG_LOGICAL" ] && MOVE="${MOVE}, MOVE '${LOG_LOGICAL}' TO '/var/opt/mssql/data/${LOG_PHYS}'"

# ── Restauration ─────────────────────────────────────────────────────────────
echo "[RESTORE] Suppression d'une éventuelle base ${DB_NAME} existante..."
rs -Q "IF DB_ID('${DB_NAME}') IS NOT NULL BEGIN ALTER DATABASE [${DB_NAME}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${DB_NAME}]; END"

echo "[RESTORE] Restauration (${MOVE})..."
rs -Q "RESTORE DATABASE [${DB_NAME}] FROM DISK = N'/var/opt/mssql/backup/${BAK_NAME}' WITH ${MOVE}, REPLACE, RECOVERY"

# ── Vérification ─────────────────────────────────────────────────────────────
OK="$(rs -h -1 -W -Q "SET NOCOUNT ON; SELECT 'OK' FROM sys.databases WHERE name='${DB_NAME}'")"
echo "[RESTORE] Résultat de vérification : ${OK}"
if [ "$OK" != "OK" ]; then
  echo "[RESTORE] ❌ La base ${DB_NAME} est introuvable après restauration"
  exit 1
fi

# ── Nettoyage ────────────────────────────────────────────────────────────────
docker exec "$CONTAINER" rm -f "/var/opt/mssql/backup/${BAK_NAME}" || true
echo "[RESTORE] ✅ Base ${DB_NAME} restaurée avec succès dans le conteneur."
