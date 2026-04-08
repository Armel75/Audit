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
        _count: {
          select: { procedures: true, criteria: true, versions: true }
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
        approvals: {
          where: {
            approvalType: 'PROGRAM_APPROVAL'
          },
          orderBy: { createdAt: 'desc' }
        },
        criteria: {
          orderBy: { createdAt: 'asc' }
        },
        scopes: {
          include: {
            auditableEntity: { select: { id: true, name: true, code: true, entityType: true } },
            businessProcess: { select: { id: true, name: true, code: true } },
            risk: { select: { id: true, name: true, code: true } }
          }
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 10,
          include: {
            changedBy: { select: { id: true, firstName: true, lastName: true } }
          }
        },
        procedures: {
          include: {
            performedBy: { select: { id: true, firstName: true, lastName: true } },
            assignedTo:  { select: { id: true, firstName: true, lastName: true } },
            priority:    { select: { id: true, name: true, level: true } },
            documents:   { select: { id: true, originalName: true, sizeBytes: true, mimeType: true, createdAt: true } }
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
      code,
      title,
      programType,
      objective,
      scopeDescription,
      plannedStartDate,
      plannedEndDate
    } = req.body;

    if (!missionId || !title || !code || !programType) {
      return res.status(400).json({ error: 'Mission ID, code, titre et type de programme sont requis' });
    }

    // Check if mission exists and belongs to tenant
    const mission = await prisma.auditMission.findFirst({
      where: { id: Number(missionId), tenantId }
    });

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    // 🔴 AJOUT — verrouillage cadrage
    if (!['PLANNED', 'READY'].includes(mission.status)) {
      return res.status(400).json({
        error: 'Cadrage verrouillé : mission déjà démarrée'
      });
    }

    // Vérifier unicité du code dans le tenant
    const existingCode = await prisma.auditProgram.findFirst({
      where: { tenantId, code }
    });
    if (existingCode) {
      return res.status(400).json({ error: `Un programme avec le code "${code}" existe déjà` });
    }

    const program = await prisma.$transaction(async (tx) => {
      const prog = await tx.auditProgram.create({
        data: {
          tenantId,
          missionId: Number(missionId),
          code,
          title,
          programType,
          objective,
          scopeDescription,
          plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
          plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
          status: 'DRAFT',
          preparedById: userId
        }
      });

      // Créer la version initiale (v1)
      await tx.auditProgramVersion.create({
        data: {
          tenantId,
          programId: prog.id,
          versionNumber: 1,
          label: 'Version initiale',
          snapshot: JSON.stringify({ title: prog.title, status: prog.status, programType: prog.programType }),
          createdById: userId
        }
      });

      return prog;
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
      programType,
      objective,
      scopeDescription,
      plannedStartDate,
      plannedEndDate,
      progressPercent,
      status
    } = req.body;

    const program = await prisma.auditProgram.findFirst({
      where: { id: Number(id), tenantId }
    });

    if (!program) {
      return res.status(404).json({ error: 'Audit program not found' });
    }

    if (status && status !== program.status) {
      return res.status(400).json({
        error: "Changement de statut interdit via cette route"
      });
    }

    const updatedProgram = await prisma.auditProgram.update({
      where: { id: Number(id) },
      data: {
        title,
        programType,
        objective,
        scopeDescription,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : undefined,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : undefined,
        progressPercent: progressPercent !== undefined ? Number(progressPercent) : undefined,
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
      assignedToId,
      priorityId,
      code,
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

    const mission = await prisma.auditMission.findUnique({
      where: { id: program.missionId }
    });

    if (!mission) {
      return res.status(404).json({ error: 'Mission introuvable' });
    }

    if (!['PLANNED', 'READY'].includes(mission.status)) {
      return res.status(400).json({
        error: 'Cadrage verrouillé : mission déjà démarrée'
      });
    }

    // Résoudre la version active du programme (la plus récente)
    let programVersion = await prisma.auditProgramVersion.findFirst({
      where: { programId: Number(programId) },
      orderBy: { versionNumber: 'desc' }
    });
    if (!programVersion) {
      // Créer automatiquement la version initiale si elle n'existe pas
      programVersion = await prisma.auditProgramVersion.create({
        data: {
          tenantId,
          programId: Number(programId),
          versionNumber: 1,
          label: 'Version initiale',
          snapshot: JSON.stringify({ title: program.title, status: program.status }),
          createdById: tenantId
        }
      });
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
        programVersionId: programVersion.id,
        sequenceNo: nextSeq,
        code: code || null,
        title,
        procedureType: procedureType || null,
        description: description || null,
        expectedEvidence: expectedEvidence || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        performedById: performedById ? Number(performedById) : null,
        assignedToId:  assignedToId  ? Number(assignedToId)  : null,
        priorityId:    priorityId    ? Number(priorityId)    : null,
        status: 'PLANNED'
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
      assignedToId,
      priorityId,
      code,
      sequenceNo,
      status,
      result,
      issueDetected,
      severity,
      reviewStatus,
      reviewComment,
    } = req.body;

    const procedure = await prisma.auditProcedure.findFirst({
      where: { id: Number(procedureId), tenantId }
    });

    if (!procedure) {
      return res.status(404).json({ error: 'Audit procedure not found' });
    }

    const program = await prisma.auditProgram.findFirst({
      where: { id: procedure.programId, tenantId }
    });

    if (!program) {
      return res.status(404).json({ error: 'Programme introuvable' });
    }

    const mission = await prisma.auditMission.findFirst({
      where: { id: program.missionId, tenantId }
    });

    if (!mission) {
      return res.status(404).json({ error: 'Mission introuvable' });
    }

    if (!['PLANNED', 'READY'].includes(mission.status)) {
      return res.status(400).json({
        error: 'Modification interdite : mission déjà démarrée'
      });
    }

    const updatedProcedure = await prisma.auditProcedure.update({
      where: { id: Number(procedureId) },
      data: {
        title,
        code:             code             ?? undefined,
        procedureType:   procedureType    ?? undefined,
        description:     description      ?? undefined,
        expectedEvidence:expectedEvidence ?? undefined,
        dueDate:         dueDate          ? new Date(dueDate) : undefined,
        performedById:   performedById    ? Number(performedById)  : undefined,
        assignedToId:    assignedToId     ? Number(assignedToId)   : undefined,
        priorityId:      priorityId       ? Number(priorityId)     : undefined,
        sequenceNo,
        status,
        result:          result           ?? undefined,
        issueDetected:   issueDetected    !== undefined ? Boolean(issueDetected) : undefined,
        severity:        severity         ?? undefined,
        reviewStatus:    reviewStatus     ?? undefined,
        reviewComment:   reviewComment    ?? undefined,
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
