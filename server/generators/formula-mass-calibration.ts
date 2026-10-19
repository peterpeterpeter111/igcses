import { generateFormulaMassQuestion } from './relative-formula-mass.ts';
import type { FormulaMassResponse } from './formula-mass-marking.ts';

export function formulaMassCalibrationCases() {
  return Array.from({ length: 10 }, (_, seed) => {
    const q = generateFormulaMassQuestion(seed), mass = q.privateSolution.relativeFormulaMass;
    const wrong = structuredClone(q.privateSolution.terms); wrong[0].count++;
    const cases: { suffix: string; response: FormulaMassResponse; expected: { status: 'scored' | 'needs-review'; score: number | null } }[] = [
      { suffix: 'answer-alone', response: { finalAnswer: String(mass), terms: [], additionalEvidence: '' }, expected: { status: 'scored', score: 2 } },
      { suffix: 'method-and-result', response: { finalAnswer: `${mass}.0`, terms: [...q.privateSolution.terms].reverse(), additionalEvidence: '' }, expected: { status: 'scored', score: 2 } },
      { suffix: 'addition-error', response: { finalAnswer: String(mass + 1), terms: structuredClone(q.privateSolution.terms), additionalEvidence: '' }, expected: { status: 'scored', score: 1 } },
      { suffix: 'method-only', response: { finalAnswer: '', terms: structuredClone(q.privateSolution.terms), additionalEvidence: '' }, expected: { status: 'scored', score: 1 } },
      { suffix: 'wrong-formula-no-ecf', response: { finalAnswer: String(mass + 12), terms: wrong, additionalEvidence: '' }, expected: { status: 'scored', score: 0 } },
      { suffix: 'conflicting-working', response: { finalAnswer: String(mass), terms: wrong, additionalEvidence: '' }, expected: { status: 'needs-review', score: null } },
      { suffix: 'units-defer', response: { finalAnswer: `${mass} g/mol`, terms: [], additionalEvidence: '' }, expected: { status: 'needs-review', score: null } },
      { suffix: 'extra-evidence-defer', response: { finalAnswer: String(mass), terms: [], additionalEvidence: 'A crossed-out second answer is present.' }, expected: { status: 'needs-review', score: null } },
    ];
    return cases.map((c) => ({ id: `mass-n${seed + 1}-${c.suffix}`, familyId: q.family.id, familyVersion: q.family.version,
      publicQuestion: q.publicQuestion, response: c.response, expected: c.expected }));
  }).flat();
}
