/** Freeze internally constructed JSON-like question packages before returning
 * them to callers. Deserialised copies still need each family's validator.
 * This is immutability, not authenticity or live-template eligibility. */
export function freezeQuestionPackage<T>(value: T, seen = new WeakSet<object>()): T {
  if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value);
    for (const child of Object.values(value)) freezeQuestionPackage(child, seen);
    Object.freeze(value);
  }
  return value;
}
