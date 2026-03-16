import prisma from '../db';

export class FindingService {
  static async getByMissionId(missionId: string) {
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

  static async getById(id: string) {
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
        ...data,
        status: 'DRAFT'
      },
      include: {
        riskLevel: true,
        author: {
          select: { firstName: true, lastName: true }
        }
      }
    });
  }

  static async update(id: string, data: {
    title?: string;
    description?: string;
    riskLevelId?: string;
    process?: string;
    cause?: string;
    impact?: string;
  }) {
    return prisma.finding.update({
      where: { id },
      data,
      include: {
        riskLevel: true
      }
    });
  }

  static async updateStatus(id: string, status: string, validatorId?: string) {
    const data: any = { status };
    if (validatorId && (status === 'CONFIRMED' || status === 'REJECTED')) {
      data.validatorId = validatorId;
    }

    return prisma.finding.update({
      where: { id },
      data,
      include: {
        validator: {
          select: { firstName: true, lastName: true }
        }
      }
    });
  }

  static async delete(id: string) {
    return prisma.finding.delete({
      where: { id }
    });
  }

  static async addComment(findingId: string, authorId: string, content: string) {
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
}
