export type Marks = 2 | 4 | 6;
export const BLUEPRINT: readonly Marks[] = Object.freeze([
  ...Array<Marks>(8).fill(2),
  ...Array<Marks>(10).fill(4),
  ...Array<Marks>(4).fill(6),
]);
export type PublicQuestion = {
  id: string;
  position: number;
  prompt: string;
  stimulus: string;
  maxMarks: Marks;
};
export type PrivateQuestion = {
  public: PublicQuestion;
  templateId: string;
  templateVersion: string;
  seed: string;
  sourceTaskIds: string[];
  solution: string;
  rubric: { id: string; marks: number; description: string }[];
  validation: { passed: boolean; validatorVersion: string };
  packageHash: string;
};
export type Grade = {
  questionId: string;
  earnedMarks: number;
  rationale: string;
  rubricHash: string;
  revision: number;
};
export type Attempt = {
  id: string;
  ownerId: string;
  subjectId: string;
  status: 'answering' | 'marking' | 'complete';
  position: number;
  questions: PrivateQuestion[];
  answers: Record<string, { text: string; key: string; skipped: boolean }>;
  grades: Grade[];
};
export class QuizError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
export function validateBlueprint(values: readonly number[]) {
  if (
    values.length !== 22 ||
    values.reduce((a, b) => a + b, 0) !== 80 ||
    values.filter((v) => v === 2).length !== 8 ||
    values.filter((v) => v === 4).length !== 10 ||
    values.filter((v) => v === 6).length !== 4
  )
    throw new QuizError(
      'BLUEPRINT',
      'A quiz requires 8 × 2, 10 × 4 and 4 × 6 marks.',
    );
}
function publicFields(q: PublicQuestion): PublicQuestion {
  return {
    id: q.id,
    position: q.position,
    prompt: q.prompt,
    stimulus: q.stimulus,
    maxMarks: q.maxMarks,
  };
}
export function publicQuestion(q: PrivateQuestion): PublicQuestion {
  return publicFields(q.public);
}
export function assertOwner(attempt: Attempt, ownerId: string) {
  if (attempt.ownerId !== ownerId)
    throw new QuizError('NOT_FOUND', 'Attempt not found.');
}
export function createAttempt(
  id: string,
  ownerId: string,
  subjectId: string,
  questions: PrivateQuestion[],
): Attempt {
  validateBlueprint(questions.map((q) => q.public.maxMarks));
  const ids = new Set<string>(),
    fingerprints = new Set<string>();
  questions.forEach((q, i) => {
    if (
      q.public.position !== i ||
      !q.public.id ||
      ids.has(q.public.id) ||
      !q.validation.passed ||
      !q.packageHash ||
      !q.solution.trim() ||
      !q.sourceTaskIds.length ||
      !q.public.prompt.trim()
    )
      throw new QuizError(
        'PACKAGE',
        'Invalid or unvalidated question package.',
      );
    if (
      q.rubric.some((r) => !Number.isInteger(r.marks) || r.marks < 0) ||
      q.rubric.reduce((n, r) => n + r.marks, 0) !== q.public.maxMarks
    )
      throw new QuizError('RUBRIC', 'Rubric maxima do not reconcile.');
    const fingerprint = (q.public.prompt + ' ' + q.public.stimulus)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    if (fingerprints.has(fingerprint))
      throw new QuizError('REPEAT', 'Duplicate question.');
    fingerprints.add(fingerprint);
    ids.add(q.public.id);
  });
  return {
    id,
    ownerId,
    subjectId,
    status: 'answering',
    position: 0,
    questions: structuredClone(questions),
    answers: {},
    grades: [],
  };
}
export function submitAnswer(
  attempt: Attempt,
  ownerId: string,
  questionId: string,
  text: string,
  key: string,
  skipConfirmed = false,
): Attempt {
  assertOwner(attempt, ownerId);
  if (!key || key.length > 100 || text.length > 16000)
    throw new QuizError('INPUT', 'Invalid submission.');
  const previous = attempt.answers[questionId];
  if (previous) {
    if (
      previous.key === key &&
      previous.text === text &&
      previous.skipped === !text.trim()
    )
      return attempt;
    throw new QuizError('CONFLICT', 'Answer already submitted.');
  }
  if (
    attempt.status !== 'answering' ||
    attempt.questions[attempt.position]?.public.id !== questionId
  )
    throw new QuizError('ORDER', 'This question is not awaiting an answer.');
  if (!text.trim() && !skipConfirmed)
    throw new QuizError(
      'CONFIRM_SKIP',
      'Confirm before skipping an empty answer.',
    );
  const next = structuredClone(attempt);
  next.answers[questionId] = { text, key, skipped: !text.trim() };
  next.position++;
  if (next.position === 22) next.status = 'marking';
  return next;
}
export function finishMarking(
  attempt: Attempt,
  ownerId: string,
  grades: Grade[],
): Attempt {
  assertOwner(attempt, ownerId);
  if (
    attempt.status !== 'marking' ||
    grades.length !== 22 ||
    Object.keys(attempt.answers).length !== 22
  )
    throw new QuizError(
      'INCOMPLETE',
      'All answers must be saved before marking completes.',
    );
  const byId = new Map(grades.map((g) => [g.questionId, g]));
  if (byId.size !== 22) throw new QuizError('GRADE', 'Duplicate grades.');
  for (const q of attempt.questions) {
    const g = byId.get(q.public.id);
    if (
      !g ||
      !Number.isInteger(g.earnedMarks) ||
      g.earnedMarks < 0 ||
      g.earnedMarks > q.public.maxMarks ||
      g.rubricHash !== q.packageHash ||
      !Number.isInteger(g.revision) ||
      g.revision < 1
    )
      throw new QuizError('GRADE', 'Invalid awarded marks or revision.');
  }
  return {
    ...structuredClone(attempt),
    status: 'complete',
    grades: structuredClone(grades),
  };
}
export function publicAttempt(attempt: Attempt, ownerId: string) {
  assertOwner(attempt, ownerId);
  return {
    id: attempt.id,
    subjectId: attempt.subjectId,
    status: attempt.status,
    position: attempt.position,
    totalQuestions: 22,
    totalMarks: 80,
    question:
      attempt.status === 'answering'
        ? publicQuestion(attempt.questions[attempt.position])
        : null,
  };
}
export function releaseResults(attempt: Attempt, ownerId: string) {
  assertOwner(attempt, ownerId);
  if (attempt.status !== 'complete')
    throw new QuizError(
      'LOCKED',
      'Results are locked until the full quiz is complete.',
    );
  const total = attempt.grades.reduce((n, g) => n + g.earnedMarks, 0);
  return {
    id: attempt.id,
    total,
    maxMarks: 80,
    percentage: (total * 100) / 80,
    questions: attempt.questions.map((q) => ({
      ...publicQuestion(q),
      answer: attempt.answers[q.public.id].text,
      solution: q.solution,
      rubric: q.rubric,
      grade: attempt.grades.find((g) => g.questionId === q.public.id),
    })),
  };
}
