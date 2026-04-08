export const MISSION_ACTION_TYPE = {
  START: 'START',
  SUBMIT: 'SUBMIT',
  APPROVE: 'APPROVE',
  CLOSE: 'CLOSE',
  CANCEL: 'CANCEL',
  REWORK: 'REWORK',
} as const;

export type MissionActionType =
  typeof MISSION_ACTION_TYPE[keyof typeof MISSION_ACTION_TYPE];