import { WorkflowRules } from './workflow.engine';

export const missionWorkflow: WorkflowRules = {
  PLANNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED'],
  APPROVED: ['CLOSED'],
  CLOSED: []
};