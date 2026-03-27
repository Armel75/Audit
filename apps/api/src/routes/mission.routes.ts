import { Router } from 'express';
import * as missionController from '../controllers/mission.controller';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all mission routes
router.use(requireAuth);

// Audit Mission
router.get('/', missionController.getMissions);
router.get('/:id', missionController.getMission);
router.post('/', missionController.createMission);
router.put('/:id', missionController.updateMission);
router.delete('/:id', missionController.deleteMission);

// Mission Status
router.patch('/:id/status', missionController.updateMissionStatus);
router.put('/history/:historyId', missionController.updateMissionStatusHistory);
router.delete('/history/:historyId', missionController.deleteMissionStatusHistory);

// Mission Members
router.post('/:id/members', missionController.addMissionMember);
router.put('/members/:memberId', missionController.updateMissionMember);
router.delete('/members/:memberId', missionController.removeMissionMember);

// Mission Scopes
router.post('/:id/scopes', missionController.addMissionScope);
router.delete('/scopes/:scopeId', missionController.removeMissionScope);

// Reports
router.get('/:id/report', missionController.getMissionReport);

router.post('/:id/report/generate', missionController.generateMissionReport);

export default router;