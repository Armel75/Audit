import prisma from '@audit/database';

export class RecommendationService {

  static async getByFindingId(findingId: string) {
    return prisma.recommendation.findMany({
      where: { findingId: Number(findingId) }, // ✅ FIX
      include: {
        priority: true,
        department: true,
        comments: {
          include: {
            author: {
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        documents: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  static async create(data: {
    title: string;
    actionPlan: string;
    targetDate: Date;
    priorityId?: string;
    departmentId?: string;
    assigneeName?: string;
    findingId: string;
  }) {

    // 🔴 AJOUT — contrôle métier
    const finding = await prisma.finding.findUnique({
      where: { id: Number(data.findingId) }
    });

    if (!finding) throw new Error('Finding introuvable');

    if (finding.status !== 'VALIDATED') {
      throw new Error('Impossible de créer une recommandation : finding non validé');
    }

    return prisma.recommendation.create({
      data: {
        title: data.title,
        actionPlan: data.actionPlan,
        targetDate: data.targetDate,

        //status: 'OPEN',
        status: 'DRAFT',
        
        // ✅ conversions critiques
        findingId: Number(data.findingId),
        priorityId: data.priorityId ? Number(data.priorityId) : null,
        departmentId: data.departmentId ? Number(data.departmentId) : null,

        assigneeName: data.assigneeName || null,
      },
      include: {
        priority: true,
        department: true
      }
    });
  }

  static async updateStatus(id: string, status: string) {
    return prisma.recommendation.update({
      where: { id: Number(id) }, // ✅ FIX
      data: { status }
    });
  }

  static async addComment(
    recommendationId: string,
    authorId: string,
    content: string
  ) {
    return prisma.recommendationComment.create({
      data: {
        content,
        recommendationId: Number(recommendationId), // ✅ FIX
        authorId: Number(authorId) // ✅ FIX
      },
      include: {
        author: {
          select: { firstName: true, lastName: true }
        }
      }
    });
  }

  static async update(
    id: string,
    data: {
      title?: string;
      actionPlan?: string;
      targetDate?: Date;
      priorityId?: string;
      departmentId?: string;
      assigneeName?: string;
    }
  ) {
    return prisma.recommendation.update({
      where: { id: Number(id) }, // ✅ FIX
      data: {
        title: data.title,
        actionPlan: data.actionPlan,
        targetDate: data.targetDate,

        priorityId: data.priorityId ? Number(data.priorityId) : null,
        departmentId: data.departmentId ? Number(data.departmentId) : null,

        assigneeName: data.assigneeName || null
      },
      include: {
        priority: true,
        department: true
      }
    });
  }

  static async delete(id: string) {
    return prisma.recommendation.delete({
      where: { id: Number(id) } // ✅ FIX
    });
  }
}

export const getRecommendationsByMission = async (missionId: number) => {
  return prisma.recommendation.findMany({
    where: {
      finding: {
        missionId: missionId,
      },
    },
    include: {
      finding: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      priority: true,
      department: true,
      assigneeUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      assigneeGlpiUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      ticketLinks: {
        include: {
          ticket: true,
        },
      },
      followUps: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};