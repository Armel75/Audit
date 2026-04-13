import { Router } from 'express';
import * as missionController from '../controllers/mission.controller';
import * as missionExportController from '../controllers/missionExport.controller';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all mission routes
router.use(requireAuth);

// Filtrage multi-critères + Export
router.post('/query', requirePermission('audit_mission:read'), missionExportController.queryMissions);
router.post('/export/excel', requirePermission('audit_mission:read'), missionExportController.exportMissionsExcel);
router.post('/export/pdf', requirePermission('audit_mission:read'), missionExportController.exportMissionsPdf);

// Audit Mission
router.get('/', requirePermission('audit_mission:read'), missionController.getMissions);
router.get('/:id', requirePermission('audit_mission:read'), missionController.getMission);
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
router.get('/:id/report', requirePermission('audit_mission:read'), missionController.getMissionReport);

router.post('/:id/report/generate', requireAnyPermission(['audit_mission:update', 'document:upload']), missionController.generateMissionReport);

// Ordre de Mission
router.get('/:id/order', requirePermission('audit_mission:read'), missionController.generateMissionOrder);

// Aggregated Tickets
router.get('/:id/tickets', requirePermission('audit_mission:read'), missionController.getMissionTickets);

export default router;
