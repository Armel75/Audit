import { Router } from 'express';
import * as approvalController from '../controllers/approval.controller';
import { requireAuth, requireAnyPermission } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requireAnyPermission(['approval:read', 'audit_plan:approve', 'audit_program:approve', 'finding:validate', 'recommendation:validate']), approvalController.getApprovals);

router.post('/', requireAnyPermission(['approval:create', 'audit_plan:update', 'audit_program:update', 'finding:update', 'recommendation:update']), approvalController.createApproval);

router.put(
  '/:id/decide',
  requireAnyPermission(['approval:decide', 'audit_plan:approve', 'audit_program:approve', 'finding:validate', 'recommendation:validate']),
  approvalController.decideApproval
);

// router.put(
//   '/:id/decide',
//   approvalController.decideApproval
// );

export default router;
