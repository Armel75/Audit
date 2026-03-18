import { Router } from 'express';
import * as missionController from '../controllers/mission.controller';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all mission routes
router.use(requireAuth);

// Audit Mission
router.get('/', missionController.getMissions);
router.get('/:id', missionController.getMission);
router.post('/', requirePermission('can_manage_tasks'), missionController.createMission);
router.put('/:id', requirePermission('can_manage_tasks'), missionController.updateMission);
router.delete('/:id', requirePermission('can_manage_tasks'), missionController.deleteMission);

// Mission Status
router.patch('/:id/status', requirePermission('can_manage_tasks'), missionController.updateMissionStatus);
router.put('/history/:historyId', requirePermission('can_manage_tasks'), missionController.updateMissionStatusHistory);
router.delete('/history/:historyId', requirePermission('can_manage_tasks'), missionController.deleteMissionStatusHistory);

// Mission Members
router.post('/:id/members', requirePermission('can_manage_tasks'), missionController.addMissionMember);
router.put('/members/:memberId', requirePermission('can_manage_tasks'), missionController.updateMissionMember);
router.delete('/members/:memberId', requirePermission('can_manage_tasks'), missionController.removeMissionMember);

// Mission Scopes
router.post('/:id/scopes', requirePermission('can_manage_tasks'), missionController.addMissionScope);
router.delete('/scopes/:scopeId', requirePermission('can_manage_tasks'), missionController.removeMissionScope);

// Reports
router.get('/:id/report', missionController.getMissionReport);

export default router;
