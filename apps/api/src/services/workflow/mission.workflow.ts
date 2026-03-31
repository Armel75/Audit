import { WorkflowRules } from './workflow.engine';

export const missionWorkflow: WorkflowRules = {
  PLANNED: ['READY'],
  READY: ['IN_PROGRESS'],
  IN_PROGRESS: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED'],
  APPROVED: ['CLOSED'],
  CLOSED: []
};