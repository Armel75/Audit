import { Request, Response } from 'express';

const prisma = require('@audit/database').default;

export const updateMissionConclusion = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const { conclusion } = req.body;

    if (conclusion === undefined || conclusion === null) {
      return res.status(400).json({ error: 'Conclusion requise' });
    }

    const existing = await prisma.auditMission.findFirst({
      where: { id: parseInt(id), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Mission non trouvée' });

    const updated = await prisma.auditMission.update({
      where: { id: parseInt(id) },
      data: { conclusion }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating mission conclusion:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la conclusion' });
  }
};

