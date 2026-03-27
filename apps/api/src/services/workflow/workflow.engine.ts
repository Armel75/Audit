export type WorkflowRules = {
  [status: string]: string[];
};

export function canTransition(
  current: string,
  next: string,
  rules: WorkflowRules
): boolean {
  return rules[current]?.includes(next) ?? false;
}