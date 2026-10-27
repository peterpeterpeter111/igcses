export function parsePseudonym(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Choose a nickname with 2–32 characters.');
  const name = value.normalize('NFC').trim();
  if (Array.from(name).length < 2 || Array.from(name).length > 32 || /[\p{Cc}\p{Cf}<>]/u.test(name)) throw new Error('Choose a nickname with 2–32 characters, without control characters or angle brackets.');
  return name;
}
