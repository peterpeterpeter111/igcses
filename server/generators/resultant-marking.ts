// Offline calibration only. This module is not registered with live quizzes.
import {
  validateResultantPrototype,
  type ResultantPrototype,
} from './collinear-resultant.ts';

export type ForceResponse = { magnitude: string; direction: string };
export type ForceMark =
  | {
      status: 'scored';
      score: number;
      maximum: 2;
      criteria: { magnitude: 0 | 1; direction: 0 | 1 };
    }
  | { status: 'needs-review'; score: null; reason: string };

const aliases: Record<string, string> = {
  right: 'right',
  rightwards: 'right',
  'to the right': 'right',
  '→': 'right',
  left: 'left',
  leftwards: 'left',
  'to the left': 'left',
  '←': 'left',
  up: 'upwards',
  upward: 'upwards',
  upwards: 'upwards',
  '↑': 'upwards',
  down: 'downwards',
  downward: 'downwards',
  downwards: 'downwards',
  '↓': 'downwards',
};

/** Accepts separate final-answer fields, never extracts a favourable number from prose. */
export function markResultantResponse(
  question: ResultantPrototype,
  response: ForceResponse,
): ForceMark {
  if (!validateResultantPrototype(question))
    throw new Error('Invalid force package');
  const review = (reason: string): ForceMark => ({
    status: 'needs-review',
    score: null,
    reason,
  });
  if (
    typeof response?.magnitude !== 'string' ||
    typeof response?.direction !== 'string'
  )
    return review('Both final-answer fields must be text.');
  if (response.magnitude.length > 200 || response.direction.length > 100)
    return review('Response exceeds the bounded final-answer format.');
  const magnitudeText = response.magnitude.trim().replaceAll('−', '-');
  const directionText = response.direction
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  let magnitude: 0 | 1 = 0;
  if (magnitudeText) {
    const match = magnitudeText.match(
      /^([+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*(N|mN|kN|newton|newtons)?$/,
    );
    if (!match)
      return review(
        'Magnitude has unresolved notation, units, a signed value or multiple claims.',
      );
    const [mantissa, exponentText = '0'] = match[1].split(/[eE]/);
    const exponent = Number(exponentText);
    // Bound exponentiation before building integers. Preserve every entered
    // decimal digit: Number/EPSILON could credit a subtly incorrect response.
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 400)
      return review('Magnitude is outside the numeric range.');
    const fractionDigits = mantissa.split('.')[1]?.length ?? 0;
    const coefficient = BigInt(mantissa.replace(/[+.]/g, ''));
    const unitExponent = match[2] === 'mN' ? -3 : match[2] === 'kN' ? 3 : 0;
    const tenthsExponent = exponent - fractionDigits + unitExponent + 1;
    const expectedTenths = BigInt(Math.abs(question.privateSolution.signedTenths));
    const correct = tenthsExponent >= 0
      ? coefficient * BigInt(10) ** BigInt(tenthsExponent) === expectedTenths
      : coefficient === expectedTenths * BigInt(10) ** BigInt(-tenthsExponent);
    magnitude = correct ? 1 : 0;
  }
  const normalDirection = response.direction
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  let direction: 0 | 1 = 0;
  if (directionText) {
    const value = Object.hasOwn(aliases, normalDirection)
      ? aliases[normalDirection]
      : undefined;
    if (
      !value &&
      !['north', 'south', 'east', 'west', 'n', 's', 'e', 'w'].includes(
        normalDirection,
      )
    )
      return review(
        'Direction needs interpretation or contains competing claims.',
      );
    direction = value === question.privateSolution.direction ? 1 : 0;
  }
  return {
    status: 'scored',
    score: magnitude + direction,
    maximum: 2,
    criteria: { magnitude, direction },
  };
}
