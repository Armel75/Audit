// Service pour récupérer toutes les données findings/recommendations filtrées et sécurisées
// (ne rien inventer, utiliser les services existants)
const prisma = require('@audit/database').default;
import { getMissionAccessFilter, buildWhere } from '../controllers/missionExport.controller';
import { FindingService } from './finding.service';
import { RecommendationService } from './recommendation.service';

export async function getFindingsRecommendationsExportData(user: any, filters: any) {
  // 1. Construire le filtre premium comme l'export missions
  const tenantId = user?.tenantId;
  let body = filters;
  // Si filters vient de la query, il peut manquer logic/filters/mode, on normalise
  if (!body.logic) body.logic = 'AND';
  if (!body.filters) body.filters = [];
  if (!body.mode) body.mode = 'active';
  const accessFilter = getMissionAccessFilter(user);
  const where = buildWhere(body, tenantId, accessFilter ?? undefined);

  // 2. Récupérer les missions accessibles premium
  const missions = await prisma.auditMission.findMany({
    where,
    include: {
      leader: { select: { id: true, firstName: true, lastName: true, email: true } },
      plan: { select: { id: true, year: true, title: true } },
      auditType: { select: { id: true, name: true } },
      _count: { select: { findings: true, documents: true, members: true, scopes: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 3. Pour chaque mission, récupérer findings et recommendations
  const results = [];
  for (const mission of missions) {
    const findings = await FindingService.getByMissionIdWithFilters(mission.id, filters);
    const recommendations = await RecommendationService.getByMissionIdWithFilters(mission.id, filters);
    results.push({
      mission,
      findings,
      recommendations,
    });
  }
  return results;
}
