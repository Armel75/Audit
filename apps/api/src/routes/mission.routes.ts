import { Router } from 'express';
import * as missionController from '../controllers/mission.controller';
import * as missionExportController from '../controllers/missionExport.controller';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all mission routes
router.use(requireAuth);

// Filtrage multi-critères + Export
router.post('/query', requireAnyPermission(['audit_mission:read', 'audit_mission:read_all']), missionExportController.queryMissions);
router.post('/export/excel', requireAnyPermission(['audit_mission:read', 'audit_mission:read_all']), missionExportController.exportMissionsExcel);
router.post('/export/pdf', requireAnyPermission(['audit_mission:read', 'audit_mission:read_all']), missionExportController.exportMissionsPdf);

// Audit Mission
router.get('/', requireAnyPermission(['audit_mission:read', 'audit_mission:read_all']), missionController.getMissions);
router.get('/:id', requireAnyPermission(['audit_mission:read', 'audit_mission:read_all']), missionController.getMission);
router.post('/', requirePermission('audit_mission:create'), missionController.createMission);
router.put('/:id', requirePermission('audit_mission:update'), missionController.updateMission);
router.delete('/:id', requireAnyPermission(['audit_mission:delete', 'audit_mission:update']), missionController.deleteMission);

// Mission Status
router.patch('/:id/status', requirePermission('audit_mission:update'), missionController.updateMissionStatus);
router.put('/history/:historyId', requirePermission('audit_mission:update'), missionController.updateMissionStatusHistory);
router.delete('/history/:historyId', requirePermission('audit_mission:update'), missionController.deleteMissionStatusHistory);

// Mission Members
router.post('/:id/members', requirePermission('audit_mission:assign'), missionController.addMissionMember);
router.put('/members/:memberId', requirePermission('audit_mission:assign'), missionController.updateMissionMember);
router.delete('/members/:memberId', requirePermission('audit_mission:assign'), missionController.removeMissionMember);

// Mission Scopes
router.post('/:id/scopes', requirePermission('audit_mission:assign'), missionController.addMissionScope);
router.put('/scopes/:scopeId', requirePermission('audit_mission:assign'), missionController.updateMissionScope);
router.delete('/scopes/:scopeId', requirePermission('audit_mission:assign'), missionController.removeMissionScope);

// Reports
router.get('/:id/report', requireAnyPermission(['audit_mission:read', 'audit_mission:read_all']), missionController.getMissionReport);

router.post('/:id/report/generate', requireAnyPermission(['audit_mission:update', 'document:upload']), missionController.generateMissionReport);

// Ordre de Mission
router.get('/:id/order', requireAnyPermission(['audit_mission:read', 'audit_mission:read_all']), missionController.generateMissionOrder);

// Aggregated Tickets
router.get('/:id/tickets', requireAnyPermission(['audit_mission:read', 'audit_mission:read_all']), missionController.getMissionTickets);

export default router;
