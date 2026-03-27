import prisma from '@audit/database';

// 🔥 EXPORT FIABLE
export async function seedPermissionsIfEmpty() {
  const count = await prisma.permission.count();

  if (count > 0) {
    console.log('[SEED] Permissions déjà présentes → skip');
    return;
  }

  console.log('[SEED] Initialisation des permissions...');

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }

  console.log('[SEED] Permissions créées');
}

// ================= DATA =================
const permissions = [

    //permissions dynamiques par module (comme AWS IAM)

    
  // ================= ADMIN =================
  { code: 'admin:access', description: 'Accès à l’administration' },

  // ================= USERS =================
  { code: 'user:create', description: 'Créer un utilisateur' },
  { code: 'user:read', description: 'Voir les utilisateurs' },
  { code: 'user:update', description: 'Modifier un utilisateur' },
  { code: 'user:delete', description: 'Désactiver un utilisateur' },
  { code: 'user:approve', description: 'Valider un utilisateur' },

  // ================= TENANTS =================
  { code: 'tenant:create', description: 'Créer un tenant' },
  { code: 'tenant:read', description: 'Voir les tenants' },
  { code: 'tenant:update', description: 'Modifier un tenant' },
  { code: 'tenant:delete', description: 'Désactiver un tenant' },

  // ================= ROLES =================
  { code: 'role:create', description: 'Créer un rôle' },
  { code: 'role:read', description: 'Voir les rôles' },
  { code: 'role:update', description: 'Modifier un rôle' },
  { code: 'role:delete', description: 'Supprimer un rôle' },
  { code: 'role:assign_permissions', description: 'Gérer les permissions d’un rôle' },

  // ================= PERMISSIONS =================
  { code: 'permission:create', description: 'Créer une permission' },
  { code: 'permission:read', description: 'Voir les permissions' },
  { code: 'permission:update', description: 'Modifier une permission' },
  { code: 'permission:delete', description: 'Supprimer une permission' },

  // ================= DEPARTMENT =================
  { code: 'department:create', description: 'Créer un département' },
  { code: 'department:read', description: 'Voir les départements' },
  { code: 'department:update', description: 'Modifier un département' },
  { code: 'department:delete', description: 'Supprimer un département' },

  // ================= AUDIT PLAN =================
  { code: 'audit_plan:create', description: 'Créer un plan d’audit' },
  { code: 'audit_plan:read', description: 'Voir les plans d’audit' },
  { code: 'audit_plan:update', description: 'Modifier un plan d’audit' },
  { code: 'audit_plan:approve', description: 'Approuver un plan d’audit' },

  // ================= AUDIT MISSION =================
  { code: 'audit_mission:create', description: 'Créer une mission' },
  { code: 'audit_mission:read', description: 'Voir les missions' },
  { code: 'audit_mission:update', description: 'Modifier une mission' },
  { code: 'audit_mission:assign', description: 'Assigner des membres à une mission' },

  // ================= AUDIT PROGRAM =================
  { code: 'audit_program:create', description: 'Créer un programme d’audit' },
  { code: 'audit_program:read', description: 'Voir les programmes' },
  { code: 'audit_program:update', description: 'Modifier un programme' },
  { code: 'audit_program:approve', description: 'Approuver un programme' },

  // ================= AUDIT PROCEDURE =================
  { code: 'audit_procedure:create', description: 'Créer une procédure' },
  { code: 'audit_procedure:read', description: 'Voir les procédures' },
  { code: 'audit_procedure:update', description: 'Modifier une procédure' },
  { code: 'audit_procedure:execute', description: 'Exécuter une procédure' },

  // ================= FINDINGS =================
  { code: 'finding:create', description: 'Créer un constat' },
  { code: 'finding:read', description: 'Voir les constats' },
  { code: 'finding:update', description: 'Modifier un constat' },
  { code: 'finding:validate', description: 'Valider un constat' },

  // ================= RECOMMENDATIONS =================
  { code: 'recommendation:create', description: 'Créer une recommandation' },
  { code: 'recommendation:read', description: 'Voir les recommandations' },
  { code: 'recommendation:update', description: 'Modifier une recommandation' },
  { code: 'recommendation:validate', description: 'Valider une recommandation' },
  { code: 'recommendation:assign', description: 'Assigner une recommandation' },

  // ================= DOCUMENT =================
  { code: 'document:upload', description: 'Uploader un document' },
  { code: 'document:read', description: 'Voir les documents' },
  { code: 'document:delete', description: 'Supprimer un document' },

  // ================= EVIDENCE =================
  { code: 'evidence:create', description: 'Créer une preuve' },
  { code: 'evidence:read', description: 'Voir les preuves' },

  // ================= RISK =================
  { code: 'risk:create', description: 'Créer un risque' },
  { code: 'risk:read', description: 'Voir les risques' },
  { code: 'risk:update', description: 'Modifier un risque' },

  // ================= CONTROL =================
  { code: 'control:create', description: 'Créer un contrôle' },
  { code: 'control:read', description: 'Voir les contrôles' },
  { code: 'control:update', description: 'Modifier un contrôle' },

  // ================= BUSINESS PROCESS =================
  { code: 'business_process:create', description: 'Créer un processus métier' },
  { code: 'business_process:read', description: 'Voir les processus métier' },
  { code: 'business_process:update', description: 'Modifier un processus métier' },

  // ================= TOKENS =================
  { code: 'token:read', description: 'Voir les tokens' },
  { code: 'token:revoke', description: 'Révoquer les tokens' },

  // ================= AUDIT LOG =================
  { code: 'audit_log:read', description: 'Voir les logs système' },
];