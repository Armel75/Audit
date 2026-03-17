import prisma from '@audit/database';

export class AuditPlanService {
  /**
   * Creates a new Annual Audit Plan.
   * Business Rule: A tenant can only have one plan per year.
   */
  static async createPlan(tenantId: string, year: number) {
    const existingPlan = await prisma.auditPlan.findUnique({
      where: {
        tenantId_year: { tenantId, year }
      }
    });

    if (existingPlan) {
      throw new Error(`Un plan d'audit existe déjà pour l'année ${year}.`);
    }

    return prisma.auditPlan.create({
      data: {
        tenantId,
        year,
        status: 'DRAFT'
      }
    });
  }

  /**
   * Retrieves all audit plans for a tenant, including the count of associated missions.
   */
  static async getPlans(tenantId: string) {
    return prisma.auditPlan.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { missions: true }
        }
      },
      orderBy: { year: 'desc' }
    });
  }

  /**
   * Updates the status of an audit plan.
   * Handles transitions: DRAFT -> PENDING_APPROVAL -> VALIDATED | REJECTED
   */
  static async updateStatus(tenantId: string, planId: string, status: string) {
    const validStatuses = ['DRAFT', 'PENDING_APPROVAL', 'VALIDATED', 'REJECTED'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}`);
    }

    return prisma.auditPlan.update({
      where: { 
        id: planId,
        tenantId // Ensure the plan belongs to the tenant
      },
      data: { status }
    });
  }

  /**
   * Updates an audit plan (e.g., year).
   */
  static async updatePlan(tenantId: string, planId: string, year: number) {
    const existingPlan = await prisma.auditPlan.findUnique({
      where: {
        tenantId_year: { tenantId, year }
      }
    });

    if (existingPlan && existingPlan.id !== planId) {
      throw new Error(`Un plan d'audit existe déjà pour l'année ${year}.`);
    }

    return prisma.auditPlan.update({
      where: { id: planId, tenantId },
      data: { year }
    });
  }

  /**
   * Deletes an audit plan.
   */
  static async deletePlan(tenantId: string, planId: string) {
    return prisma.auditPlan.delete({
      where: { id: planId, tenantId }
    });
  }
}
