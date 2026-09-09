import type { Qualification } from '../content/catalog';
import { BLUEPRINT, QuizError, type PrivateQuestion } from './quiz-contract';
export type RuntimeFamily = {
  id: string;
  version: string;
  qualification: Qualification;
  status: 'active';
  validatedMaxima: number[];
  sourceTaskIds: string[];
  validationEvidenceId: string;
  generate: (seed: string, maxMarks: number) => Promise<PrivateQuestion>;
};
// Research templates remain provisional. No AI adapter or inactive research object is imported into the public app.
export const activeFamilies: readonly RuntimeFamily[] = Object.freeze([]);
export function quizReadiness(qualification: Qualification) {
  const eligible = activeFamilies.filter(
    (f) => f.qualification === qualification,
  );
  return {
    ready:
      eligible.length > 0 &&
      BLUEPRINT.every((m) =>
        eligible.some((f) => f.validatedMaxima.includes(m)),
      ),
    activeFamilies: eligible.length,
    reason:
      'Validated question families and the final AI provider integration are still pending.',
  };
}
export function requireQuizReadiness(qualification: Qualification) {
  if (!quizReadiness(qualification).ready)
    throw new QuizError(
      'BANK_NOT_READY',
      'No complete validated blueprint is available for this subject.',
    );
}
