const prisma = require('@audit/database').default;

export class SettingsService {
  // --- Departments ---
  static async getDepartments(tenantId: number) {
    return prisma.department.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  static async createDepartment(tenantId: number, data: { name: string; code: string }) {
    return prisma.department.create({ data: { ...data, tenantId } });
  }
  static async updateDepartment(id: number, tenantId: number, data: { name: string; code: string }) {
    return prisma.department.update({ where: { id, tenantId }, data });
  }
  static async deleteDepartment(id: number, tenantId: number) {
    return prisma.department.delete({ where: { id, tenantId } });
  }

  // --- Audit Types ---
  static async getAuditTypes(tenantId: number) {
    return prisma.auditType.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  static async createAuditType(tenantId: number, data: { name: string }) {
    return prisma.auditType.create({ data: { ...data, tenantId } });
  }
  static async updateAuditType(id: number, tenantId: number, data: { name: string }) {
    return prisma.auditType.update({ where: { id, tenantId }, data });
  }
  static async deleteAuditType(id: number, tenantId: number) {
    return prisma.auditType.delete({ where: { id, tenantId } });
  }

  // --- Risk Levels ---
  static async getRiskLevels(tenantId: number) {
    return prisma.riskLevel.findMany({ where: { tenantId }, orderBy: { level: 'asc' } });
  }
  static async createRiskLevel(tenantId: number, data: { name: string; color?: string; level: number }) {
    return prisma.riskLevel.create({ data: { ...data, tenantId } });
  }
  static async updateRiskLevel(id: number, tenantId: number, data: { name: string; color?: string; level: number }) {
    return prisma.riskLevel.update({ where: { id, tenantId }, data });
  }
  static async deleteRiskLevel(id: number, tenantId: number) {
    return prisma.riskLevel.delete({ where: { id, tenantId } });
  }

  // --- Priority Levels ---
  static async getPriorityLevels(tenantId: number) {
    return prisma.priorityLevel.findMany({ where: { tenantId }, orderBy: { level: 'asc' } });
  }
  static async createPriorityLevel(tenantId: number, data: { name: string; level: number }) {
    return prisma.priorityLevel.create({ data: { ...data, tenantId } });
  }
  static async updatePriorityLevel(id: number, tenantId: number, data: { name: string; level: number }) {
    return prisma.priorityLevel.update({ where: { id, tenantId }, data });
  }
  static async deletePriorityLevel(id: number, tenantId: number) {
    return prisma.priorityLevel.delete({ where: { id, tenantId } });
  }
}
