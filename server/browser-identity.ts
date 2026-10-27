import { parsePseudonym } from '../lib/student-profile.ts';
const DEVICE = '__Host-igcses-device', PROFILE = '__Host-igcses-profile';
const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), (b) => b.toString(16).padStart(2, '0')).join('');
function cookie(request: Request, name: string): string | null {
  const values = (request.headers.get('cookie') ?? '').split(';').map((part) => part.trim()).filter((part) => part.startsWith(`${name}=`));
  if (values.length !== 1) return null;
  const value = values[0].slice(name.length + 1);
  return /^[a-f0-9]{64}$/.test(value) ? value : null;
}
export async function browserOwner(request: Request): Promise<string | null> {
  const device = cookie(request, DEVICE), profile = cookie(request, PROFILE);
  return device && profile ? `browser:${await digest(`${device}:${profile}`)}` : null;
}
export async function examRequestId(ownerId: string, subject: string, key: string) {
  return `exam_${await digest(JSON.stringify([ownerId, subject, key]))}`;
}
function setCookie(response: Response, name: string, value: string, maxAge = 31536000) {
  response.headers.append('Set-Cookie', `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`);
}
// A random browser-held capability, not the nickname, separates devices. Names
// remain switchable labels within this browser and never authenticate a person.
export async function browserSessionResponse(request: Request): Promise<Response> {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Origin not allowed.' }, { status: 403, headers });
  const response = Response.json({ saved: true }, { headers });
  if (request.method === 'DELETE') { setCookie(response, PROFILE, '', 0); return response; }
  const reader = request.body?.getReader(); if (!reader) return Response.json({ error: 'Study name required.' }, { status: 400, headers });
  let size = 0; const chunks: Uint8Array[] = [];
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 512) { await reader.cancel(); return Response.json({ error: 'Request too large.' }, { status: 413, headers }); } chunks.push(value); }
  const bytes = new Uint8Array(size); let at = 0; for (const part of chunks) { bytes.set(part, at); at += part.length; }
  let name: string;
  try { const data = JSON.parse(new TextDecoder().decode(bytes)); if (!data || Object.keys(data).join() !== 'pseudonym') throw new Error(); name = parsePseudonym(data.pseudonym); } catch { return Response.json({ error: 'Choose a valid study name.' }, { status: 400, headers }); }
  const device = cookie(request, DEVICE) ?? Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
  setCookie(response, DEVICE, device);
  setCookie(response, PROFILE, await digest(name.normalize('NFC').trim().toLowerCase()));
  return response;
}
