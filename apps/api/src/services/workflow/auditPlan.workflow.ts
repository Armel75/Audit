import { WorkflowRules } from './workflow.engine';

export const auditPlanWorkflow: WorkflowRules = {
  DRAFT: ['PENDING_APPROVAL'],

  PENDING_APPROVAL: ['VALIDATED', 'REJECTED'],

  REJECTED: ['DRAFT'], // possibilité de correction

  VALIDATED: [] // état final (verrouillé)
};