
import { Router } from 'express';
import { requireAuth, requirePermission, requireAnyPermission } from '../middleware/auth.middleware';
import * as hierarchyCommentController from '../controllers/hierarchyComment.controller';
import { hierarchyCommentUpload } from '../middleware/hierarchyCommentUpload';

const router = Router();
router.use(requireAuth);

// Liste premium de tous les commentaires hiérarchiques liés aux missions accessibles à l'utilisateur
router.get('/overview', requirePermission('comment:read'), hierarchyCommentController.getHierarchyCommentsOverview);
// Liste des commentaires pour un contexte (ex: mission, recommendation)
router.get('/', requirePermission('comment:read'), hierarchyCommentController.getHierarchyComments);
// Un commentaire par id
router.get('/:id', requirePermission('comment:read'), hierarchyCommentController.getHierarchyComment);
// Création (avec parsing multipart)
router.post('/', requirePermission('comment:create'), hierarchyCommentUpload.array('attachments'), hierarchyCommentController.createHierarchyComment);
// Mise à jour
router.patch('/:id', requirePermission('comment:update'), hierarchyCommentController.updateHierarchyComment);
// Suppression logique
router.delete('/:id', requirePermission('comment:delete'), hierarchyCommentController.deleteHierarchyComment);

export default router;
