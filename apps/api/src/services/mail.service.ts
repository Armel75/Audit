import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "192.168.0.247",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

export const sendResetEmail = async (to: string, link: string) => {
  await transporter.sendMail({
    from: '"Support" <support@groupesorepco.com>',
    to,
    subject: "Réinitialisation du mot de passe",
    html: `
      <p>Réinitialisation du mot de passe</p>
      <a href="${link}">Clique ici</a>
      <p>Expire dans 15 minutes</p>
    `
  });
};