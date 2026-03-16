import prisma from '../db';

export type MissionStatus = 'PLANNED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'VALIDATED' | 'CLOSED';

export class MissionService {
  /**
   * Create a new Audit Mission
   */
  static async createMission(data: {
    tenantId: string;
    title: string;
    description: string;
    planId: string;
    leaderId: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    return prisma.auditMission.create({
      data: {
        ...data,
        status: 'PLANNED',
      },
    });
  }

  /**
   * Get all missions for a tenant with optional filtering
   */
  static async getMissions(tenantId: string) {
    return prisma.auditMission.findMany({
      where: { tenantId },
      include: {
        leader: {
          select: { firstName: true, lastName: true, email: true }
        },
        _count: {
          select: { findings: true, documents: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get a specific mission by ID with its findings and documents
   */
  static async getMissionById(id: string, tenantId: string) {
    const mission = await prisma.auditMission.findFirst({
      where: { id, tenantId },
      include: {
        leader: {
          select: { id: true, firstName: true, lastName: true }
        },
        findings: {
          include: {
            riskLevel: true,
            _count: {
              select: { recos: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        documents: true,
        plan: true
      }
    });

    if (!mission) throw new Error('Mission not found');
    return mission;
  }

  /**
   * Get a mission report including all findings and their recommendations
   */
  static async getMissionReport(id: string, tenantId: string) {
    const mission = await prisma.auditMission.findFirst({
      where: { id, tenantId },
      include: {
        leader: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        plan: true,
        findings: {
          include: {
            riskLevel: true,
            author: {
              select: { firstName: true, lastName: true }
            },
            recos: {
              include: {
                priority: true,
                department: true,
                assignee: {
                  select: { firstName: true, lastName: true }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!mission) throw new Error('Mission not found');
    return mission;
  }

  /**
   * Update mission status with business rules validation
   */
  static async updateStatus(id: string, tenantId: string, newStatus: MissionStatus) {
    const mission = await prisma.auditMission.findFirst({ where: { id, tenantId } });
    if (!mission) throw new Error('Mission not found');

    const currentStatus = mission.status as MissionStatus;
    
    // Business Rules: Valid Status Transitions
    const validTransitions: Record<MissionStatus, MissionStatus[]> = {
      'PLANNED': ['IN_PROGRESS'],
      'IN_PROGRESS': ['IN_REVIEW'],
      'IN_REVIEW': ['VALIDATED', 'IN_PROGRESS'], // Can go back if rejected
      'VALIDATED': ['CLOSED'],
      'CLOSED': [] // Terminal state
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    return prisma.auditMission.update({
      where: { id },
      data: { status: newStatus }
    });
  }
}
