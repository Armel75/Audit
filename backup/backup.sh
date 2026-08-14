#!/usr/bin/env bash
# =============================================================================
# Sauvegarde SQL Server — écrit le .bak sur le SERVEUR SQL (pas dans le conteneur)
# -----------------------------------------------------------------------------
# ⚠️  Un `BACKUP DATABASE ... TO DISK` s'exécute SUR la machine SQL Server :
# le fichier est écrit côté serveur (disque local ou partage réseau/UNC), jamais
# chez le client. Le conteneur est un simple client sqlcmd.
#
# BACKUP_DEST : chemin SIDE SERVEUR SQL, par exemple :
#   - partage réseau (recommandé) : \\NAS\Backups        (le compte du service
#     SQL Server doit pouvoir ÉCRIRE sur ce partage)
#   - dossier local du serveur    : D:\Backups
#
# Récupérez ensuite le fichier depuis le serveur/partage (ex: copie puis scp
# vers Ubuntu) — voir DEPLOY-UBUNTU.md.
# =============================================================================
set -euo pipefail

: "${BACKUP_DEST:?BACKUP_DEST requis : chemin SUR le serveur SQL (ex: D:\\Backups ou \\\\NAS\\Backups)}"
: "${DB_NAME:=AuditDB}"

# ── Détection de sqlcmd ──────────────────────────────────────────────────────
SQLCMD=""
for c in /opt/mssql-tools18/bin/sqlcmd /opt/mssql-tools/bin/sqlcmd sqlcmd; do
  if command -v "$c" >/dev/null 2>&1; then SQLCMD="$c"; break; fi
done
if [ -z "$SQLCMD" ]; then
  echo "[BACKUP] ❌ sqlcmd introuvable" >&2
  exit 1
fi

# ── Dérivation des identifiants depuis DATABASE_URL (si non fournis) ────────
if [ -z "${DB_HOST:-}" ] || [ -z "${DB_PASSWORD:-}" ]; then
  DB_HOST="${DB_HOST:-$(printf '%s' "$DATABASE_URL" | sed -n 's|^sqlserver://\([^:;@]*\).*|\1|p')}"
  DB_PORT="${DB_PORT:-$(printf '%s' "$DATABASE_URL" | sed -n 's|^sqlserver://[^:;@]*:\([0-9]*\).*|\1|p')}"
  DB_USER="${DB_USER:-$(printf '%s' "$DATABASE_URL" | sed -n 's/.*;user=\([^;]*\).*/\1/p')}"
  DB_PASSWORD="${DB_PASSWORD:-$(printf '%s' "$DATABASE_URL" | sed -n 's/.*;password=\([^;]*\).*/\1/p')}"
  DB_NAME="${DB_NAME:-$(printf '%s' "$DATABASE_URL" | sed -n 's/.*;database=\([^;]*\).*/\1/p')}"
fi
: "${DB_HOST:?DB_HOST requis (ou DATABASE_URL)}"
: "${DB_PORT:=1433}"
: "${DB_USER:=sa}"
: "${DB_PASSWORD:?DB_PASSWORD requis (ou DATABASE_URL)}"

SERVER="${DB_HOST},${DB_PORT}"
TS="$(date +%Y%m%d_%H%M%S)"

# Séparateur : n'ajoute un \ que si BACKUP_DEST n'en a pas déjà un
SEP=''
case "$BACKUP_DEST" in */ | *\\) SEP='' ;; *) SEP='\' ;; esac
FILE="${BACKUP_DEST}${SEP}AuditDB_${TS}.bak"

run_sqlcmd() { "$SQLCMD" -S "$SERVER" -U "$DB_USER" -P "$DB_PASSWORD" -C -b "$@"; }

echo "[BACKUP] Instance : ${SERVER} | Base : ${DB_NAME}"
echo "[BACKUP] Cible (SIDE SERVEUR SQL) : ${FILE}"
# NB : pas de COMPRESSION (non supportée sur SQL Server Express) ; CHECKSUM
# garantit l'intégrité du backup.
run_sqlcmd -Q "BACKUP DATABASE [${DB_NAME}] TO DISK = N'${FILE}' WITH CHECKSUM, INIT, STATS=5"
echo "[BACKUP] ✅ Backup créé sur le serveur : ${FILE}"

echo "[BACKUP] RESTORE VERIFYONLY (intégrité)..."
run_sqlcmd -Q "RESTORE VERIFYONLY FROM DISK = N'${FILE}'"
echo "[BACKUP] ✅ Intégrité vérifiée"

echo "[BACKUP] Terminé. Récupérez ${FILE} (serveur/partage) puis transférez-le vers Ubuntu."
echo "[BACKUP] Astuce : le compte du service SQL Server doit pouvoir écrire dans ${BACKUP_DEST}."

