import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAuditPrograms = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required' });

    const { missionId } = req.query;

    const programs = await prisma.auditProgram.findMany({
      where: {
        tenantId,
        ...(missionId ? { missionId: Number(missionId) } : {})
      },
      include: {
        mission: {
          select: { id: true, title: true, status: true }
        },
        preparedBy: {
          select: { id: true, firstName: true, lastName: true }
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true }
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true }
        },
        _count: {
          select: { procedures: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(programs);
  } catch (error) {
    console.error('Error fetching audit programs:', error);
    res.status(500).json({ error: 'Failed to fetch audit programs' });
  }
};

export const getAuditProgramById = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required' });

    const program = await prisma.auditProgram.findFirst({
      where: { id: Number(id), tenantId },
      include: {
        mission: {
          select: { id: true, title: true, status: true }
        },
        preparedBy: {
          select: { id: true, firstName: true, lastName: true }
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true }
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true }
        },
        procedures: {
          include: {
            performedBy: {
              select: { id: true, firstName: true, lastName: true }
            }
          },
          orderBy: { sequenceNo: 'asc' }
        }
      }
    });

    if (!program) {
      return res.status(404).json({ error: 'Audit program not found' });
    }

    res.json(program);
  } catch (error) {
    console.error('Error fetching audit program:', error);
    res.status(500).json({ error: 'Failed to fetch audit program' });
  }
};

export const createAuditProgram = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(400).json({ error: 'Tenant ID and User ID are required' });

    const {
      missionId,
      title,
      objective,
      scopeDescription,
      methodology,
      auditCriteria,
      samplingApproach
    } = req.body;

    if (!missionId || !title) {
      return res.status(400).json({ error: 'Mission ID and title are required' });
    }

    // Check if mission exists and belongs to tenant
    const mission = await prisma.auditMission.findFirst({
      where: { id: Number(missionId), tenantId }
    });

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const program = await prisma.auditProgram.create({
      data: {
        tenantId,
        missionId: Number(missionId),
        title,
        objective,
        scopeDescription,
        methodology,
        auditCriteria,
        samplingApproach,
        status: 'DRAFT',
        preparedById: userId
      }
    });

    res.status(201).json(program);
  } catch (error) {
    console.error('Error creating audit program:', error);
    res.status(500).json({ error: 'Failed to create audit program' });
  }
};

export const updateAuditProgram = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required' });

    const {
      title,
      objective,
      scopeDescription,
      methodology,
      auditCriteria,
      samplingApproach,
      status
    } = req.body;

    const program = await prisma.auditProgram.findFirst({
      where: { id: Number(id), tenantId }
    });

    if (!program) {
      return res.status(404).json({ error: 'Audit program not found' });
    }

    const updatedProgram = await prisma.auditProgram.update({
      where: { id: Number(id) },
      data: {
        title,
        objective,
        scopeDescription,
        methodology,
        auditCriteria,
        samplingApproach,
        status
      }
    });

    res.json(updatedProgram);
  } catch (error) {
    console.error('Error updating audit program:', error);
    res.status(500).json({ error: 'Failed to update audit program' });
  }
};

export const deleteAuditProgram = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required' });

    const program = await prisma.auditProgram.findFirst({
      where: { id: Number(id), tenantId },
      include: {
        _count: {
          select: { procedures: true }
        }
      }
    });

    if (!program) {
      return res.status(404).json({ error: 'Audit program not found' });
    }

    if (program._count.procedures > 0) {
      return res.status(400).json({ error: 'Cannot delete program with associated procedures' });
    }

    await prisma.auditProgram.delete({
      where: { id: Number(id) }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting audit program:', error);
    res.status(500).json({ error: 'Failed to delete audit program' });
  }
};

// --- Audit Procedures ---

export const createAuditProcedure = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { programId } = req.params;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required' });

    const {
      title,
      procedureType,
      description,
      expectedEvidence,
      dueDate,
      performedById,
      sequenceNo
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const program = await prisma.auditProgram.findFirst({
      where: { id: Number(programId), tenantId }
    });

    if (!program) {
      return res.status(404).json({ error: 'Audit program not found' });
    }

    // Determine next sequence number if not provided
    let nextSeq = sequenceNo;
    if (!nextSeq) {
      const lastProc = await prisma.auditProcedure.findFirst({
        where: { programId: Number(programId) },
        orderBy: { sequenceNo: 'desc' }
      });
      nextSeq = lastProc ? lastProc.sequenceNo + 1 : 1;
    }

    const procedure = await prisma.auditProcedure.create({
      data: {
        tenantId,
        programId: Number(programId),
        missionId: program.missionId,
        sequenceNo: nextSeq,
        title,
        procedureType,
        description,
        expectedEvidence,
        dueDate: dueDate ? new Date(dueDate) : null,
        performedById: performedById ? Number(performedById) : null,
        status: 'PENDING'
      }
    });

    res.status(201).json(procedure);
  } catch (error) {
    console.error('Error creating audit procedure:', error);
    res.status(500).json({ error: 'Failed to create audit procedure' });
  }
};

export const updateAuditProcedure = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { procedureId } = req.params;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required' });

    const {
      title,
      procedureType,
      description,
      expectedEvidence,
      dueDate,
      performedById,
      sequenceNo,
      status,
      actualResult,
      conclusion
    } = req.body;

    const procedure = await prisma.auditProcedure.findFirst({
      where: { id: Number(procedureId), tenantId }
    });

    if (!procedure) {
      return res.status(404).json({ error: 'Audit procedure not found' });
    }

    const updatedProcedure = await prisma.auditProcedure.update({
      where: { id: Number(procedureId) },
      data: {
        title,
        procedureType,
        description,
        expectedEvidence,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        performedById: performedById ? Number(performedById) : undefined,
        sequenceNo,
        status,
        actualResult,
        conclusion
      }
    });

    res.json(updatedProcedure);
  } catch (error) {
    console.error('Error updating audit procedure:', error);
    res.status(500).json({ error: 'Failed to update audit procedure' });
  }
};

export const deleteAuditProcedure = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { procedureId } = req.params;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID is required' });

    const procedure = await prisma.auditProcedure.findFirst({
      where: { id: Number(procedureId), tenantId }
    });

    if (!procedure) {
      return res.status(404).json({ error: 'Audit procedure not found' });
    }

    await prisma.auditProcedure.delete({
      where: { id: Number(procedureId) }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting audit procedure:', error);
    res.status(500).json({ error: 'Failed to delete audit procedure' });
  }
};
