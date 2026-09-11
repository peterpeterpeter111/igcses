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
    const factor = match[2] === 'mN' ? 0.001 : match[2] === 'kN' ? 1000 : 1;
    const value = Number(match[1]) * factor;
    if (!Number.isFinite(value))
      return review('Magnitude is outside the numeric range.');
    const expected = question.privateSolution.magnitudeN;
    // Conversion round-off only, not a tolerance permitting rounded wrong answers.
    magnitude =
      Math.abs(value - expected) <= Number.EPSILON * Math.max(1, expected) * 4
        ? 1
        : 0;
  }
  const normalDirection = response.direction
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  let direction: 0 | 1 = 0;
  if (directionText) {
    const value = aliases[normalDirection];
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
