import { AiError, REQUESTED_MODELS, ROLES, type AiConfig, type Role } from './config.ts';
type JsonObject = Record<string, unknown>;
export const object = (value: unknown): JsonObject => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AiError('OUTPUT', 'The model returned an invalid response. No marks were changed.');
  return value as JsonObject;
};
export type Completion = { model: string; generationId: string; value: unknown };
export type CouncilTransport = (role: Role, instruction: string, input: unknown) => Promise<Completion>;
type Model = { id: string; name: string; context_length: number; pricing: Record<string, string> };
const normal = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
async function boundedJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new AiError('PROVIDER', 'The AI service returned an empty response.');
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 4_000_000) { await reader.cancel(); throw new AiError('PROVIDER', 'The AI response exceeded its size limit.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new AiError('PROVIDER', 'The AI service returned invalid data.'); }
}
// This fixed, server-owned adapter is not a browser-accessible arbitrary proxy.
export async function composioCouncil(config: AiConfig, send: typeof fetch = fetch): Promise<CouncilTransport> {
  async function call(path: string, body?: unknown) {
    let response: Response;
    try { response = await send(`https://backend.composio.dev/api/v3/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'x-api-key': config.apiKey, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(45_000), redirect: 'error',
    }); } catch { throw new AiError('UNCERTAIN', 'The AI request did not finish reliably. It has not been automatically repeated.'); }
    if (response.status === 429) throw new AiError('RATE_LIMIT', 'The free AI service is busy. Try again later.', Math.min(3600, Math.max(1, Number(response.headers.get('retry-after')) || 60)));
    if (!response.ok) throw new AiError('PROVIDER', 'The AI provider could not complete this step. No substitute model was used.');
    return object(await boundedJson(response));
  }
  const account = await call(`connected_accounts/${encodeURIComponent(config.accountId)}`);
  if (account.status !== 'ACTIVE' || object(account.toolkit).slug !== 'openrouter') throw new AiError('SETUP', 'The configured OpenRouter connection is not active.');
  async function execute(tool: 'OPENROUTER_LIST_MODEL_ENDPOINTS' | 'OPENROUTER_CREATE_CHAT_COMPLETION', args: unknown) {
    const result = await call(`tools/execute/${tool}`, { connected_account_id: config.accountId, version: config.toolVersion, arguments: args });
    if (result.successful !== true) {
      // Composio may accept the transport request (HTTP 200) while its
      // upstream model returns 429. Preserve cooldowns for that case too.
      const detail = result.data && typeof result.data === 'object' && !Array.isArray(result.data) ? result.data as JsonObject : null;
      if (detail?.status_code === 429) throw new AiError('RATE_LIMIT', 'The free AI service is busy. Try again later.', 60);
      throw new AiError('PROVIDER', 'Composio did not confirm a successful AI request.');
    }
    return object(result.data);
  }
  const selected = new Map<Role, Model>();
  for (const role of ROLES) {
    const [author, slug, extra] = config.models[role].split('/');
    if (!author || !slug || extra || !slug.endsWith(':free')) throw new AiError('SETUP', 'The configured model identity is invalid.');
    // Model-list tools can return a partial catalogue without a pagination link.
    // Verify the exact configured model and all its serving routes instead.
    const detail = await execute('OPENROUTER_LIST_MODEL_ENDPOINTS', { author, slug });
    const m = object(detail.data);
    if (m.id !== config.models[role] || typeof m.name !== 'string' || !normal(m.name).includes(normal(REQUESTED_MODELS[role]))) throw new AiError('SETUP', `The identity of ${REQUESTED_MODELS[role]} could not be verified.`);
    if (!Array.isArray(m.endpoints) || m.endpoints.length === 0) throw new AiError('SETUP', `The requested ${REQUESTED_MODELS[role]} endpoint is unavailable.`);
    const contexts: number[] = [];
    for (const raw of m.endpoints) {
      const endpoint = object(raw), pricing = object(endpoint.pricing);
      // No provider override is exposed by the discovered completion tool.
      // Every routable endpoint must therefore be explicitly free; never rely
      // on the cheapest provider or silently fall back to a paid route.
      if (endpoint.model_id !== m.id || endpoint.status !== 0 || typeof endpoint.context_length !== 'number' || !Number.isFinite(endpoint.context_length) || endpoint.context_length <= 0 || pricing.prompt === undefined || pricing.completion === undefined || !Object.values(pricing).every((price) => (typeof price === 'string' && price.trim() !== '' && Number(price) === 0) || (typeof price === 'number' && price === 0))) throw new AiError('SETUP', `The availability or free pricing of ${REQUESTED_MODELS[role]} could not be verified.`);
      contexts.push(endpoint.context_length);
    }
    selected.set(role, { id: m.id as string, name: m.name, context_length: Math.min(...contexts), pricing: { prompt: '0', completion: '0' } });
  }
  return async (role, instruction, input) => {
    const model = selected.get(role)!;
    const content = JSON.stringify(input);
    if (new TextEncoder().encode(content + instruction).byteLength + 6000 > model.context_length) throw new AiError('SETUP', 'This answer set is too large for the selected model. No student work was truncated.');
    const data = await execute('OPENROUTER_CREATE_CHAT_COMPLETION', {
      model: model.id, stream: false, n: 1, temperature: 0, max_tokens: 6000,
      messages: [{ role: 'system', content: instruction }, { role: 'user', content }],
    });
    if (typeof data.model !== 'string' || data.model.replace(/:free$/, '') !== model.id.replace(/:free$/, '') || !Array.isArray(data.choices) || data.choices.length !== 1 || typeof data.id !== 'string') throw new AiError('OUTPUT', 'The AI model identity or response could not be confirmed.');
    const choice = object(data.choices[0]), message = object(choice.message);
    // Hidden reasoning is never substituted for the model's final answer.
    if (choice.finish_reason !== 'stop' || typeof message.content !== 'string' || message.content.length > 100_000) throw new AiError('OUTPUT', 'The AI response was incomplete. No marks were changed.');
    let value: unknown; try { value = JSON.parse(message.content); } catch { throw new AiError('OUTPUT', 'The AI response did not follow the required review format.'); }
    return { model: data.model, generationId: data.id, value };
  };
}
