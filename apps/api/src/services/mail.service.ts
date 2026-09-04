import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM;

const transporter: Transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  tls: {
    rejectUnauthorized: false,
  },
});

/** Échappe le HTML pour éviter toute casse du template ou injection. */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Envoi générique (from configuré via env). */
export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  await transporter.sendMail({ from: EMAIL_FROM, to, subject, html });
};

export const sendResetEmail = async (to: string, link: string) => {
  await sendEmail({
    to,
    subject: "Réinitialisation du mot de passe",
    html: `
      <p>Réinitialisation du mot de passe</p>
      <a href="${link}">Clique ici</a>
      <p>Expire dans 15 minutes</p>
    `,
  });
};

/** Email premium pour les notifications d'actions majeures. */
export const sendNotificationEmail = async ({
  to,
  title,
  message,
  ctaLabel,
  ctaUrl,
}: {
  to: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) => {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const cta =
    ctaLabel && ctaUrl
      ? `<a href="${escapeHtml(
          ctaUrl
        )}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${escapeHtml(
          ctaLabel
        )}</a>`
      : "";

  await sendEmail({
    to,
    subject: `SISAR Audit — ${safeTitle}`,
    html: `
      <!DOCTYPE html>
      <html lang="fr">
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0;">
              <span style="color:#34d399;font-size:18px;font-weight:700;">SISAR Audit</span>
            </div>
            <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 12px 12px;">
              <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">${safeTitle}</h2>
              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">${safeMessage}</p>
              ${cta}
            </div>
            <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">SISAR Audit — Gestion des missions d'audit</p>
          </div>
        </body>
      </html>
    `,
  });
};

/** Rappel hebdomadaire des éléments en retard (missions + recommandations).
 *  Regroupe tout dans un seul mail par destinataire.
 *  Contenu : titre de mission + lien portail UNIQUEMENT — aucune donnée sensible. */
export const sendOverdueAlertEmail = async ({
  to,
  pilotName,
  missions,
  recommendations,
  appUrl,
}: {
  to: string;
  pilotName: string;
  missions: Array<{ id: number; title: string; endDate: Date }>;
  recommendations: Array<{ id: number; title: string; targetDate: Date; missionTitle: string }>;
  appUrl: string;
}) => {
  const safePilotName = escapeHtml(pilotName);
  const missionRows = missions
    .map(
      (m) =>
        `<tr><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;"><a href="${escapeHtml(`${appUrl}/missions/${m.id}`)}" style="color:#0f172a;font-weight:600;">${escapeHtml(m.title)}</a></td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-size:13px;">En retard depuis le ${new Date(m.endDate).toLocaleDateString('fr-FR')}</td></tr>`
    )
    .join('');
  const recoRows = recommendations
    .map(
      (r) =>
        `<tr><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;"><a href="${escapeHtml(`${appUrl}/recommendations/${r.id}`)}" style="color:#0f172a;font-weight:600;">${escapeHtml(r.title)}</a><br><span style="font-size:12px;color:#64748b;">Mission : ${escapeHtml(r.missionTitle)}</span></td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-size:13px;">Echéance dépassée depuis le ${new Date(r.targetDate).toLocaleDateString('fr-FR')}</td></tr>`
    )
    .join('');

  await sendEmail({
    to,
    subject: `[SISAR] Rappel hebdomadaire — ${missions.length} mission(s) et ${recommendations.length} recommandation(s) en retard`,
    html: `
      <!DOCTYPE html>
      <html lang="fr">
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0;">
              <span style="color:#34d399;font-size:18px;font-weight:700;">SISAR Audit</span>
              <span style="color:#94a3b8;font-size:13px;float:right;padding-top:3px;">Rappel hebdomadaire</span>
            </div>
            <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 12px 12px;">
              <h2 style="margin:0 0 8px;color:#0f172a;font-size:18px;">Bonjour ${safePilotName},</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                Vous avez des éléments en retard nécessitant votre attention :
              </p>
              ${
                missions.length > 0
                  ? `
                <h3 style="margin:0 0 10px;color:#dc2626;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Missions en retard</h3>
                <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                  <thead>
                    <tr style="background:#fef2f2;">
                      <th style="padding:8px 14px;text-align:left;font-size:12px;color:#991b1b;font-weight:700;">Mission</th>
                      <th style="padding:8px 14px;text-align:left;font-size:12px;color:#991b1b;font-weight:700;">Délai dépassé</th>
                    </tr>
                  </thead>
                  <tbody>${missionRows}</tbody>
                </table>`
                  : ''
              }
              ${
                recommendations.length > 0
                  ? `
                <h3 style="margin:0 0 10px;color:#dc2626;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Recommandations en retard</h3>
                <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                  <thead>
                    <tr style="background:#fef2f2;">
                      <th style="padding:8px 14px;text-align:left;font-size:12px;color:#991b1b;font-weight:700;">Recommandation</th>
                      <th style="padding:8px 14px;text-align:left;font-size:12px;color:#991b1b;font-weight:700;">Echéance dépassée</th>
                    </tr>
                  </thead>
                  <tbody>${recoRows}</tbody>
                </table>`
                  : ''
              }
              <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
                Cliquez sur un élément ci-dessus pour accéder directement au portail SISAR et mettre à jour son statut.
              </p>
            </div>
            <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">SISAR Audit — Ce mail est envoyé automatiquement chaque semaine.</p>
          </div>
        </body>
      </html>
    `,
  });
};