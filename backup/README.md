# Backup / DR — Base SQL Server (SISAR Audit)

Sauvegarde **native SQL Server** planifiée + drill de restauration (DR), pour la
base externe `AuditDB`. Aucun secret dupliqué : les identifiants sont extraits
de `DATABASE_URL` (`.env`).

## Commandes

```bash
make backup:up            # Service planifié : backup immédiat puis toutes les 24h
make backup:now           # Backup manuel immédiat (une fois)
make backup:logs          # docker compose -f docker-compose.backup.yml logs -f
make backup:test-restore  # Drill DR (voir plus bas)
make backup:down          # Arrête le service
```

## Ce que fait un backup

1. `BACKUP DATABASE [AuditDB] TO DISK ... WITH COMPRESSION, CHECKSUM`
   → `backups/AuditDB_<horodatage>.bak` (volume `./backups` sur l'hôte).
2. `RESTORE VERIFYONLY` : vérifie l'intégrité du fichier.
3. **Rétention** : suppression des backups de plus de `RETENTION_DAYS` jours
   (défaut 14), configurable.

## Configuration (variables)

| Variable | Défaut | Rôle |
|---|---|---|
| `DATABASE_URL` | (du `.env`) | Source de sauvegarde (identifiants dérivés) |
| `DB_NAME` | `AuditDB` | Base à sauvegarder |
| `BACKUP_INTERVAL_HOURS` | `24` | Fréquence du service planifié |
| `RETENTION_DAYS` | `14` | Rétention des backups |

## Drill de restauration (DR) — `make backup:test-restore`

Prouve que les backups sont **restaurables** :

1. Prend le dernier `.bak` dans `backups/`.
2. Le restaure dans une base jetable `AuditDB_DR_Test` sur une instance **de
   TEST** (`RESTORE_HOST`, défaut `host.docker.internal,1433` = votre SQL Server
   de dev exposé sur l'hôte).
3. Vérifie que la base existe, puis la supprime.

> ⚠️ **Ne jamais** pointer `RESTORE_HOST` vers la base de **production** : le
> drill restaure dans une base jetable, mais l'instance cible doit rester une
> instance de test.

## Recommandations (top 1 %)

- **Déplacer les backups hors de l'hôte** dès que possible : vers un NAS/SAN ou
  un stockage objet (le dossier `backups/` est déjà exclu de git).
- **Règle 3-2-1** : 3 copies, 2 supports, 1 hors-site. Aujourd'hui les backups
  sont sur l'hôte de la machine où tourne Docker → **risque de perte totale si
  le disque meurt**. À mitiger (ex : copie quotidienne vers un NAS).
- **Tester le restore régulièrement** (au moins mensuel) : c'est le drill qui
  garantit réellement la récupération.
- Pour la **haute dispo** (en option) : toujours activer la réplication SQL
  Server (Always On) ou un miroir — le backup seul ne garantit pas la continuité.
