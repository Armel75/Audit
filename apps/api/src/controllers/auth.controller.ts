import { AuthService  } from "../services/auth.service";
import { sendResetEmail } from "../services/mail.service"; // à créer
import { Request, Response } from 'express';

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email requis" });
    }

    const result = await AuthService.forgotPassword(email);
    const FRONT_URL = process.env.WEB_ORIGIN;

    if (result && FRONT_URL) {
      try {
        const resetLink = `${FRONT_URL}/audit/reset-password?token=${result.token}`;
        await sendResetEmail(result.email, resetLink);
      } catch (e) {
        console.error("Email error:", e);
      }
    }

    // 🔒 Toujours même réponse (sécurité)
    return res.json({
      message: "Si l'email existe, un lien a été envoyé"
    });

  } catch (error: any) {
    return res.status(500).json({
      error: "Erreur serveur"
    });
  }
};


export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: "Token et nouveau mot de passe requis"
      });
    }

    await AuthService.resetPassword(token, newPassword);

    return res.json({
      message: "Mot de passe mis à jour"
    });

  } catch (error: any) {
    if (error.message === "WEAK_PASSWORD") {
      return res.status(400).json({
        error: "Mot de passe trop faible"
      });
    }

    return res.status(400).json({
      error: "Token invalide ou expiré"
    });
  }
};