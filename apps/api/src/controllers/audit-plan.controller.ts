import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// AUDIT PLAN
// ==========================================

export const getPlans = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const plans = await prisma.auditPlan.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { missions: true, versions: true }
        },
        approvedBy: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { year: 'desc' }
    });
    res.json(plans);
  } catch (error) {
    console.error('Error fetching audit plans:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des plans d\'audit' });
  }
};

export const getPlan = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const plan = await prisma.auditPlan.findFirst({
      where: { id: parseInt(id), tenantId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { createdBy: { select: { firstName: true, lastName: true } } }
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          include: { changedBy: { select: { firstName: true, lastName: true } } }
        },
        approvedBy: { select: { firstName: true, lastName: true } },
        missions: {
          select: { id: true, title: true, status: true }
        }
      }
    });

    if (!plan) return res.status(404).json({ error: 'Plan d\'audit non trouvé' });

    res.json(plan);
  } catch (error) {
    console.error('Error fetching audit plan:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du plan d\'audit' });
  }
};

export const createPlan = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const { year, title, description } = req.body;

    if (!year) {
      return res.status(400).json({ error: 'L\'année est requise' });
    }

    const newPlan = await prisma.$transaction(async (tx) => {
      // Create the plan
      const plan = await tx.auditPlan.create({
        data: {
          tenantId,
          year: parseInt(year),
          title,
          description,
          status: 'DRAFT',
          versionNumber: 1
        }
      });

      // Create initial version
      await tx.auditPlanVersion.create({
        data: {
          tenantId,
          planId: plan.id,
          versionNumber: 1,
          label: 'Version initiale',
          changeSummary: 'Création du plan',
          createdById: userId
        }
      });

      // Create initial status history
      await tx.auditPlanStatusHistory.create({
        data: {
          tenantId,
          planId: plan.id,
          newStatus: 'DRAFT',
          reason: 'Création initiale',
          changedById: userId
        }
      });

      return plan;
    });

    res.status(201).json(newPlan);
  } catch (error: any) {
    console.error('Error creating audit plan:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Un plan d\'audit existe déjà pour cette année' });
    }
    res.status(500).json({ error: 'Erreur lors de la création du plan d\'audit' });
  }
};

export const updatePlan = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const { year, title, description } = req.body;

    const existing = await prisma.auditPlan.findFirst({
      where: { id: parseInt(id), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Plan d\'audit non trouvé' });

    const updated = await prisma.auditPlan.update({
      where: { id: parseInt(id) },
      data: {
        year: year ? parseInt(year) : existing.year,
        title,
        description
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating audit plan:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Un plan d\'audit existe déjà pour cette année' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du plan d\'audit' });
  }
};

export const updatePlanStatus = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Le nouveau statut est requis' });
    }

    const existing = await prisma.auditPlan.findFirst({
      where: { id: parseInt(id), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Plan d\'audit non trouvé' });

    if (existing.status === status) {
      return res.status(400).json({ error: 'Le plan a déjà ce statut' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = { status };
      
      if (status === 'VALIDATED') {
        updateData.approvedAt = new Date();
        updateData.approvedById = userId;
      }

      const plan = await tx.auditPlan.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      await tx.auditPlanStatusHistory.create({
        data: {
          tenantId,
          planId: plan.id,
          previousStatus: existing.status,
          newStatus: status,
          reason: reason || 'Changement de statut',
          changedById: userId
        }
      });

      return plan;
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating audit plan status:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
};

export const deletePlan = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const existing = await prisma.auditPlan.findFirst({
      where: { id: parseInt(id), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Plan d\'audit non trouvé' });

    // Prisma Cascade delete will handle versions and history if configured, 
    // but we should check if there are missions attached to prevent deletion
    const missionsCount = await prisma.auditMission.count({
      where: { planId: parseInt(id) }
    });

    if (missionsCount > 0) {
      return res.status(400).json({ error: 'Impossible de supprimer ce plan car il contient des missions' });
    }

    await prisma.auditPlan.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Plan d\'audit supprimé avec succès' });
  } catch (error: any) {
    console.error('Error deleting audit plan:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du plan d\'audit' });
  }
};

// ==========================================
// AUDIT PLAN STATUS HISTORY
// ==========================================

export const updatePlanStatusHistory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { historyId } = req.params;
    const { reason } = req.body;

    const existing = await prisma.auditPlanStatusHistory.findFirst({
      where: { id: parseInt(historyId), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Historique non trouvé' });

    const updated = await prisma.auditPlanStatusHistory.update({
      where: { id: parseInt(historyId) },
      data: { reason }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating plan status history:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'historique' });
  }
};

export const deletePlanStatusHistory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { historyId } = req.params;

    const existing = await prisma.auditPlanStatusHistory.findFirst({
      where: { id: parseInt(historyId), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Historique non trouvé' });

    await prisma.auditPlanStatusHistory.delete({
      where: { id: parseInt(historyId) }
    });

    res.json({ message: 'Historique supprimé avec succès' });
  } catch (error: any) {
    console.error('Error deleting plan status history:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'historique' });
  }
};

export const updatePlanVersion = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { versionId } = req.params;
    const { label, changeSummary, snapshotNote } = req.body;

    const existing = await prisma.auditPlanVersion.findFirst({
      where: { id: parseInt(versionId), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Version non trouvée' });

    const updated = await prisma.auditPlanVersion.update({
      where: { id: parseInt(versionId) },
      data: { label, changeSummary, snapshotNote }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating plan version:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la version' });
  }
};

export const deletePlanVersion = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { versionId } = req.params;

    const existing = await prisma.auditPlanVersion.findFirst({
      where: { id: parseInt(versionId), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Version non trouvée' });

    await prisma.auditPlanVersion.delete({
      where: { id: parseInt(versionId) }
    });

    res.json({ message: 'Version supprimée avec succès' });
  } catch (error: any) {
    console.error('Error deleting plan version:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la version' });
  }
};

export const createPlanVersion = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params; // planId
    const { label, changeSummary, snapshotNote } = req.body;

    const plan = await prisma.auditPlan.findFirst({
      where: { id: parseInt(id), tenantId }
    });

    if (!plan) return res.status(404).json({ error: 'Plan d\'audit non trouvé' });

    const newVersionNumber = plan.versionNumber + 1;

    const newVersion = await prisma.$transaction(async (tx) => {
      // Update plan version number
      await tx.auditPlan.update({
        where: { id: plan.id },
        data: { versionNumber: newVersionNumber }
      });

      // Create new version record
      return tx.auditPlanVersion.create({
        data: {
          tenantId,
          planId: plan.id,
          versionNumber: newVersionNumber,
          label,
          changeSummary,
          snapshotNote,
          createdById: userId
        }
      });
    });

    res.status(201).json(newVersion);
  } catch (error: any) {
    console.error('Error creating plan version:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la version' });
  }
};
