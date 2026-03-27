import { WorkflowRules } from './workflow.engine';

export const findingWorkflow: WorkflowRules = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['CONFIRMED', 'REJECTED'],
  CONFIRMED: [],
  REJECTED: []
};