import type { PrivateQuestion } from './quiz-contract.ts';
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value))
    return '[' + value.map(canonicalJson).join(',') + ']';
  return (
    '{' +
    Object.keys(value)
      .sort()
      .map(
        (k) =>
          JSON.stringify(k) +
          ':' +
          canonicalJson((value as Record<string, unknown>)[k]),
      )
      .join(',') +
    '}'
  );
}
export async function packageDigest(
  question: Omit<PrivateQuestion, 'packageHash'>,
): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(question));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function freezeQuestion(
  question: Omit<PrivateQuestion, 'packageHash'>,
): Promise<PrivateQuestion> {
  const copy = structuredClone(question);
  return { ...copy, packageHash: await packageDigest(copy) };
}
export async function assertPackageIntegrity(question: PrivateQuestion) {
  const { packageHash, ...body } = question;
  if ((await packageDigest(body)) !== packageHash)
    throw new Error('Stored question package integrity check failed.');
}
