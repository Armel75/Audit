import { Router } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { requireAnyPermission, requireAuth } from '../middleware/auth.middleware';
import { getMissionAccessFilter } from '../controllers/mission.controller';

const prisma = require('@audit/database').default;

const router = Router();

router.get('/dg', requireAuth, requireAnyPermission(['dashboard_dg:read', 'admin:access']), async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;

    const yr = req.query.year ? Number(req.query.year) : undefined;
    const mo = req.query.month ? Number(req.query.month) : undefined;
    const period = yr ? { year: yr, month: mo } : undefined;

    const data = await DashboardService.getDGDashboard(tenantId, period);

    res.json(data);
  } catch (error) {
    console.error('🔥 DG DASHBOARD ERROR:', error);
    res.status(500).json({ message: 'Internal error' });
  }
});

// ================= MISSIONS DASHBOARD =================
// Tous les profils qui voient les missions (read / read_all) y ont accès.
// ?scope=all (défaut si read_all) | ?scope=mine (toujours pour les lecteurs simples)
router.get('/missions', requireAuth, requireAnyPermission(['audit_mission:read', 'audit_mission:read_all']), async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;
    const perms = (user.permissions || []).map((p: string) => p.toLowerCase());
    const hasReadAll = perms.includes('audit_mission:read_all');

    // Vue : "all" par défaut si read_all, sinon toujours "mine".
    const scope: 'all' | 'mine' = hasReadAll && req.query.scope !== 'mine' ? 'all' : 'mine';
    const accessFilter = getMissionAccessFilter(user, scope === 'mine');

    const yr = req.query.year ? Number(req.query.year) : undefined;
    const mo = req.query.month ? Number(req.query.month) : undefined;
    const period = yr ? { year: yr, month: mo } : undefined;

    const data = await DashboardService.getMissionsDashboard(tenantId, period, accessFilter, scope);

    res.json(data);
  } catch (error) {
    console.error('🔥 MISSIONS DASHBOARD ERROR:', error);
    res.status(500).json({ message: 'Internal error' });
  }
});

// ================= PILOTAGE RÉFÉRENTIEL & COUVERTURE =================
// Lecture stratégique du référentiel d'audit (types, entités, processus,
// contrôles, risques) + couverture par plan/scope + détection des trous.
router.get('/pilotage', requireAuth, requireAnyPermission(['audit_plan:read', 'referential:access', 'admin:access']), async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;

    const yr = req.query.year ? Number(req.query.year) : undefined;
    const mo = req.query.month ? Number(req.query.month) : undefined;
    const period = yr ? { year: yr, month: mo } : undefined;

    const data = await DashboardService.getPilotage(tenantId, period);

    res.json(data);
  } catch (error) {
    console.error('🔥 PILOTAGE DASHBOARD ERROR:', error);
    res.status(500).json({ message: 'Internal error' });
  }
});

// ================= MAIN DASHBOARD =================
router.get('/main', requireAuth, requireAnyPermission(['dashboard:read', 'admin:access']), async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const userId = (req as any).user.id;
    const now = new Date();

    // ── Période filter ────────────────────────────────
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;

    const periodFilter: any = {};
    if (year) {
      periodFilter.gte = new Date(year, 0, 1);
      periodFilter.lt = new Date(year + 1, 0, 1);
    }
    if (month !== undefined && year) {
      periodFilter.gte = new Date(year, month - 1, 1);
      periodFilter.lt = new Date(year, month, 1);
    }
    const hasPeriodFilter = Object.keys(periodFilter).length > 0;
    const createdAtFilter = hasPeriodFilter ? { createdAt: periodFilter } : {};

    // ── KPIs ──────────────────────────────────────────
    const [
      missionsActive,
      missionsTotal,
      plansApproved,
      plansTotal,
      findingsOpen,
      findingsCriticalOpen,
      recosTotal,
      recosOverdue,
      approvalsPending,
      recoImplementedPercents,
    ] = await Promise.all([
      prisma.auditMission.count({ where: { tenantId, status: { in: ['IN_PROGRESS', 'REVIEW'] }, ...createdAtFilter } }),
      prisma.auditMission.count({ where: { tenantId, ...createdAtFilter } }),
      prisma.auditPlan.count({ where: { tenantId, status: 'VALIDATED', ...createdAtFilter } }),
      prisma.auditPlan.count({ where: { tenantId, ...createdAtFilter } }),
      prisma.finding.count({ where: { tenantId, status: { notIn: ['CLOSED', 'REJECTED'] }, ...createdAtFilter } }),
      prisma.finding.count({
        where: {
          tenantId,
          status: { notIn: ['CLOSED', 'REJECTED'] },
          riskLevel: { level: { gte: 4 } },
          ...createdAtFilter,
        },
      }),
      prisma.recommendation.count({ where: { tenantId, status: { notIn: ['CLOSED', 'REJECTED', 'VALIDATED'] }, ...createdAtFilter } }),
      prisma.recommendation.count({
        where: { tenantId, status: { notIn: ['CLOSED', 'REJECTED', 'VALIDATED'] }, targetDate: { lt: now }, ...createdAtFilter },
      }),
      prisma.approval.count({ where: { tenantId, decision: 'PENDING', ...createdAtFilter } }),
      prisma.recommendation.aggregate({
        where: { tenantId, status: { notIn: ['CLOSED', 'REJECTED'] }, ...createdAtFilter },
        _avg: { implementedPercent: true },
      }),
    ]);

    const avgImplementation = Math.round(recoImplementedPercents._avg.implementedPercent ?? 0);

    // ── Mission status distribution ──────────────────
    const missionsByStatus = await prisma.auditMission.groupBy({
      by: ['status'],
      where: { tenantId, ...createdAtFilter },
      _count: { id: true },
    });

    const missionStatusData = missionsByStatus.map((m: any) => ({
      status: m.status,
      count: m._count.id,
    }));

    // ── Plan execution ───────────────────────────────
    const currentPlan = await prisma.auditPlan.findFirst({
      where: { tenantId, status: 'VALIDATED', ...(year ? { year } : {}) },
      orderBy: { year: 'desc' },
      select: {
        id: true,
        year: true,
        title: true,
        versionNumber: true,
        _count: { select: { missions: true } },
      },
    });

    let planExecution = null;
    if (currentPlan) {
      const [completedMissions, programsApproved, programsPending, missionsWithoutValidatedProgram] = await Promise.all([
        prisma.auditMission.count({ where: { tenantId, planId: currentPlan.id, status: 'COMPLETED' } }),
        prisma.auditProgram.count({ where: { tenantId, mission: { planId: currentPlan.id }, status: 'APPROVED' } }),
        prisma.auditProgram.count({ where: { tenantId, mission: { planId: currentPlan.id }, status: { in: ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL'] } } }),
        prisma.auditMission.count({
          where: {
            tenantId,
            planId: currentPlan.id,
            programs: { none: { status: 'APPROVED' } },
          },
        }),
      ]);

      const totalMissions = currentPlan._count.missions;
      planExecution = {
        year: currentPlan.year,
        title: currentPlan.title,
        versionNumber: currentPlan.versionNumber,
        totalMissions,
        completedMissions,
        progress: totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0,
        programsApproved,
        programsPending,
        missionsWithoutValidatedProgram,
      };
    }

    // ── Top missions ─────────────────────────────────
    const missionAccessFilter = getMissionAccessFilter((req as any).user);
    const topMissionsWhere: any = { tenantId, status: { in: ['IN_PROGRESS', 'REVIEW', 'PLANNED'] }, ...createdAtFilter };
    if (missionAccessFilter) {
      topMissionsWhere.AND = [missionAccessFilter];
    }
    const topMissions = await prisma.auditMission.findMany({
      where: topMissionsWhere,
      orderBy: { endDate: 'asc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        leader: { select: { firstName: true, lastName: true } },
        plan: { select: { title: true } },
        programs: { select: { status: true } },
      },
    });

    // ── Findings by risk level ───────────────────────
    const findingsByRiskRaw = await prisma.finding.groupBy({
      by: ['riskLevelId'],
      where: { tenantId, status: { notIn: ['CLOSED', 'REJECTED'] }, riskLevelId: { not: null }, ...createdAtFilter },
      _count: { id: true },
    });

    const riskLevels = await prisma.riskLevel.findMany({
      where: { tenantId },
      select: { id: true, name: true, level: true },
      orderBy: { level: 'asc' },
    });

    const riskLevelMap = new Map(riskLevels.map((r: any) => [r.id, r.name]));
    const findingsByRisk = findingsByRiskRaw.map((f: any) => ({
      name: riskLevelMap.get(f.riskLevelId) || 'Inconnu',
      value: f._count.id,
    }));

    // ── Findings summary ─────────────────────────────
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const [findingsPendingValidation, findingsRecent] = await Promise.all([
      prisma.finding.count({ where: { tenantId, status: 'SUBMITTED', ...createdAtFilter } }),
      prisma.finding.count({ where: { tenantId, createdAt: { gte: sevenDaysAgo } } }),
    ]);

    // ── Top findings ─────────────────────────────────
    const topFindings = await prisma.finding.findMany({
      where: { tenantId, status: { notIn: ['CLOSED', 'REJECTED'] }, ...createdAtFilter },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        description: true,
        criteria: true,
        process: true,
        impact: true,
        status: true,
        createdAt: true,
        riskLevel: { select: { name: true, level: true } },
        mission: { select: { title: true } },
        businessProcess: { select: { name: true } },
      },
    });

    // ── Recommendations summary ──────────────────────
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const recosDueNext7Days = await prisma.recommendation.count({
      where: {
        tenantId,
        status: { notIn: ['CLOSED', 'REJECTED', 'VALIDATED'] },
        targetDate: { gte: now, lte: sevenDaysFromNow },
        ...createdAtFilter,
      },
    });

    // ── Recommendations by department ────────────────
    const recosByDeptRaw = await prisma.recommendation.groupBy({
      by: ['departmentId'],
      where: { tenantId, status: { notIn: ['CLOSED', 'REJECTED'] }, ...createdAtFilter },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    });

    const deptIds = recosByDeptRaw.map((r: any) => r.departmentId).filter((id: any) => id !== null);
    const departments = deptIds.length > 0
      ? await prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } })
      : [];
    const deptMap = new Map(departments.map((d: any) => [d.id, d.name]));

    const recommendationsByDepartment = recosByDeptRaw.map((r: any) => ({
      name: r.departmentId ? (deptMap.get(r.departmentId) || 'Inconnu') : 'Non assigné',
      value: r._count.id,
    }));

    // ── Top recommendations ──────────────────────────
    const topRecommendations = await prisma.recommendation.findMany({
      where: { tenantId, status: { notIn: ['CLOSED', 'REJECTED', 'VALIDATED'] }, ...createdAtFilter },
      orderBy: { targetDate: 'asc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        targetDate: true,
        implementedPercent: true,
        priority: { select: { name: true } },
        department: { select: { name: true } },
        assigneeName: true,
        assigneeUser: { select: { firstName: true, lastName: true } },
        ticketLinks: { select: { ticket: { select: { ticketNumber: true } } }, take: 1 },
      },
    });

    // ── Approvals ────────────────────────────────────
    const [approvalsApproved, approvalsRejected] = await Promise.all([
      prisma.approval.count({ where: { tenantId, decision: 'APPROVED', ...createdAtFilter } }),
      prisma.approval.count({ where: { tenantId, decision: 'REJECTED', ...createdAtFilter } }),
    ]);

    const recentApprovals = await prisma.approval.findMany({
      where: { tenantId, ...createdAtFilter },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        approvalType: true,
        level: true,
        decision: true,
        comments: true,
        createdAt: true,
        decidedAt: true,
        requestedBy: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
        findingId: true,
        finding: { select: { title: true } },
        recommendationId: true,
        recommendation: { select: { title: true } },
        planId: true,
        plan: { select: { title: true } },
        auditProgramId: true,
        auditProgram: { select: { title: true } },
        missionId: true,
        mission: { select: { title: true } },
      },
    });

    // ── Tickets GLPI ─────────────────────────────────
    const [ticketsOpen, ticketsBlocked, ticketsResolved] = await Promise.all([
      prisma.ticket.count({ where: { tenantId, status: 'OPEN', ...createdAtFilter } }),
      prisma.ticket.count({ where: { tenantId, status: 'BLOCKED', ...createdAtFilter } }),
      prisma.ticket.count({ where: { tenantId, status: { in: ['RESOLVED', 'CLOSED'] }, ...createdAtFilter } }),
    ]);

    const recentTicketLinks = await prisma.recommendationTicket.findMany({
      where: { tenantId, ...createdAtFilter },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        linkType: true,
        ticket: { select: { id: true, title: true, ticketNumber: true, status: true, assigneeGlpiUser: { select: { fullName: true } } } },
        recommendation: { select: { id: true, title: true } },
        createdAt: true,
      },
    });

    // ── Documents / Evidences ────────────────────────
    const [totalDocuments, totalEvidence, sensitiveEvidence] = await Promise.all([
      prisma.document.count({ where: { tenantId, ...createdAtFilter } }),
      prisma.evidence.count({ where: { tenantId, ...createdAtFilter } }),
      prisma.evidence.count({ where: { tenantId, isSensitive: true, ...createdAtFilter } }),
    ]);

    // ── Risks / Controls ─────────────────────────────
    const [activeRisks, totalControls, totalRiskControlLinks] = await Promise.all([
      prisma.risk.count({ where: { tenantId, isActive: true, ...createdAtFilter } }),
      prisma.control.count({ where: { tenantId, ...createdAtFilter } }),
      prisma.riskControl.count({ where: { tenantId, ...createdAtFilter } }),
    ]);

    const risksWithoutControls = await prisma.risk.count({
      where: { tenantId, isActive: true, controlLinks: { none: {} }, ...createdAtFilter },
    });

    // ── Activity log ─────────────────────────────────
    const recentLogs = await prisma.auditLog.findMany({
      where: { tenantId, ...createdAtFilter },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        action: true,
        entityName: true,
        entityId: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    // ── Notifications unread ─────────────────────────
    const unreadNotifications = await prisma.notification.count({
      where: { tenantId, recipientUserId: userId, readAt: null, ...createdAtFilter },
    });

    // ── Performance & couverture (top 1%) ────────────

    // 1. Taux de couverture de l'univers d'audit
    const [totalAuditableEntities, coveredEntities] = await Promise.all([
      prisma.auditableEntity.count({ where: { tenantId, isActive: true } }),
      ...(currentPlan ? [prisma.auditMissionScope.findMany({
        where: { tenantId, status: 'IN_SCOPE', mission: { planId: currentPlan.id } },
        select: { auditableEntityId: true },
        distinct: ['auditableEntityId'],
      })] : [Promise.resolve([])]),
    ]);
    const coveredEntitiesCountVal = currentPlan ? coveredEntities.length : 0;
    const coverageRate = totalAuditableEntities > 0
      ? Math.round((coveredEntitiesCountVal / totalAuditableEntities) * 100)
      : 0;

    // 2. Délai moyen de clôture des constats (jours)
    const closedFindings = await prisma.finding.findMany({
      where: { tenantId, status: 'CLOSED', ...createdAtFilter },
      select: { createdAt: true, updatedAt: true },
    });
    const avgFindingCloseDays = closedFindings.length > 0
      ? Math.round(closedFindings.reduce((sum: number, f: any) => sum + (f.updatedAt.getTime() - f.createdAt.getTime()) / 86400000, 0) / closedFindings.length)
      : 0;

    // 3. Délai moyen de clôture des recommandations (jours)
    const closedRecos = await prisma.recommendation.findMany({
      where: { tenantId, status: 'CLOSED', closedAt: { not: null }, ...createdAtFilter },
      select: { createdAt: true, closedAt: true },
    });
    const avgRecoCloseDays = closedRecos.length > 0
      ? Math.round(closedRecos.reduce((sum: number, r: any) => sum + (r.closedAt.getTime() - r.createdAt.getTime()) / 86400000, 0) / closedRecos.length)
      : 0;

    // 4. Taux de conformité des procédures (% OK)
    const [proceduresOk, proceduresTotal] = await Promise.all([
      prisma.auditProcedure.count({ where: { tenantId, result: 'OK', ...createdAtFilter } }),
      prisma.auditProcedure.count({ where: { tenantId, result: { not: null }, ...createdAtFilter } }),
    ]);
    const procedureConformityRate = proceduresTotal > 0
      ? Math.round((proceduresOk / proceduresTotal) * 100)
      : 0;

    // 5. Charge par auditeur (top 5)
    const auditorLoad = await prisma.auditMissionMember.groupBy({
      by: ['userId'],
      where: { tenantId, assignmentStatus: 'ACTIVE', ...(hasPeriodFilter ? { assignedAt: periodFilter } : {}) },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });
    // Securise: filtre les null/undefined et force tableau d'entiers
    const auditorUserIds = auditorLoad.map((a: any) => a.userId).filter((id: any) => typeof id === 'number' && !isNaN(id));
    const auditorUsers = auditorUserIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: auditorUserIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const auditorUserMap = new Map(auditorUsers.map((u: any) => [u.id, `${u.firstName} ${u.lastName}`]));
    const auditorWorkload = auditorLoad.map((a: any) => ({
      name: auditorUserMap.get(a.userId) || `User #${a.userId}`,
      missions: a._count.id,
    }));

    // 6. Tendance mensuelle des constats (selon période ou 6 derniers mois)
    const trendDateFilter = hasPeriodFilter ? periodFilter : { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) };
    const [findingsCreatedRaw, findingsClosedRaw] = await Promise.all([
      prisma.finding.findMany({
        where: { tenantId, createdAt: trendDateFilter },
        select: { createdAt: true },
      }),
      prisma.finding.findMany({
        where: { tenantId, status: 'CLOSED', updatedAt: trendDateFilter },
        select: { updatedAt: true },
      }),
    ]);

    const monthLabels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push(d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }));
    }
    const findingsTrend = monthLabels.map((label, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const created = findingsCreatedRaw.filter((f: any) => f.createdAt >= d && f.createdAt < nextMonth).length;
      const closed = findingsClosedRaw.filter((f: any) => f.updatedAt >= d && f.updatedAt < nextMonth).length;
      return { month: label, created, closed };
    });

    // 7. Respect des échéances missions
    const missionsLate = await prisma.auditMission.count({
      where: { tenantId, status: { in: ['IN_PROGRESS', 'REVIEW'] }, endDate: { lt: now }, ...createdAtFilter },
    });
    const completedMissionsCount = await prisma.auditMission.count({ where: { tenantId, status: 'COMPLETED', ...createdAtFilter } });
    const missionsOnTimeRate = (completedMissionsCount + missionsLate) > 0
      ? Math.round((completedMissionsCount / (completedMissionsCount + missionsLate)) * 100)
      : 100;

    // ── Response ─────────────────────────────────────
    res.json({
      kpis: {
        missionsActive,
        missionsTotal,
        plansApproved,
        plansTotal,
        findingsOpen,
        findingsCriticalOpen,
        recosOpen: recosTotal,
        recosOverdue,
        approvalsPending,
        avgImplementation,
      },
      planExecution,
      missionStatusData,
      topMissions: topMissions.map((m: any) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        startDate: m.startDate,
        endDate: m.endDate,
        leader: m.leader ? `${m.leader.firstName} ${m.leader.lastName}` : null,
        plan: m.plan?.title || null,
        programValidated: m.programs?.some((p: any) => p.status === 'APPROVED') ?? false,
      })),
      findingsSummary: {
        open: findingsOpen,
        critical: findingsCriticalOpen,
        pendingValidation: findingsPendingValidation,
        recent: findingsRecent,
      },
      findingsByRisk,
      topFindings: topFindings.map((f: any) => ({
        id: f.id,
        title: f.title,
        status: f.status,
        createdAt: f.createdAt,
        riskLevel: f.riskLevel?.name || null,
        riskScore: f.riskLevel?.level || 0,
        mission: f.mission?.title || null,
        description: f.description,
        criteria: f.criteria || null,
        process: f.process || f.businessProcess?.name || null,
        impact: f.impact || null,
      })),
      recommendationSummary: {
        open: recosTotal,
        overdue: recosOverdue,
        averageProgress: avgImplementation,
        dueNext7Days: recosDueNext7Days,
      },
      recommendationsByDepartment,
      topRecommendations: topRecommendations.map((r: any) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        targetDate: r.targetDate,
        progress: r.implementedPercent,
        priority: r.priority?.name || null,
        department: r.department?.name || null,
        assignee: r.assigneeUser ? `${r.assigneeUser.firstName} ${r.assigneeUser.lastName}` : (r.assigneeName || null),
        linkedTicket: r.ticketLinks?.[0]?.ticket?.ticketNumber || null,
      })),
      approvalsSummary: {
        pending: approvalsPending,
        approved: approvalsApproved,
        rejected: approvalsRejected,
      },
      recentApprovals: recentApprovals.map((a: any) => {
        let itemLabel = a.approvalType;
        if (a.finding) itemLabel = `Constat — ${a.finding.title}`;
        else if (a.recommendation) itemLabel = `Recommandation — ${a.recommendation.title}`;
        else if (a.plan) itemLabel = `Plan — ${a.plan.title}`;
        else if (a.auditProgram) itemLabel = `Programme — ${a.auditProgram.title}`;
        else if (a.mission) itemLabel = `Mission — ${a.mission.title}`;
        return {
          id: a.id,
          item: itemLabel,
          type: a.approvalType,
          level: a.level,
          decision: a.decision,
          createdAt: a.createdAt,
          requestedBy: a.requestedBy ? `${a.requestedBy.firstName} ${a.requestedBy.lastName}` : null,
          approver: a.approver ? `${a.approver.firstName} ${a.approver.lastName}` : null,
        };
      }),
      tickets: {
        open: ticketsOpen,
        blocked: ticketsBlocked,
        resolved: ticketsResolved,
      },
      recentTickets: recentTicketLinks.map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticket?.ticketNumber || null,
        title: t.ticket?.title || null,
        status: t.ticket?.status || null,
        assignee: t.ticket?.assigneeGlpiUser?.fullName || null,
        recommendation: t.recommendation?.title || null,
        createdAt: t.createdAt,
      })),
      documents: { totalDocuments, totalEvidence, sensitiveEvidence },
      riskControl: {
        activeRisks,
        risksWithoutControls,
        totalControls,
        totalRiskControlLinks,
      },
      recentActivity: recentLogs.map((l: any) => ({
        id: l.id,
        actor: l.user ? `${l.user.firstName} ${l.user.lastName}` : 'Système',
        action: l.action,
        entity: l.entityName ? `${l.entityName}${l.entityId ? ` #${l.entityId}` : ''}` : null,
        time: l.createdAt,
      })),
      unreadNotifications,
      performance: {
        coverageRate,
        totalAuditableEntities,
        coveredEntitiesCount: coveredEntitiesCountVal,
        avgFindingCloseDays,
        avgRecoCloseDays,
        procedureConformityRate,
        proceduresOk,
        proceduresTotal,
        auditorWorkload,
        findingsTrend,
        missionsOnTimeRate,
        missionsLate,
        completedMissionsCount,
      },
    });
  } catch (error: any) {
    console.error('🔥 MAIN DASHBOARD ERROR:', error);
    res.status(500).json({ message: 'Internal error' });
  }
});

export default router;
