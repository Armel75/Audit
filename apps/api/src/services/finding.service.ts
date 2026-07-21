const prisma = require('@audit/database').default;

import { Prisma } from '@prisma/client';
import { findingWorkflow } from './workflow/finding.workflow';

const canTransition = (current: string, next: string) => {
  return findingWorkflow[current]?.includes(next);
};

export class FindingService {
  static async getByMissionId(missionId: number) {
    return prisma.finding.findMany({
      where: { missionId },
      include: {
        riskLevel: true,
        author: {
          select: { firstName: true, lastName: true }
        },
        validator: {
          select: { firstName: true, lastName: true }
        },
        comments: {
          include: {
            author: {
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        documents: true,
        recos: {
          select: { id: true, title: true, status: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  static async getById(id: number) {
    const finding = await prisma.finding.findUnique({
      where: { id },
      include: {
        riskLevel: true,
        mission: {
          select: { id: true, title: true, status: true }
        },
        author: {
          select: { firstName: true, lastName: true }
        },
        validator: {
          select: { firstName: true, lastName: true }
        },
        comments: {
          include: {
            author: {
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        documents: true,
        recos: {
          include: {
            priority: true,
            department: true
          }
        }
      }
    });
    if (!finding) throw new Error('Finding not found');
    return finding;
  }

  static async create(data: {
    title: string;
    description: string;
    riskLevelId?: string;
    process?: string;
    cause?: string;
    impact?: string;
    missionId: string;
    authorId: string;
  }) {
    return prisma.finding.create({
      data: {
        title: data.title,
        description: data.description,
        status: 'DRAFT',

        missionId: Number(data.missionId),
        authorId: Number(data.authorId),

        ...(data.riskLevelId && {
          riskLevelId: Number(data.riskLevelId)
        }),
        ...(data.process && { process: data.process }),
        ...(data.cause && { cause: data.cause }),
        ...(data.impact && { impact: data.impact })
      },
      include: {
        riskLevel: true,
        author: {
          select: { firstName: true, lastName: true }
        }
      }
    });
  }

  static async update(id: number, data: {
    title?: string;
    description?: string;
    riskLevelId?: string;
    process?: string;
    cause?: string;
    impact?: string;
  }) {

    // 🔴 AJOUT — verrouillage après validation
    const finding = await prisma.finding.findUnique({
      where: { id }
    });

    if (!finding) throw new Error('Finding not found');

    if (finding.status === 'VALIDATED') {
      throw new Error('Modification interdite après validation');
    }

    return prisma.finding.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.process && { process: data.process }),
        ...(data.cause && { cause: data.cause }),
        ...(data.impact && { impact: data.impact }),
        ...(data.riskLevelId && {
          riskLevelId: Number(data.riskLevelId)
        })
      },
      include: {
        riskLevel: true
      }
    });
  }

  static async updateStatus(id: number, status: string, userId: number, tenantId: number) {
    const existing = await prisma.finding.findFirst({
      where: { id, tenantId }
    });

    if (!existing) throw new Error('Finding not found');

    // 🔴 WORKFLOW
    if (!canTransition(existing.status, status)) {
      throw new Error(`Transition interdite: ${existing.status} → ${status}`);
    }

    // 🔴 APPROVAL obligatoire
    if (status === 'CONFIRMED') {
      const approval = await prisma.approval.findFirst({
        where: {
          findingId: id,
          decision: 'APPROVED'
        }
      });

      if (!approval) {
        throw new Error('Validation requise');
      }
    }

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.finding.update({
        where: { id },
        data: { status }
      });

      await tx.findingStatusHistory.create({
        data: {
          tenantId,
          findingId: id,
          previousStatus: existing.status,
          newStatus: status,
          reason: 'Workflow update',
          changedById: userId
        }
      });
    });
  }

  static async delete(id: number) {
    return prisma.finding.delete({
      where: { id }
    });
  }

  static async addComment(findingId: number, authorId: number, content: string) {
    return prisma.findingComment.create({
      data: {
        content,
        findingId,
        authorId
      },
      include: {
        author: {
          select: { firstName: true, lastName: true }
        }
      }
    });
  }

  // Récupère les findings d'une mission avec filtres premium
  static async getByMissionIdWithFilters(missionId: number, filters: any) {
    return prisma.finding.findMany({
      where: {
        missionId,
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { createdAt: { gte: filters.startDate } }),
        ...(filters.endDate && { createdAt: { lte: filters.endDate } }),
        ...(filters.keyword && { OR: [
          { title: { contains: filters.keyword, mode: 'insensitive' } },
          { description: { contains: filters.keyword, mode: 'insensitive' } }
        ] })
      },
      include: {
        riskLevel: true,
        author: { select: { firstName: true, lastName: true } },
        validator: { select: { firstName: true, lastName: true } },
        comments: {
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' }
        },
        documents: true,
        recos: { select: { id: true, title: true, status: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
  }
}