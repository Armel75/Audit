import prisma from '../db';

export class SettingsService {
  // --- Departments ---
  static async getDepartments(tenantId: string) {
    return prisma.department.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  static async createDepartment(tenantId: string, data: { name: string; code: string }) {
    return prisma.department.create({ data: { ...data, tenantId } });
  }
  static async updateDepartment(id: string, tenantId: string, data: { name: string; code: string }) {
    return prisma.department.update({ where: { id, tenantId }, data });
  }
  static async deleteDepartment(id: string, tenantId: string) {
    return prisma.department.delete({ where: { id, tenantId } });
  }

  // --- Audit Types ---
  static async getAuditTypes(tenantId: string) {
    return prisma.auditType.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  static async createAuditType(tenantId: string, data: { name: string }) {
    return prisma.auditType.create({ data: { ...data, tenantId } });
  }
  static async updateAuditType(id: string, tenantId: string, data: { name: string }) {
    return prisma.auditType.update({ where: { id, tenantId }, data });
  }
  static async deleteAuditType(id: string, tenantId: string) {
    return prisma.auditType.delete({ where: { id, tenantId } });
  }

  // --- Risk Levels ---
  static async getRiskLevels(tenantId: string) {
    return prisma.riskLevel.findMany({ where: { tenantId }, orderBy: { level: 'asc' } });
  }
  static async createRiskLevel(tenantId: string, data: { name: string; color?: string; level: number }) {
    return prisma.riskLevel.create({ data: { ...data, tenantId } });
  }
  static async updateRiskLevel(id: string, tenantId: string, data: { name: string; color?: string; level: number }) {
    return prisma.riskLevel.update({ where: { id, tenantId }, data });
  }
  static async deleteRiskLevel(id: string, tenantId: string) {
    return prisma.riskLevel.delete({ where: { id, tenantId } });
  }

  // --- Priority Levels ---
  static async getPriorityLevels(tenantId: string) {
    return prisma.priorityLevel.findMany({ where: { tenantId }, orderBy: { level: 'asc' } });
  }
  static async createPriorityLevel(tenantId: string, data: { name: string; level: number }) {
    return prisma.priorityLevel.create({ data: { ...data, tenantId } });
  }
  static async updatePriorityLevel(id: string, tenantId: string, data: { name: string; level: number }) {
    return prisma.priorityLevel.update({ where: { id, tenantId }, data });
  }
  static async deletePriorityLevel(id: string, tenantId: string) {
    return prisma.priorityLevel.delete({ where: { id, tenantId } });
  }
}
