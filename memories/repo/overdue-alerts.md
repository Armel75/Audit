# Overdue Alerts — Système d'alertes mail hebdomadaires

## Fonctionnalité

Chaque semaine, un cron envoie un mail de rappel aux pilotes de missions en retard
et au chef d'audit (adresse fixe configurée).

## Implémentation

- **Fichier** : `apps/api/src/cron/overdueAlerts.cron.ts`
- **Envoi** : `apps/api/src/services/mail.service.ts` → `sendOverdueAlertEmail()`
- **Enregistrement** : `apps/api/src/server.ts` → `startOverdueAlertsCron()`

## Régles métier

| Règle | Détail |
|-------|--------|
| Fréquence | Hebdomadaire, jour + heure configurables |
| Déclenchement | J+5 après la date de fin (missions) / date cible (recommandations) |
| Grace days | `ALERT_GRACE_DAYS` (défaut 5) |
| Missions | en retard si `endDate < today - graceDays` ET status ∉ COMPLETED/ARCHIVED |
| Recos | en retard si `targetDate < today - graceDays` ET status ∉ CLOSED/CANCELLED |
| Destinataires | Pilote de mission (leader) + assignee de la reco (priorité) |
| Copie | Chef d'audit si `ALERT_CHEF_AUDIT_EMAIL` configuré |
| Idempotence | Set en mémoire — 1 mail/destinataire/semaine (pas de BDD) |
| Fuseau horaire | `Africa/Douala` (UTC+1, SOREPCO) |

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `ALERT_CHEF_AUDIT_EMAIL` | — | Email du chef d'audit (copie obligatoire) |
| `ALERT_CRON_DAY` | 1 | Jour d'envoi (0=dimanche … 6=samedi) |
| `ALERT_CRON_HOUR` | 8 | Heure d'envoi (0–23) |
| `ALERT_GRACE_DAYS` | 5 | Jours de grâce avant alerte |

## Schéma Prisma utilisé

- `AuditMission.endDate`, `AuditMission.status`, `AuditMission.leader`
- `Recommendation.targetDate`, `Recommendation.status`, `Recommendation.assigneeUser`
- `Finding.missionId` → `AuditMission.leader`

## Email

- Objet : `[SISAR] Rappel hebdomadaire — X mission(s) et Y recommandation(s) en retard`
- Contenu : tableau missions (titre + "En retard depuis" + date rouge) + tableau recommandations
- CTA : "Accéder au portail" → lien basé sur `WEB_APP_URL`
