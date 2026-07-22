import { Request, Response } from 'express';
const prisma = require('@audit/database').default;

// ==========================================
// AUDITABLE ENTITY
// ==========================================
export const getAuditableEntities = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const entities = await prisma.auditableEntity.findMany({
      where: { tenantId },
      include: {
        parent: { select: { name: true } },
        ownerDepartment: { select: { name: true } },
        managerUser: { select: { firstName: true, lastName: true } }
      },
      orderBy: { code: 'asc' }
    });
    res.json(entities);
  } catch (error) {
    console.error('Error fetching auditable entities:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des entités auditables' });
  }
};

export const createAuditableEntity = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { code, name, entityType, description, criticality, isActive, parentId, ownerDepartmentId, managerUserId } = req.body;

    if (!code || !name || !entityType) {
      return res.status(400).json({ error: 'Code, nom et type d\'entité sont requis' });
    }

    const newEntity = await prisma.auditableEntity.create({
      data: {
        tenantId,
        code,
        name,
        entityType,
        description,
        criticality,
        isActive: isActive !== undefined ? isActive : true,
        parentId: parentId ? parseInt(parentId) : null,
        ownerDepartmentId: ownerDepartmentId ? parseInt(ownerDepartmentId) : null,
        managerUserId: managerUserId ? parseInt(managerUserId) : null,
      }
    });
    res.status(201).json(newEntity);
  } catch (error: any) {
    console.error('Error creating auditable entity:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ce code d\'entité existe déjà pour ce tenant' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de l\'entité auditable' });
  }
};

export const updateAuditableEntity = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const { code, name, entityType, description, criticality, isActive, parentId, ownerDepartmentId, managerUserId } = req.body;

    const existing = await prisma.auditableEntity.findFirst({
      where: { id: parseInt(id), tenantId }
    });
    if (!existing) return res.status(404).json({ error: 'Entité auditable non trouvée' });

    const updated = await prisma.auditableEntity.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        entityType,
        description,
        criticality,
        isActive,
        parentId: parentId ? parseInt(parentId) : null,
        ownerDepartmentId: ownerDepartmentId ? parseInt(ownerDepartmentId) : null,
        managerUserId: managerUserId ? parseInt(managerUserId) : null,
      }
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating auditable entity:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ce code d\'entité existe déjà pour ce tenant' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'entité auditable' });
  }
};

export const deleteAuditableEntity = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const existing = await prisma.auditableEntity.findFirst({
      where: { id: parseInt(id), tenantId }
    });
    if (!existing) return res.status(404).json({ error: 'Entité auditable non trouvée' });

    await prisma.auditableEntity.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Entité auditable supprimée avec succès' });
  } catch (error: any) {
    console.error('Error deleting auditable entity:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Impossible de supprimer cette entité car elle est utilisée ailleurs' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'entité auditable' });
  }
};

// ==========================================
// BUSINESS PROCESS
// ==========================================
export const getBusinessProcesses = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const processes = await prisma.businessProcess.findMany({
      where: { tenantId },
      include: {
        auditableEntity: { select: { name: true } },
        ownerDepartment: { select: { name: true } }
      },
      orderBy: { code: 'asc' }
    });
    res.json(processes);
  } catch (error) {
    console.error('Error fetching business processes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des processus métiers' });
  }
};

export const createBusinessProcess = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { code, name, description, isActive, auditableEntityId, ownerDepartmentId } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code et nom sont requis' });
    }

    const newProcess = await prisma.businessProcess.create({
      data: {
        tenantId,
        code,
        name,
        description,
        isActive: isActive !== undefined ? isActive : true,
        auditableEntityId: auditableEntityId ? parseInt(auditableEntityId) : null,
        ownerDepartmentId: ownerDepartmentId ? parseInt(ownerDepartmentId) : null,
      }
    });
    res.status(201).json(newProcess);
  } catch (error: any) {
    console.error('Error creating business process:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ce code de processus existe déjà pour ce tenant' });
    }
    res.status(500).json({ error: 'Erreur lors de la création du processus métier' });
  }
};

export const updateBusinessProcess = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const { code, name, description, isActive, auditableEntityId, ownerDepartmentId } = req.body;

    const existing = await prisma.businessProcess.findFirst({
      where: { id: parseInt(id), tenantId }
    });
    if (!existing) return res.status(404).json({ error: 'Processus métier non trouvé' });

    const updated = await prisma.businessProcess.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        description,
        isActive,
        auditableEntityId: auditableEntityId ? parseInt(auditableEntityId) : null,
        ownerDepartmentId: ownerDepartmentId ? parseInt(ownerDepartmentId) : null,
      }
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating business process:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ce code de processus existe déjà pour ce tenant' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du processus métier' });
  }
};

export const deleteBusinessProcess = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const existing = await prisma.businessProcess.findFirst({
      where: { id: parseInt(id), tenantId }
    });
    if (!existing) return res.status(404).json({ error: 'Processus métier non trouvé' });

    await prisma.businessProcess.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Processus métier supprimé avec succès' });
  } catch (error: any) {
    console.error('Error deleting business process:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Impossible de supprimer ce processus car il est utilisé ailleurs' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression du processus métier' });
  }
};

// ==========================================
// CONTROL
// ==========================================
export const getControls = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const controls = await prisma.control.findMany({
      where: { tenantId },
      include: {
        businessProcess: { select: { name: true } },
        ownerDepartment: { select: { name: true } }
      },
      orderBy: { code: 'asc' }
    });
    res.json(controls);
  } catch (error) {
    console.error('Error fetching controls:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des contrôles' });
  }
};

export const createControl = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { code, name, description, controlType, frequency, isKey, isAutomated, isActive, businessProcessId, ownerDepartmentId } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code et nom sont requis' });
    }

    const newControl = await prisma.control.create({
      data: {
        tenantId,
        code,
        name,
        description,
        controlType,
        frequency,
        isKey: isKey !== undefined ? isKey : false,
        isAutomated: isAutomated !== undefined ? isAutomated : false,
        isActive: isActive !== undefined ? isActive : true,
        businessProcessId: businessProcessId ? parseInt(businessProcessId) : null,
        ownerDepartmentId: ownerDepartmentId ? parseInt(ownerDepartmentId) : null,
      }
    });
    res.status(201).json(newControl);
  } catch (error: any) {
    console.error('Error creating control:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ce code de contrôle existe déjà pour ce tenant' });
    }
    res.status(500).json({ error: 'Erreur lors de la création du contrôle' });
  }
};

export const updateControl = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const { code, name, description, controlType, frequency, isKey, isAutomated, isActive, businessProcessId, ownerDepartmentId } = req.body;

    const existing = await prisma.control.findFirst({
      where: { id: parseInt(id), tenantId }
    });
    if (!existing) return res.status(404).json({ error: 'Contrôle non trouvé' });

    const updated = await prisma.control.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        description,
        controlType,
        frequency,
        isKey,
        isAutomated,
        isActive,
        businessProcessId: businessProcessId ? parseInt(businessProcessId) : null,
        ownerDepartmentId: ownerDepartmentId ? parseInt(ownerDepartmentId) : null,
      }
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating control:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ce code de contrôle existe déjà pour ce tenant' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du contrôle' });
  }
};

export const deleteControl = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const existing = await prisma.control.findFirst({
      where: { id: parseInt(id), tenantId }
    });
    if (!existing) return res.status(404).json({ error: 'Contrôle non trouvé' });

    await prisma.control.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Contrôle supprimé avec succès' });
  } catch (error: any) {
    console.error('Error deleting control:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Impossible de supprimer ce contrôle car il est utilisé ailleurs' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression du contrôle' });
  }
};

// ==========================================
// RISK
// ==========================================
export const getRisks = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const risks = await prisma.risk.findMany({
      where: { tenantId },
      include: {
        businessProcess: { select: { name: true } },
        auditableEntity: { select: { name: true } },
        ownerDepartment: { select: { name: true } }
      },
      orderBy: { code: 'asc' }
    });
    res.json(risks);
  } catch (error) {
    console.error('Error fetching risks:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des risques' });
  }
};

export const createRisk = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { code, name, description, category, inherentImpact, inherentLikelihood, isActive, businessProcessId, auditableEntityId, ownerDepartmentId } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code et nom sont requis' });
    }

    const newRisk = await prisma.risk.create({
      data: {
        tenantId,
        code,
        name,
        description,
        category,
        inherentImpact: inherentImpact ? parseInt(inherentImpact) : null,
        inherentLikelihood: inherentLikelihood ? parseInt(inherentLikelihood) : null,
        isActive: isActive !== undefined ? isActive : true,
        businessProcessId: businessProcessId ? parseInt(businessProcessId) : null,
        auditableEntityId: auditableEntityId ? parseInt(auditableEntityId) : null,
        ownerDepartmentId: ownerDepartmentId ? parseInt(ownerDepartmentId) : null,
      }
    });
    res.status(201).json(newRisk);
  } catch (error: any) {
    console.error('Error creating risk:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ce code de risque existe déjà pour ce tenant' });
    }
    res.status(500).json({ error: 'Erreur lors de la création du risque' });
  }
};

export const updateRisk = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const { code, name, description, category, inherentImpact, inherentLikelihood, isActive, businessProcessId, auditableEntityId, ownerDepartmentId } = req.body;

    const existing = await prisma.risk.findFirst({
      where: { id: parseInt(id), tenantId }
    });
    if (!existing) return res.status(404).json({ error: 'Risque non trouvé' });

    const updated = await prisma.risk.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        description,
        category,
        inherentImpact: inherentImpact ? parseInt(inherentImpact) : null,
        inherentLikelihood: inherentLikelihood ? parseInt(inherentLikelihood) : null,
        isActive,
        businessProcessId: businessProcessId ? parseInt(businessProcessId) : null,
        auditableEntityId: auditableEntityId ? parseInt(auditableEntityId) : null,
        ownerDepartmentId: ownerDepartmentId ? parseInt(ownerDepartmentId) : null,
      }
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating risk:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ce code de risque existe déjà pour ce tenant' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du risque' });
  }
};

export const deleteRisk = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const existing = await prisma.risk.findFirst({
      where: { id: parseInt(id), tenantId }
    });
    if (!existing) return res.status(404).json({ error: 'Risque non trouvé' });

    await prisma.risk.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Risque supprimé avec succès' });
  } catch (error: any) {
    console.error('Error deleting risk:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Impossible de supprimer ce risque car il est utilisé ailleurs' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression du risque' });
  }
};

// ==========================================
// RISK CONTROL
// ==========================================
export const getRiskControls = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const riskControls = await prisma.riskControl.findMany({
      where: { tenantId },
      include: {
        risk: { select: { code: true, name: true } },
        control: { select: { code: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(riskControls);
  } catch (error) {
    console.error('Error fetching risk controls:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des associations risque-contrôle' });
  }
};

export const createRiskControl = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { riskId, controlId, designEffectiveness, operatingEffectiveness } = req.body;

    if (!riskId || !controlId) {
      return res.status(400).json({ error: 'Le risque et le contrôle sont requis' });
    }

    const newRiskControl = await prisma.riskControl.create({
      data: {
        tenantId,
        riskId: parseInt(riskId),
        controlId: parseInt(controlId),
        designEffectiveness,
        operatingEffectiveness,
      }
    });
    res.status(201).json(newRiskControl);
  } catch (error: any) {
    console.error('Error creating risk control:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Cette association risque-contrôle existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de l\'association risque-contrôle' });
  }
};

export const updateRiskControl = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const { riskId, controlId, designEffectiveness, operatingEffectiveness } = req.body;

    const existing = await prisma.riskControl.findFirst({
      where: { id: parseInt(id), tenantId }
    });
    if (!existing) return res.status(404).json({ error: 'Association risque-contrôle non trouvée' });

    const updated = await prisma.riskControl.update({
      where: { id: parseInt(id) },
      data: {
        riskId: riskId ? parseInt(riskId) : existing.riskId,
        controlId: controlId ? parseInt(controlId) : existing.controlId,
        designEffectiveness,
        operatingEffectiveness,
      }
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating risk control:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Cette association risque-contrôle existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'association risque-contrôle' });
  }
};

export const deleteRiskControl = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const existing = await prisma.riskControl.findFirst({
      where: { id: parseInt(id), tenantId }
    });
    if (!existing) return res.status(404).json({ error: 'Association risque-contrôle non trouvée' });

    await prisma.riskControl.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Association risque-contrôle supprimée avec succès' });
  } catch (error: any) {
    console.error('Error deleting risk control:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'association risque-contrôle' });
  }
};
