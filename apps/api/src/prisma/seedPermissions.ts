const prisma = require('@audit/database').default;

export async function seedPermissionsIfEmpty() {
  console.log('[SEED] Synchronisation des permissions...');

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }

  console.log('[SEED] Permissions synchronisees');
}

const permissions = [
  // ================= ADMIN =================
  { code: 'admin:access', description: 'Acceder a l administration' },

  // ================= USERS =================
  { code: 'user:create', description: 'Creer un utilisateur' },
  { code: 'user:read', description: 'Voir les utilisateurs' },
  { code: 'user:update', description: 'Modifier un utilisateur' },
  { code: 'user:delete', description: 'Desactiver un utilisateur' },
  { code: 'user:approve', description: 'Valider un utilisateur' },

  // ================= TENANTS =================
  { code: 'tenant:create', description: 'Creer un tenant' },
  { code: 'tenant:read', description: 'Voir les tenants' },
  { code: 'tenant:update', description: 'Modifier un tenant' },
  { code: 'tenant:delete', description: 'Desactiver un tenant' },

  // ================= ROLES =================
  { code: 'role:create', description: 'Creer un role' },
  { code: 'role:read', description: 'Voir les roles' },
  { code: 'role:update', description: 'Modifier un role' },
  { code: 'role:delete', description: 'Supprimer un role' },
  { code: 'role:assign_permissions', description: 'Gerer les permissions d un role' },

  // ================= PERMISSIONS =================
  { code: 'permission:create', description: 'Creer une permission' },
  { code: 'permission:read', description: 'Voir les permissions' },
  { code: 'permission:update', description: 'Modifier une permission' },
  { code: 'permission:delete', description: 'Supprimer une permission' },

  // ================= SETTINGS =================
  { code: 'settings:read', description: 'Acceder aux parametres' },
  { code: 'settings:update', description: 'Modifier les parametres' },
  { code: 'audit_type:read', description: 'Voir les types d audit' },
  { code: 'risk_level:read', description: 'Voir les niveaux de risque' },
  { code: 'priority_level:read', description: 'Voir les niveaux de priorite' },


  // ================= HIERARCHY COMMENTS (PREMIUM) =================
  { code: 'comment:read', description: 'Voir les commentaires hiérarchiques premium' },
  { code: 'comment:create', description: 'Créer un commentaire hiérarchique premium' },
  { code: 'comment:update', description: 'Modifier un commentaire hiérarchique premium' },
  { code: 'comment:delete', description: 'Supprimer (logique) un commentaire hiérarchique premium' },

  // ================= REFERENTIAL =================
  { code: 'referential:access', description: 'Acceder au referentiel' },

  // ================= DEPARTMENT =================
  { code: 'department:create', description: 'Creer un departement' },
  { code: 'department:read', description: 'Voir les departements' },
  { code: 'department:update', description: 'Modifier un departement' },
  { code: 'department:delete', description: 'Supprimer un departement' },

  // ================= AUDIT PLAN =================
  { code: 'audit_plan:create', description: 'Creer un plan d audit' },
  { code: 'audit_plan:read', description: 'Voir les plans d audit' },
  { code: 'audit_plan:update', description: 'Modifier un plan d audit' },
  { code: 'audit_plan:delete', description: 'Supprimer un plan d audit' },
  { code: 'audit_plan:approve', description: 'Approuver un plan d audit' },

  // ================= AUDIT MISSION =================
  { code: 'audit_mission:create', description: 'Creer une mission' },
  { code: 'audit_mission:read', description: 'Voir les missions assignees' },
  { code: 'audit_mission:read_all', description: 'Voir toutes les missions' },
  { code: 'audit_mission:update', description: 'Modifier une mission' },
  { code: 'audit_mission:delete', description: 'Supprimer une mission' },
  { code: 'audit_mission:assign', description: 'Assigner des membres a une mission' },
  { code: 'audit_mission:filter', description: 'Filtrer les missions par pilote' },
  // Permissions granulaires pour les actions critiques sur les missions
  { code: 'audit_mission:launch', description: 'Lancer une mission' },
  { code: 'audit_mission:submit_review', description: 'Soumettre une mission en revue' },
  { code: 'audit_mission:rollback', description: 'Revenir à une étape précédente de la mission' },
  { code: 'audit_mission:cancel', description: 'Annuler une mission (statut annulé)' },
  { code: 'audit_mission:approve', description: 'Approuver une mission (valider après revue)' },

  // ================= AUDIT PROGRAM =================
  { code: 'audit_program:create', description: 'Creer un programme d audit' },
  { code: 'audit_program:read', description: 'Voir les programmes' },
  { code: 'audit_program:update', description: 'Modifier un programme' },
  { code: 'audit_program:delete', description: 'Supprimer un programme' },
  { code: 'audit_program:approve', description: 'Approuver un programme' },

  // ================= AUDIT PROCEDURE =================
  { code: 'audit_procedure:create', description: 'Creer une procedure' },
  { code: 'audit_procedure:read', description: 'Voir les procedures' },
  { code: 'audit_procedure:update', description: 'Modifier une procedure' },
  { code: 'audit_procedure:delete', description: 'Supprimer une procedure' },
  { code: 'audit_procedure:execute', description: 'Executer une procedure' },

  // ================= FINDINGS =================
  { code: 'finding:create', description: 'Creer un constat' },
  { code: 'finding:read', description: 'Voir les constats' },
  { code: 'finding:update', description: 'Modifier un constat' },
  { code: 'finding:comment', description: 'Commenter un constat' },
  { code: 'finding:submit', description: 'Soumettre un constat pour validation' },
  { code: 'finding:reject', description: 'Rejeter un constat' },
  { code: 'finding:validate', description: 'Valider un constat' },

  // ================= RECOMMENDATIONS =================
  { code: 'recommendation:create', description: 'Creer une recommandation' },
  { code: 'recommendation:read', description: 'Voir les recommandations' },
  { code: 'recommendation:update', description: 'Modifier une recommandation' },
  { code: 'recommendation:comment', description: 'Commenter une recommandation' },
  { code: 'recommendation:follow_up', description: 'Ajouter un suivi a une recommandation' },
  { code: 'recommendation:validate', description: 'Valider une recommandation' },
  { code: 'recommendation:reject', description: 'Rejeter une recommandation' },
  { code: 'recommendation:assign', description: 'Assigner une recommandation' },

  // ================= APPROVAL =================
  { code: 'approval:read', description: 'Voir les approbations' },
  { code: 'approval:create', description: 'Creer une approbation' },
  { code: 'approval:decide', description: 'Decider une approbation' },

  // ================= DOCUMENT =================
  { code: 'document:upload', description: 'Uploader un document' },
  { code: 'document:read', description: 'Voir les documents' },
  { code: 'document:delete', description: 'Supprimer un document' },

  // ================= EVIDENCE =================
  { code: 'evidence:create', description: 'Creer une preuve' },
  { code: 'evidence:read', description: 'Voir les preuves' },
  { code: 'evidence:update', description: 'Modifier une preuve' },
  { code: 'evidence:delete', description: 'Supprimer une preuve' },

  // ================= RISK =================
  { code: 'risk:create', description: 'Creer un risque' },
  { code: 'risk:read', description: 'Voir les risques' },
  { code: 'risk:update', description: 'Modifier un risque' },
  { code: 'risk:delete', description: 'Supprimer un risque' },

  // ================= CONTROL =================
  { code: 'control:create', description: 'Creer un controle' },
  { code: 'control:read', description: 'Voir les controles' },
  { code: 'control:update', description: 'Modifier un controle' },
  { code: 'control:delete', description: 'Supprimer un controle' },

  // ================= BUSINESS PROCESS =================
  { code: 'business_process:create', description: 'Creer un processus metier' },
  { code: 'business_process:read', description: 'Voir les processus metier' },
  { code: 'business_process:update', description: 'Modifier un processus metier' },
  { code: 'business_process:delete', description: 'Supprimer un processus metier' },

  // ================= AUDITABLE ENTITY =================
  { code: 'auditable_entity:create', description: 'Creer une entite auditable' },
  { code: 'auditable_entity:read', description: 'Voir les entites auditables' },
  { code: 'auditable_entity:update', description: 'Modifier une entite auditable' },
  { code: 'auditable_entity:delete', description: 'Supprimer une entite auditable' },

  // ================= RISK CONTROL =================
  { code: 'risk_control:create', description: 'Creer un lien risque controle' },
  { code: 'risk_control:read', description: 'Voir les liens risque controle' },
  { code: 'risk_control:update', description: 'Modifier un lien risque controle' },
  { code: 'risk_control:delete', description: 'Supprimer un lien risque controle' },

  // ================= GLPI =================
  { code: 'glpi:read', description: 'Voir les donnees GLPI' },
  { code: 'glpi:manage', description: 'Gerer les liaisons GLPI' },

  // ================= DASHBOARD =================
  { code: 'dashboard:read', description: 'Voir le tableau de bord' },
  { code: 'dashboard_dg:read', description: 'Voir le tableau de bord DG' },

  // ================= TOKENS =================
  { code: 'token:read', description: 'Voir les tokens' },
  { code: 'token:revoke', description: 'Revoquer les tokens' },

  // ================= AUDIT LOG =================
  { code: 'audit_log:read', description: 'Voir les logs systeme' },
];
