import { WorkflowRules } from './workflow.engine';

export const recommendationWorkflow: WorkflowRules = {
  DRAFT: ['OPEN'],
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['IMPLEMENTED'],
  IMPLEMENTED: ['VALIDATED'],
  VALIDATED: ['CLOSED'],
  CLOSED: []
};