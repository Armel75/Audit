import { Request, Response } from 'express';
import prisma from '@audit/database';

// ================= DEPARTMENTS =================
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const departments = await prisma.department.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    });
    res.json(departments);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération des départements: ' + error.message });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const { name, code } = req.body;
    const department = await prisma.department.create({
      data: { tenantId, name, code }
    });
    res.status(201).json(department);
  } catch (error: any) {
    res.status(400).json({ error: 'Erreur lors de la création du département (Code potentiellement dupliqué)' });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, code } = req.body;
    
    const department = await prisma.department.update({
      where: { id },
      data: { name, code }
    });
    res.json(department);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.department.delete({ where: { id } });
    res.json({ message: 'Département supprimé avec succès' });
  } catch (error: any) {
    res.status(400).json({ error: 'Impossible de supprimer ce département (des éléments y sont probablement rattachés)' });
  }
};

// ================= USER DEPARTMENTS =================
export const getUserDepartments = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const userDepartments = await prisma.userDepartment.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        department: { select: { id: true, name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(userDepartments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createUserDepartment = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const { userId, departmentId, isPrimary, startDate, endDate } = req.body;
    
    const userDepartment = await prisma.userDepartment.create({
      data: {
        tenantId,
        userId: parseInt(userId, 10),
        departmentId: parseInt(departmentId, 10),
        isPrimary: isPrimary || false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      }
    });
    res.status(201).json(userDepartment);
  } catch (error: any) {
    res.status(400).json({ error: 'Erreur lors de l\'affectation de l\'utilisateur au département (déjà affecté ?)' });
  }
};

export const updateUserDepartment = async (req: Request, res: Response) => {
  try {
    const { userId, departmentId } = req.params;
    const { isPrimary, startDate, endDate } = req.body;
    
    const userDepartment = await prisma.userDepartment.update({
      where: {
        userId_departmentId: {
          userId: parseInt(userId, 10),
          departmentId: parseInt(departmentId, 10)
        }
      },
      data: {
        isPrimary: isPrimary ?? false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      }
    });
    res.json(userDepartment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteUserDepartment = async (req: Request, res: Response) => {
  try {
    const { userId, departmentId } = req.params;
    await prisma.userDepartment.delete({
      where: {
        userId_departmentId: {
          userId: parseInt(userId, 10),
          departmentId: parseInt(departmentId, 10)
        }
      }
    });
    res.json({ message: 'Affectation supprimée avec succès' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ================= AUDIT TYPES =================
export const getAuditTypes = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const auditTypes = await prisma.auditType.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    });
    res.json(auditTypes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createAuditType = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const { name } = req.body;
    const auditType = await prisma.auditType.create({
      data: { tenantId, name }
    });
    res.status(201).json(auditType);
  } catch (error: any) {
    res.status(400).json({ error: 'Erreur de création (Nom potentiellement dupliqué)' });
  }
};

export const updateAuditType = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;
    const auditType = await prisma.auditType.update({
      where: { id },
      data: { name }
    });
    res.json(auditType);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteAuditType = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.auditType.delete({ where: { id } });
    res.json({ message: 'Type d\'audit supprimé avec succès' });
  } catch (error: any) {
    res.status(400).json({ error: 'Impossible de supprimer ce type d\'audit' });
  }
};

// ================= RISK LEVELS =================
export const getRiskLevels = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const riskLevels = await prisma.riskLevel.findMany({
      where: { tenantId },
      orderBy: { level: 'asc' }
    });
    res.json(riskLevels);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createRiskLevel = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const { name, color, level } = req.body;
    const riskLevel = await prisma.riskLevel.create({
      data: { tenantId, name, color, level: parseInt(level, 10) }
    });
    res.status(201).json(riskLevel);
  } catch (error: any) {
    res.status(400).json({ error: 'Erreur de création (Nom ou Niveau potentiellement dupliqué)' });
  }
};

export const updateRiskLevel = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, color, level } = req.body;
    const riskLevel = await prisma.riskLevel.update({
      where: { id },
      data: { name, color, level: parseInt(level, 10) }
    });
    res.json(riskLevel);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteRiskLevel = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.riskLevel.delete({ where: { id } });
    res.json({ message: 'Niveau de risque supprimé avec succès' });
  } catch (error: any) {
    res.status(400).json({ error: 'Impossible de supprimer ce niveau de risque' });
  }
};

// ================= PRIORITY LEVELS =================
export const getPriorityLevels = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const priorityLevels = await prisma.priorityLevel.findMany({
      where: { tenantId },
      orderBy: { level: 'asc' }
    });
    res.json(priorityLevels);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createPriorityLevel = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const { name, level } = req.body;
    const priorityLevel = await prisma.priorityLevel.create({
      data: { tenantId, name, level: parseInt(level, 10) }
    });
    res.status(201).json(priorityLevel);
  } catch (error: any) {
    res.status(400).json({ error: 'Erreur de création (Nom ou Niveau potentiellement dupliqué)' });
  }
};

export const updatePriorityLevel = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, level } = req.body;
    const priorityLevel = await prisma.priorityLevel.update({
      where: { id },
      data: { name, level: parseInt(level, 10) }
    });
    res.json(priorityLevel);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deletePriorityLevel = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.priorityLevel.delete({ where: { id } });
    res.json({ message: 'Niveau de priorité supprimé avec succès' });
  } catch (error: any) {
    res.status(400).json({ error: 'Impossible de supprimer ce niveau de priorité' });
  }
};
