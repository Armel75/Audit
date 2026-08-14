# 🚀 Déployer SISAR Audit sur Ubuntu (avec Docker) — v2

Guide pas-à-pas, pensé pour quelqu'un qui démarre avec Docker. Le principe :
on installe l'application dans des **conteneurs** (des petites « maisons »
isolées), et on **importe une copie** de la base de production dans le
conteneur SQL Server local.

> ⚠️ Ceci crée une **COPIE** de la base de production. La base de production
> (sur le serveur SQL externe) n'est **pas touchée** et continue de tourner.

> 🛠️ **v2** : cette version intègre **tous les pièges rencontrés lors du
> premier déploiement réel** (URL de base invalide → API en boucle de
> redémarrage, permissions Docker, backups SQL Express, DNS transitoires…).
> Chaque piège est documenté avec sa solution exacte dans la section
> [🚨 Dépannage](#-dépannage--les-problèmes-réellement-rencontrés).

---

## La recette en une phrase

> **Fais une copie de ta base (un `.bak`) → transporte-la sur Ubuntu →
> démarre SQL Server dans Docker → restaures la copie dedans → démarres
> l'application qui utilise cette base locale.**

---

## Étape 0 — Prérequis sur le serveur Ubuntu (pré-vol 🛫)

**Vérifie TOUT avant de commencer** — c'est ici qu'on a perdu du temps la 1ʳᵉ fois.

```bash
# 1) Docker + git présents ✅
docker --version          # Docker 28 attendu
docker compose version    # la sous-commande "compose" doit exister
git --version

# 2) Compléter : make (utilisé par le Makefile) + curl
sudo apt update
sudo apt install -y make curl

# 3) ⚠️ Permissions Docker — sans ça : "permission denied ... docker.sock"
#    (à faire UNE fois, puis SE DÉCONNECTER / RECONNECTER la session SSH)
sudo usermod -aG docker $USER
#    → ferme la session, rouvre-la, puis vérifie :
docker ps                  # doit fonctionner SANS sudo
```

> Si tu préfères rester sur `sudo docker ...` partout, c'est OK — mais alors
> **toutes** les commandes doivent passer par `sudo` (y compris le backup).

---

## Étape 1 — Récupérer le projet sur le serveur

```bash
cd ~
git clone <URL-DU-REPO> audit
cd audit
```

(Si ton repo est privé, utilise l'URL SSH ou copie le dossier via scp.)

---

## Étape 2 — Créer le fichier `.env` sur le serveur

Le `.env` n'est pas dans git (il contient les secrets). Copie le modèle puis
complète-le :

```bash
cp .env.example .env
nano .env
```

**Contenu minimum recommandé** :

```dotenv
# ── Base locale Docker (conteneur SQL Server) ───────────────────────
# ⚠️ LE mot de passe : il doit être IDENTIQUE à celui de la restauration (étape 5)
SA_PASSWORD=DevPassword123!

# ── Sécurité API ─────────────────────────────────────────────────────
JWT_SECRET=<génére-un-secret-long-aléatoire>
```

> **Règle d'or** : `SA_PASSWORD` est utilisé à 3 endroits qui doivent matcher :
> le `.env` (ici), la restauration (étape 5) et l'API au démarrage (via la
> même variable `${SA_PASSWORD}` du `docker-compose.yml`). Avec le défaut
> `DevPassword123!`, tu n'as rien de plus à faire.

---

## ⚙️ À comprendre avant d'aller plus loin : la connexion à la base

`docker-compose.yml` contient **DEUX lignes `DATABASE_URL`** (une seule active) :

```yaml
# ✅ BASE LOCALE (conteneur SQL Server Docker) — ACTIVE par défaut
DATABASE_URL: "sqlserver://sqlserver:1433;database=AuditDB;user=sa;password=${SA_PASSWORD:-DevPassword123!};encrypt=true;trustServerCertificate=true"
# 🔄 BASE EXTERNE (production, depuis le .env) — décommentez pour basculer :
# DATABASE_URL: "${DATABASE_URL}"
```

- **En local** (notre cas ici) : la ligne **locale est active**, la ligne
  externe est **commentée**. Rien à faire ✅
- **⚠️ PIÈGE N°1** : l'ancien format `sqlserver://sa:mdp@hôte;database=...` faisait
  planter Prisma (`P1013 Invalid database URL`) → l'API bouclait en
  « Restarting » et le site répondait `502`. Le format actuel est **le bon** :
  ne le « corrige » pas ! *(voir Dépannage → 1)*

> Pour utiliser la **base externe** de production, il y a une méthode propre
> qui ne touche pas ce fichier — voir
> [🔄 Basculer base locale ⇄ base externe](#-basculer-base-locale--base-externe).

## Étape 3 — Exporter la base de production (sur ton PC Windows)

Sur ton PC, définis **où le serveur SQL doit écrire** le `.bak` (toujours
côté serveur !) :
- un **partage réseau** (recommandé) : `BACKUP_DEST=\\NAS\Backups`
- ou un **dossier local du serveur** : `BACKUP_DEST=D:\Backups`

Ajoute `BACKUP_DEST=...` dans ton `.env`, puis :

```bash
# Réutilise notre service de backup (se connecte à la base externe via .env)
make backup:now
```

→ Le `.bak` est écrit **sur le serveur SQL** (ou le partage), PAS dans
`backups/` sur ton PC : un backup SQL Server s'écrit toujours côté serveur.

> ⚠️ **Piège** : la production tourne en **SQL Server Express** → le backup se
> fait **sans `WITH COMPRESSION`** (non supporté sur Express, ça plantait).
> Notre script `backup/backup.sh` gère déjà ce cas (CHECKSUM + INIT, sans
> compression) — ne réintroduis pas la compression. *(voir Dépannage → 4)*

*(Alternative : via SSMS / Azure Data Studio → « Backup database » → `.bak`.)*

## Étape 4 — Récupérer le `.bak` et le transporter vers Ubuntu

Récupère le `.bak` là où le serveur SQL l'a écrit (partage réseau ou dossier
du serveur), copie-le sur ton PC, puis :

```bash
scp AuditDB_*.bak srvtest@<IP-UBUNTU>:/home/srvtest/audit/backups/
```

(ou WinSCP, ou une clé USB si le réseau ne le permet pas)

## Étape 5 — Démarrer SQL Server Docker + restaurer la copie

Sur le serveur Ubuntu, dans `~/audit` :

```bash
# 1) Démarre le conteneur SQL Server (service "sqlserver" du docker-compose.yml)
docker compose up -d sqlserver

# 2) Attends qu'il soit prêt (~30-60s au premier lancement)
docker compose logs -f sqlserver   # quitte avec Ctrl+C quand "ready"

# 3) Restaure la copie de production dans le conteneur
SA_PASSWORD='DevPassword123!' bash scripts/restore-into-docker.sh backups/AuditDB_XXXX.bak
```

Le script gère tout seul les pièges des `.bak` : le **MOVE** des fichiers
internes (chemins Windows à l'origine) et la création du dossier
`/var/opt/mssql/backup` dans le conteneur (sinon `docker cp` échoue).

> Si tu utilises `sudo` pour Docker, la commande devient :
> `sudo env SA_PASSWORD='DevPassword123!' bash scripts/restore-into-docker.sh backups/AuditDB_XXXX.bak`
> (`env` est indispensable : `sudo` purge les variables d'environnement).

## Étape 6 — Lancer l'application

```bash
make up     # = docker compose up -d --build   (sqlserver + api + web)
```

> **`--build` est OBLIGATOIRE** après toute modification (script, config,
> code) : sans lui, Docker réutilise les images en cache et tu démarres un
> **ancien code**. *(voir Dépannage → 6)*

Au démarrage, l'API applique les migrations Prisma (rien à faire si la base
est déjà à jour) puis démarre. Attends qu'elle soit **saine** :

```bash
until curl -sf http://localhost/api/v1/health; do sleep 2; done
# → {"status":"ok",...} dès que l'API répond
```

## Étape 7 — Vérifier (checklist)

```bash
docker compose ps                # 3 conteneurs : sqlserver, api, web
# ⚠️ api doit être "Up" — PAS "Restarting" (sinon voir Dépannage → 1)

curl http://localhost/api/v1/health   # → {"status":"ok",...}
curl -I http://localhost/audit        # → HTTP/1.1 200 (page de connexion)
```

Ouvre **http://<IP-UBUNTU>/audit** dans ton navigateur → page de connexion.

**Première connexion** : le compte admin est créé automatiquement au premier
démarrage d'une base **vide** : `admin@audit.local` / `admin123` (variables
`BOOTSTRAP_ADMIN_*` du `.env`). Si la base restaurée **contient déjà** des
comptes, le bootstrap est ignoré → utilise un compte existant de la prod.
*(voir Dépannage → 9)*

---

## 🚨 Dépannage — les problèmes réellement rencontrés

### 1. L'API tourne en boucle « Restarting » → site en `502`

- **Symptôme** : `docker compose ps` montre `api ... Restarting` ;
  `curl http://localhost/api/v1/health` → `502`.
- **Cause** : `DATABASE_URL` au mauvais format
  (`sqlserver://sa:mdp@hôte;database=...`) → Prisma `P1013 Invalid database
  URL` → l'entrypoint échoue (`set -e`) → redémarrage infini.
- **Vérifier** : `docker compose logs api` → cherche `P1013` ou
  `Invalid database URL`.
- **Corriger** : le `docker-compose.yml` doit contenir le format **actuel** :
  ```yaml
  DATABASE_URL: "sqlserver://sqlserver:1433;database=AuditDB;user=sa;password=${SA_PASSWORD:-DevPassword123!};encrypt=true;trustServerCertificate=true"
  ```
- **Relancer** : `docker compose up -d --force-recreate api`
  (`--force-recreate` force la recréation même si le YAML « n'a pas changé »).

### 2. `permission denied` sur la socket Docker

- **Cause** : l'utilisateur n'est pas dans le groupe `docker`.
- **Fix** : `sudo usermod -aG docker $USER` puis **reconnexion SSH** (le groupe
  n'est actif qu'après reconnexion). Alternative : `sudo` devant chaque
  commande Docker.

### 3. `docker cp` échoue (dossier backup absent dans le conteneur)

- **Cause** : `/var/opt/mssql/backup` n'existe pas dans le conteneur SQL Server.
- **Fix** : déjà intégré au script `restore-into-docker.sh` (`mkdir -p`).
  À la main : `docker exec audit-db mkdir -p /var/opt/mssql/backup` d'abord.

### 4. Le backup de la production échoue

- **(a) « Chemin introuvable »** → `BACKUP_DEST` doit être un chemin **du
  serveur SQL** (jamais du PC client) : un backup s'écrit toujours côté
  serveur (partage réseau ou dossier du serveur).
- **(b) `WITH COMPRESSION` refuse** → la prod est en **SQL Server Express** :
  la compression est réservée aux éditions supérieures. Backup sans
  compression (~21 Mo pour AuditDB) — notre script `backup/backup.sh` gère ça.
- **Fix** : `make backup:now` avec `BACKUP_DEST` côté serveur.

### 5. Erreurs DNS pendant le build

- **Symptôme** : `apt-get` / `npm` échoue avec `Temporary failure resolving`
  ou `Could not resolve host`.
- **Cause** : DNS transitoire (résolveur réseau Ubuntu).
- **Fix** : relancer `docker compose build api web` (ou `make up`). Ça passe au
  2ᵉ essai. Si ça persiste, vérifie `/etc/resolv.conf` / `systemd-resolve`.

### 6. L'API démarre avec l'ANCIEN code après une modification

- **Cause** : Docker réutilise le cache des images.
- **Fix** : **toujours** `--build` après une modif :
  `docker compose up -d --build`. Pour forcer :
  `docker compose build --no-cache api`.

### 7. `docker compose down --remove-orphans` a coupé l'application

- **Cause** : `--remove-orphans` supprime tout conteneur « non déclaré » dans
  le compose courant.
- **Fix** : ne jamais l'utiliser ici. `docker compose down` seul pour arrêter,
  `docker compose up -d` pour relancer.

### 8. `sudo` ne transmet pas les variables d'environnement

- **Symptôme** : `sudo bash scripts/restore-into-docker.sh ...` →
  `SA_PASSWORD requis`.
- **Fix** : `sudo env SA_PASSWORD='DevPassword123!' bash scripts/...`
  (`env` force le passage de la variable à travers `sudo`).

### 9. Impossible de se connecter au tableau de bord

- Le premier admin est créé par le « bootstrap » au premier démarrage d'une
  base **vide** : `BOOTSTRAP_ADMIN_EMAIL` (`admin@audit.local`) /
  `BOOTSTRAP_ADMIN_PASSWORD` (`admin123`), définis dans `.env`.
- Si la base restaurée **contient déjà** des comptes → le bootstrap est
  ignoré : utilise un compte existant de la prod.
- Mot de passe perdu sur une base vide : vide la base (ou supprime le volume),
  mets `BOOTSTRAP_ADMIN_PASSWORD` dans `.env`, puis
  `docker compose up -d --force-recreate api`.

---

## 🔄 Basculer base locale ⇄ base externe

**Cas 1 — Base locale (conteneur Docker)** = config par défaut. Rien à faire.

**Cas 2 — Base externe (production, DLADIR2017)** — méthode propre via le
fichier d'override **sans toucher** à `docker-compose.yml` :

```bash
# 1) Dans .env, définis la vraie URL externe (celle qui marche déjà pour le backup) :
#    DATABASE_URL=sqlserver://DLADIR2017:51269;database=AuditDB;user=sa;password=...;encrypt=true;trustServerCertificate=true;instanceName=SQLEXPRESS

# 2) Lance avec l'override dédié (aucun conteneur SQL Server n'est démarré) :
docker compose -f docker-compose.yml -f docker-compose.external-db.yml up -d --build api web
```

**Cas 3 — Méthode « dans le fichier »** (tout garder dans `docker-compose.yml`) :

```yaml
# 1) Commente la ligne locale :
# DATABASE_URL: "sqlserver://sqlserver:1433;..."
# 2) Décommente la ligne externe :
DATABASE_URL: "${DATABASE_URL}"
# 3) .env contient l'URL externe (ci-dessus)
```

```bash
docker compose up -d --force-recreate api
```

> ⚠️ **Prudence** : en base externe, l'API travaille sur la **vraie** base de
> production (bootstrap admin désactivé, migrations Prisma applicables).
> Idéal pour un test ponctuel, pas pour un usage quotidien.

---

## 🔄 Mettre à jour le déploiement

```bash
cd ~/audit
git pull
docker compose up -d --build      # --build obligatoire (pas de cache périmé)
```

**Revenir en arrière (rollback)** :

```bash
cd ~/audit
git log --oneline -5
git checkout <ancien-commit>      # ou git revert
sudo docker compose up -d --build
```

---

## ✅ Checklist finale (top 1 %)

- [ ] `docker ps` fonctionne sans `sudo` (ou toutes les commandes en `sudo`)
- [ ] `docker compose ps` → 3 conteneurs `Up` : `audit-db`, `audit-api`, `audit-web`
- [ ] `curl http://localhost/api/v1/health` → `{"status":"ok",...}`
- [ ] `curl -I http://localhost/audit` → `200` (page de connexion)
- [ ] Connexion admin OK sur **http://<IP>/audit**
- [ ] `SA_PASSWORD` identique dans `.env` et à la restauration
- [ ] Le `.bak` d'origine est conservé en sécurité (hors serveur)

---

## ⚠️ Les points importants (à comprendre)

1. **C'est une COPIE, pas une synchronisation.** La base locale ne sera pas
   automatiquement mise à jour avec la prod. Pour « rafraîchir », refais les
   étapes 3 → 5 (nouveau `.bak`, nouvelle restauration).
2. **`SA_PASSWORD` doit être le même partout** : `.env`, étape 5, et variable
   `${SA_PASSWORD}` du compose. L'API l'utilise aussi pour les migrations au
   démarrage.
3. **Base locale vs externe** : par défaut on utilise la base **locale** dans
   Docker (`docker-compose.yml` seul → `make up`). La base **externe** passe
   par l'override `docker-compose.external-db.yml` (section bascule).
4. **Restauration = remplace la base locale si elle existe** (le script la
   supprime d'abord). Sans danger : c'est la copie de travail.
5. **Les conteneurs ne conservent pas les données par magie** : la base vit
   dans le volume `sqlserver_data` de Docker. Pour sauvegarder la base du
   conteneur, pointe `DATABASE_URL` sur le conteneur puis lance
   `make backup:now` — cf. `backup/README.md`.
6. **Mémoire partagée de l'API** : `shm_size: 1gb` est configuré pour
   Chromium/Puppeteer (rendu PDF). Si les PDF ne se génèrent pas, vérifie ce
   réglage (déjà en place dans `docker-compose.yml`).
