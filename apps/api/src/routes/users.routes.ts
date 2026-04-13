import { Router } from 'express';
const prisma = require('@audit/database').default;
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { changePassword } from '../controllers/auth.controller';

const router = Router();

// PUT /api/v1/users/change-password
router.put('/change-password', requireAuth, changePassword);

// GET /api/users
router.get('/', requireAuth, requirePermission('user:read'), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: {
          select: {
            name: true
          }
        }
      }
    });
    res.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

export default router;
