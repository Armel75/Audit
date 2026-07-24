// GET: Liste premium de tous les commentaires hiérarchiques liés aux missions accessibles à l'utilisateur
import { Request, Response } from 'express';
const prisma = require('@audit/database').default;
import { getMissionAccessFilter } from './mission.controller';
import { NotificationService, NOTIFICATION_TYPES } from '../services/notification.service';

export const getHierarchyCommentsOverview = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    // 1. Récupérer les missions accessibles à l'utilisateur
    const accessFilter = getMissionAccessFilter(req.user);
    const missionWhere: any = { tenantId };
    if (accessFilter) {
      missionWhere.AND = [accessFilter];
    }
    const missions = await prisma.auditMission.findMany({
      where: missionWhere,
      select: { id: true, title: true }
    });
    const missionIds = missions.map((m: any) => m.id);
    if (!missionIds.length) return res.json([]);

    // 2. Récupérer les commentaires hiérarchiques liés à ces missions
    const comments = await prisma.hierarchyComment.findMany({
      where: {
        tenantId,
        contextType: 'MISSION',
        contextId: { in: missionIds },
        deletedAt: null
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        documents: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Mapping premium pour le frontend
    const mapped = comments.map((c: any) => ({
      id: c.id,
      missionId: c.contextId,
      missionTitle: missions.find((m: any) => m.id === c.contextId)?.title || '',
      type: c.type,
      typeLabel: c.type, // (option: tu peux mapper le label côté FE)
      title: c.title,
      content: c.content,
      authorName: c.createdBy ? `${c.createdBy.firstName} ${c.createdBy.lastName}` : '',
      createdAt: c.createdAt,
      documents: c.documents?.map((d: any) => ({
        id: d.id,
        originalName: d.originalName,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        url: `/api/audit/documents/download/${d.id}`
      })) || []
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching hierarchy comments overview:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commentaires hiérarchiques' });
  }
};
import { DocumentService } from '../services/document.service';

// GET: Liste des commentaires hiérarchiques par contexte (ex: mission, recommendation)
export const getHierarchyComments = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { contextType, contextId } = req.query;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });
    if (!contextType || !contextId) return res.status(400).json({ error: 'Contexte requis' });

    const comments = await prisma.hierarchyComment.findMany({
      where: {
        tenantId,
        contextType: String(contextType),
        contextId: Number(contextId),
        deletedAt: null
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
        parentComment: { select: { id: true, title: true } },
        childComments: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    // Map createdBy en author pour chaque commentaire
    const mapped = comments.map((c: any) => ({
      ...c,
      author: c.createdBy,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching hierarchy comments:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
  }
};

// GET: Un commentaire hiérarchique par id
export const getHierarchyComment = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });
    const comment = await prisma.hierarchyComment.findFirst({
      where: { id: Number(id), tenantId, deletedAt: null },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
        parentComment: { select: { id: true, title: true } },
        childComments: { select: { id: true, title: true } }
      }
    });
    if (!comment) return res.status(404).json({ error: 'Commentaire introuvable' });
    res.json(comment);
  } catch (error) {
    console.error('Error fetching hierarchy comment:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du commentaire' });
  }
};

// POST: Créer un commentaire hiérarchique
export const createHierarchyComment = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const createdById = req.user?.id;
    const {
      contextType, contextId, type, title, content, status, permissionCode, parentCommentId, visibility, isPinned, documents
    } = req.body;
    if (!tenantId || !createdById) return res.status(401).json({ error: 'Non autorisé' });
    if (!contextType || !contextId || !type || !title) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    // 1. Créer le commentaire d'abord
    const comment = await prisma.hierarchyComment.create({
      data: {
        tenantId,
        contextType,
        contextId: Number(contextId),
        type,
        title,
        content: content || '',
        status: status || 'PUBLISHED',
        permissionCode: permissionCode || '',
        parentCommentId: parentCommentId ? Number(parentCommentId) : null,
        visibility: visibility || 'PUBLIC',
        isPinned: !!isPinned,
        createdById,
        updatedById: createdById,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
        parentComment: { select: { id: true, title: true } },
        childComments: { select: { id: true, title: true } }
      }
    });

    // 2. Si fichiers, les rattacher au commentaire
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        const saved = await DocumentService.saveFileLocally(
          tenantId,
          file.buffer,
          file.originalname,
          file.mimetype
        );
        await prisma.document.create({
          data: {
            tenantId,
            originalName: saved.originalName,
            mimeType: saved.mimeType,
            sizeBytes: saved.sizeBytes,
            storagePath: saved.storagePath,
            fileHash: saved.fileHash,
            uploadedById: createdById,
            hierarchyCommentId: comment.id
          }
        });
      }
    }

    // 3. Retourner le commentaire avec ses documents à jour
    const commentWithDocs = await prisma.hierarchyComment.findUnique({
      where: { id: comment.id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
        parentComment: { select: { id: true, title: true } },
        childComments: { select: { id: true, title: true } }
      }
    });

    // 🔔 Notification aux membres de la mission concernée
    if (contextType === 'MISSION' && contextId) {
      try {
        const mission = await prisma.auditMission.findFirst({
          where: { id: Number(contextId), tenantId },
          include: { members: true }
        });

        if (mission) {
          await NotificationService.notifyMissionMembers(
            tenantId,
            { id: mission.id, leaderId: mission.leaderId, members: mission.members },
            NOTIFICATION_TYPES.HIERARCHY_COMMENT_ADDED,
            'Nouveau commentaire hiérarchique',
            `Un commentaire "${title}" a été ajouté à la mission "${mission.title}".`,
            createdById,
          );
        }
      } catch (notifErr) {
        console.error('Erreur notification commentaire hiérarchique:', notifErr);
      }
    }

    res.status(201).json({
      ...commentWithDocs,
      author: commentWithDocs?.createdBy,
    });
  } catch (error) {
    console.error('Error creating hierarchy comment:', error);
    res.status(500).json({ error: 'Erreur lors de la création du commentaire' });
  }
};

// PATCH: Mettre à jour un commentaire hiérarchique (soft update, pas de logique métier cassée)
export const updateHierarchyComment = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const updatedById = req.user?.id;
    const { id } = req.params;
    const {
      title, content, status, permissionCode, parentCommentId, visibility, isPinned, documents
    } = req.body;
    if (!tenantId || !updatedById) return res.status(401).json({ error: 'Non autorisé' });
    const existing = await prisma.hierarchyComment.findFirst({ where: { id: Number(id), tenantId, deletedAt: null } });
    if (!existing) return res.status(404).json({ error: 'Commentaire introuvable' });
    const comment = await prisma.hierarchyComment.update({
      where: { id: Number(id) },
      data: {
        title: title ?? existing.title,
        content: content ?? existing.content,
        status: status ?? existing.status,
        permissionCode: permissionCode ?? existing.permissionCode,
        parentCommentId: parentCommentId !== undefined ? Number(parentCommentId) : existing.parentCommentId,
        visibility: visibility ?? existing.visibility,
        isPinned: isPinned !== undefined ? !!isPinned : existing.isPinned,
        updatedById,
        updatedAt: new Date(),
        documents: documents && Array.isArray(documents)
          ? { set: documents.map((id: number) => ({ id })) }
          : undefined
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
        parentComment: { select: { id: true, title: true } },
        childComments: { select: { id: true, title: true } }
      }
    });
    res.json(comment);
  } catch (error) {
    console.error('Error updating hierarchy comment:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du commentaire' });
  }
};

// DELETE: Suppression logique (soft delete)
export const deleteHierarchyComment = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { id } = req.params;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });
    const existing = await prisma.hierarchyComment.findFirst({ where: { id: Number(id), tenantId, deletedAt: null } });
    if (!existing) return res.status(404).json({ error: 'Commentaire introuvable' });
    await prisma.hierarchyComment.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date(), updatedById: userId }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting hierarchy comment:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du commentaire' });
  }
};
