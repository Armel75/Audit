import { WorkflowRules } from './workflow.engine';

export const recommendationWorkflow: WorkflowRules = {
  DRAFT: ['OPEN', 'REJECTED'], // ✅ ajout
  OPEN: ['IN_PROGRESS', 'REJECTED'], // ✅ ajout
  IN_PROGRESS: ['IMPLEMENTED', 'REJECTED'], // ✅ ajout
  IMPLEMENTED: ['VALIDATED', 'REJECTED'], // ✅ ajout
  VALIDATED: ['CLOSED'],
  REJECTED: [], // ✅ état final
  CLOSED: []
};