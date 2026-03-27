import prisma from '@audit/database';

export class BusinessProcessService {

  /**
   * CREATE BusinessProcess
   */
  static async create(data: any, tenantId: number) {
    const {
      code,
      name,
      description,
      auditableEntityId,
      ownerDepartmentId
    } = data;

    // 🔒 1. Validation minimale
    if (!tenantId) {
      throw new Error("UNAUTHORIZED");
    }

    if (!code || !name) {
      throw new Error("CODE_AND_NAME_REQUIRED");
    }

    // 🔁 2. Unicité (tenant + code)
    const existing = await prisma.businessProcess.findFirst({
      where: {
        tenantId,
        code
      }
    });

    if (existing) {
      throw new Error("BUSINESS_PROCESS_CODE_ALREADY_EXISTS");
    }

    // 🔗 3. Vérifier AuditableEntity (même tenant)
    if (auditableEntityId) {
      const entity = await prisma.auditableEntity.findFirst({
        where: {
          id: auditableEntityId,
          tenantId
        }
      });

      if (!entity) {
        throw new Error("INVALID_AUDITABLE_ENTITY");
      }
    }

    // 🔗 4. Vérifier Department (même tenant)
    if (ownerDepartmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: ownerDepartmentId,
          tenantId
        }
      });

      if (!department) {
        throw new Error("INVALID_DEPARTMENT");
      }
    }

    // 🧠 5. Création
    return prisma.businessProcess.create({
      data: {
        tenantId,
        code: code.trim(),
        name: name.trim(),
        description,
        auditableEntityId: auditableEntityId || null,
        ownerDepartmentId: ownerDepartmentId || null
      },
      include: {
        auditableEntity: true,
        ownerDepartment: true
      }
    });
  }

  /**
   * GET ALL BusinessProcesses (actifs uniquement)
   */
  static async findAll(tenantId: number) {
    if (!tenantId) {
      throw new Error("UNAUTHORIZED");
    }

    return prisma.businessProcess.findMany({
      where: {
        tenantId,
        isActive: true
      },
      include: {
        auditableEntity: true,
        ownerDepartment: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

static async findById(id: number, tenantId: number) {
  if (!tenantId) {
    throw new Error("UNAUTHORIZED");
  }

  if (!id || isNaN(id)) {
    throw new Error("INVALID_ID");
  }

  const businessProcess = await prisma.businessProcess.findFirst({
    where: {
      id,
      tenantId,
      isActive: true
    },
    include: {
      auditableEntity: true,
      ownerDepartment: true
    }
  });

  if (!businessProcess) {
    throw new Error("BUSINESS_PROCESS_NOT_FOUND");
  }

  return businessProcess;
}

static async update(id: number, data: any, tenantId: number) {
  const {
    code,
    name,
    description,
    auditableEntityId,
    ownerDepartmentId,
    isActive
  } = data;

  if (!tenantId) {
    throw new Error("UNAUTHORIZED");
  }

  if (!id || isNaN(id)) {
    throw new Error("INVALID_ID");
  }

  // 🔎 Vérifier existence
  const existing = await prisma.businessProcess.findFirst({
    where: { id, tenantId }
  });

  if (!existing) {
    throw new Error("BUSINESS_PROCESS_NOT_FOUND");
  }

  // 🔁 Vérif unicité code (si modifié)
  if (code && code !== existing.code) {
    const duplicate = await prisma.businessProcess.findFirst({
      where: {
        tenantId,
        code
      }
    });

    if (duplicate) {
      throw new Error("BUSINESS_PROCESS_CODE_ALREADY_EXISTS");
    }
  }

  // 🔗 Vérif AuditableEntity
  if (auditableEntityId) {
    const entity = await prisma.auditableEntity.findFirst({
      where: {
        id: auditableEntityId,
        tenantId
      }
    });

    if (!entity) {
      throw new Error("INVALID_AUDITABLE_ENTITY");
    }
  }

  // 🔗 Vérif Department
  if (ownerDepartmentId) {
    const department = await prisma.department.findFirst({
      where: {
        id: ownerDepartmentId,
        tenantId
      }
    });

    if (!department) {
      throw new Error("INVALID_DEPARTMENT");
    }
  }

  return prisma.businessProcess.update({
    where: { id },
    data: {
      code: code?.trim(),
      name: name?.trim(),
      description,
      auditableEntityId: auditableEntityId ?? null,
      ownerDepartmentId: ownerDepartmentId ?? null,
      isActive
    },
    include: {
      auditableEntity: true,
      ownerDepartment: true
    }
  });
}

static async delete(id: number, tenantId: number) {
  if (!tenantId) {
    throw new Error("UNAUTHORIZED");
  }

  if (!id || isNaN(id)) {
    throw new Error("INVALID_ID");
  }

  const existing = await prisma.businessProcess.findFirst({
    where: { id, tenantId }
  });

  if (!existing) {
    throw new Error("BUSINESS_PROCESS_NOT_FOUND");
  }

  return prisma.businessProcess.update({
    where: { id },
    data: {
      isActive: false
    }
  });
}

}