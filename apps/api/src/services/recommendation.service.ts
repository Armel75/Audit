import prisma from '@audit/database';

export class RecommendationService {
  static async getByFindingId(findingId: string) {
    return prisma.recommendation.findMany({
      where: { findingId },
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
    return prisma.recommendation.create({
      data: {
        ...data,
        status: 'OPEN'
      },
      include: {
        priority: true,
        department: true
      }
    });
  }

  static async updateStatus(id: string, status: string) {
    return prisma.recommendation.update({
      where: { id },
      data: { status }
    });
  }

  static async addComment(recommendationId: string, authorId: string, content: string) {
    return prisma.recommendationComment.create({
      data: {
        content,
        recommendationId,
        authorId
      },
      include: {
        author: {
          select: { firstName: true, lastName: true }
        }
      }
    });
  }

  static async update(id: string, data: {
    title?: string;
    actionPlan?: string;
    targetDate?: Date;
    priorityId?: string;
    departmentId?: string;
    assigneeName?: string;
  }) {
    return prisma.recommendation.update({
      where: { id },
      data,
      include: {
        priority: true,
        department: true
      }
    });
  }

  static async delete(id: string) {
    return prisma.recommendation.delete({
      where: { id }
    });
  }
}
