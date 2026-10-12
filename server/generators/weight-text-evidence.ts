// Offline only: one allowlisted units-labelled product, never general prose or live marking.
import { validateWeightPrototype, type WeightPrototype } from './weight-conversion.ts';
import { assessWeightResponse, type WeightAssessment, type WeightResponse } from './weight-marking.ts';

export type WeightLexeme = { role: 'mass' | 'field' | 'final'; start: number; end: number; text: string };
export type WeightTextEvidence = {
  policy: 'offline-units-labelled-product-v1';
  rawResponse: string | null;
  interpretation: 'blank' | 'explicit-product' | 'deferred';
  lexemes: WeightLexeme[];
  transcribed: WeightResponse | null;
  assessment: WeightAssessment;
  liveEligible: false;
};

const numeric = String.raw`\+?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?`;
// Units identify operand roles; no swap, implied method, fraction arithmetic or text deletion.
const product = new RegExp(String.raw`^\s*(?:(?:W|weight)\s*=\s*)?(?<mass>${numeric})\s*kg\s*(?:×|\*)\s*(?<field>${numeric})\s*N\s*\/\s*kg\s*=\s*(?:(?<final>${numeric})(?:\s*(?<unit>N|newtons?|kg|g))?)?\s*$`, 'd');

export function assessWeightText(q: WeightPrototype, raw: unknown): WeightTextEvidence {
  if (!validateWeightPrototype(q)) throw new Error('Invalid weight package');
  const base = { policy: 'offline-units-labelled-product-v1' as const,
    rawResponse: typeof raw === 'string' ? raw : null, liveEligible: false as const };
  const defer = (reason: string): WeightTextEvidence => {
    const unresolved = assessWeightResponse(q, { massKg: '', fieldNPerKg: '', finalAnswer: '', otherWorking: 'Unparsed response evidence.' });
    return { ...base, interpretation: 'deferred', lexemes: [], transcribed: null,
      assessment: { ...unresolved, decision: { status: 'needs-review', score: null, reason } } };
  };
  if (typeof raw !== 'string') return defer('A textual response is required; no coercion is performed.');
  if (raw.length > 1024) return defer('Response exceeds the bounded explicit-product format.');
  if (!raw.trim()) {
    const fields = { massKg: '', fieldNPerKg: '', finalAnswer: '', otherWorking: '' };
    return { ...base, interpretation: 'blank', lexemes: [], transcribed: fields,
      assessment: assessWeightResponse(q, fields) };
  }
  const match = product.exec(raw);
  if (!match?.groups || !match.indices?.groups)
    return defer('Only one complete units-labelled mass × field statement is interpreted; other or competing evidence needs review.');
  const { mass, field, final = '', unit = '' } = match.groups;
  if ([mass, field, final].some((value) => value.length > 200))
    return defer('A numeric lexeme exceeds the existing calculation-field bound.');
  const lexemes: WeightLexeme[] = [];
  for (const [role, group] of [['mass', 'mass'], ['field', 'field'], ['final', 'final']] as const) {
    const span = match.indices.groups[group];
    if (span) lexemes.push({ role, start: span[0], end: span[1], text: raw.slice(span[0], span[1]) });
  }
  // Preserve every digit and source span. The marker performs exact decimal checks.
  const finalSpan = match.indices.groups.final;
  const unitSpan = match.indices.groups.unit;
  const finalAnswer = finalSpan ? raw.slice(finalSpan[0], unit && unitSpan ? unitSpan[1] : finalSpan[1]) : '';
  const fields: WeightResponse = { massKg: mass, fieldNPerKg: field, finalAnswer, otherWorking: '' };
  return { ...base, interpretation: 'explicit-product', lexemes, transcribed: fields,
    assessment: assessWeightResponse(q, fields) };
}
