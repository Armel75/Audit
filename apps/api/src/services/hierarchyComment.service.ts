const prisma = require('@audit/database').default;

export class HierarchyCommentService {
  static async getByContext(tenantId: number, contextType: string, contextId: number) {
    return prisma.hierarchyComment.findMany({
      where: {
        tenantId,
        contextType,
        contextId,
        deletedAt: null
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
        parentComment: { select: { id: true, title: true } },
        childComments: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  static async getById(tenantId: number, id: number) {
    return prisma.hierarchyComment.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
        parentComment: { select: { id: true, title: true } },
        childComments: { select: { id: true, title: true } }
      }
    });
  }

  static async create(data: any) {
    return prisma.hierarchyComment.create({
      data,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
        parentComment: { select: { id: true, title: true } },
        childComments: { select: { id: true, title: true } }
      }
    });
  }

  static async update(id: number, data: any) {
    return prisma.hierarchyComment.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
        parentComment: { select: { id: true, title: true } },
        childComments: { select: { id: true, title: true } }
      }
    });
  }

  static async softDelete(id: number, userId: number) {
    return prisma.hierarchyComment.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: userId }
    });
  }
}
