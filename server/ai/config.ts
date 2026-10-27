export const ROLES = ['primary', 'second', 'evidence', 'patterns', 'tutor'] as const;
export type Role = typeof ROLES[number];
export const REQUESTED_MODELS: Record<Role, string> = {
  primary: 'Nemotron 3 Ultra', second: 'Nemotron 3 Super',
  evidence: 'Nemotron 3.5 Super VL', patterns: 'Xing4.0 29B', tutor: 'Gemma 4 31B',
};
export class AiError extends Error {
  code: 'SETUP' | 'PROVIDER' | 'RATE_LIMIT' | 'OUTPUT' | 'LOCKED' | 'BUSY' | 'UNCERTAIN';
  retryAfter: number;
  constructor(code: AiError['code'], message: string, retryAfter = 0) { super(message); this.code = code; this.retryAfter = retryAfter; }
}
export type AiConfig = { apiKey: string; accountId: string; toolVersion: string; models: Record<Role, string>; calibrationId: string };
export type CalibrationApproval = { id: string; models: Record<Role, string>; toolVersion: string; evidencePath: string };
// Populate only after real, source-linked educational evaluation of the exact
// five endpoints. Environment variables alone cannot certify a model team.
export const approvedAiCalibrations: readonly CalibrationApproval[] = Object.freeze([]);
export function aiConfiguration(values: Record<string, unknown>, approvals = approvedAiCalibrations): { config: AiConfig | null; missing: string[] } {
  const missing: string[] = [];
  const read = (key: string) => typeof values[key] === 'string' ? (values[key] as string).trim() : '';
  const apiKey = read('COMPOSIO_API_KEY'), accountId = read('COMPOSIO_OPENROUTER_ACCOUNT_ID'), toolVersion = read('COMPOSIO_OPENROUTER_TOOL_VERSION'), calibrationId = read('AI_CALIBRATION_ID');
  if (!apiKey) missing.push('Backend Composio credential');
  if (!/^ca_[A-Za-z0-9_-]+$/.test(accountId)) missing.push('Active OpenRouter account');
  if (!/^\d{8}_\d{2}$/.test(toolVersion)) missing.push('Pinned Composio tool version');
  if (!/^[A-Za-z0-9._:-]{3,160}$/.test(calibrationId)) missing.push('Reviewed educational calibration evidence');
  let parsed: unknown;
  try { parsed = JSON.parse(read('AI_COUNCIL_MODELS')); } catch { parsed = null; }
  const models = parsed as Record<Role, string> | null;
  if (!models || typeof models !== 'object' || Array.isArray(models) || Object.keys(models).sort().join() !== [...ROLES].sort().join() || ROLES.some((role) => typeof models[role] !== 'string' || !/^[a-zA-Z0-9._/-]+:free$/.test(models[role])) || new Set(ROLES.map((role) => models[role])).size !== 5) missing.push('Five distinct verified free model IDs');
  if (!approvals.some((a) => a.id === calibrationId && a.toolVersion === toolVersion && ROLES.every((role) => a.models[role] === models?.[role]))) missing.push('Approved live model-team evaluation');
  if (read('AI_ENABLED') !== 'true') missing.push('AI activation after live evaluation');
  return { config: missing.length ? null : { apiKey, accountId, toolVersion, calibrationId, models: models! }, missing };
}
