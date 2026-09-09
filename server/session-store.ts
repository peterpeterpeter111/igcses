import {
  createAttempt,
  submitAnswer,
  finishMarking,
  publicAttempt,
  releaseResults,
  QuizError,
  type Attempt,
  type PrivateQuestion,
  type Grade,
} from './quiz-contract.ts';
import { assertPackageIntegrity } from './question-package.ts';
type SessionRow = {
  id: string;
  owner_id: string;
  subject_id: string;
  status: Attempt['status'];
  position: number;
  revision: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  score: number | null;
};
type PackageRow = { id: string; private_json: string; package_hash: string };
type AnswerRow = {
  package_id: string;
  text: string;
  submission_key: string;
  status: string;
  revision: number;
};
type GradeRow = { package_id: string; feedback_json: string };
export class SessionStore {
  private db: D1Database;
  constructor(db: D1Database) {
    this.db = db;
  }
  async create(
    id: string,
    ownerId: string,
    subjectId: string,
    questions: PrivateQuestion[],
  ) {
    const attempt = createAttempt(id, ownerId, subjectId, questions);
    for (const q of questions) await assertPackageIntegrity(q);
    const now = new Date().toISOString();
    // One D1 batch is transactional: no half-created attempt can be served.
    await this.db.batch([
      this.db
        .prepare(
          'INSERT INTO users (id,created_at) VALUES (?,?) ON CONFLICT(id) DO NOTHING',
        )
        .bind(ownerId, now),
      this.db
        .prepare(
          'INSERT INTO quiz_sessions (id,owner_id,subject_id,status,position,blueprint_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
        )
        .bind(
          id,
          ownerId,
          subjectId,
          'answering',
          0,
          JSON.stringify(questions.map((q) => q.public.maxMarks)),
          now,
          now,
        ),
      ...questions.map((q) =>
        this.db
          .prepare(
            'INSERT INTO question_packages (id,session_id,position,max_marks,public_json,private_json,package_hash,created_at) VALUES (?,?,?,?,?,?,?,?)',
          )
          .bind(
            q.public.id,
            id,
            q.public.position,
            q.public.maxMarks,
            JSON.stringify(
              publicAttempt(
                { ...attempt, position: q.public.position },
                ownerId,
              ).question,
            ),
            JSON.stringify(q),
            q.packageHash,
            now,
          ),
      ),
    ]);
    return publicAttempt(attempt, ownerId);
  }
  async load(
    id: string,
    ownerId: string,
  ): Promise<{
    attempt: Attempt;
    revision: number;
    draft: string;
    draftRevision: number;
  }> {
    // One transactional snapshot: a concurrent submission cannot pair an old
    // session position with newly committed answers or grades.
    const [sessions, packages, answers, grades] = await this.db.batch([
      this.db
        .prepare('SELECT * FROM quiz_sessions WHERE id=? AND owner_id=?')
        .bind(id, ownerId),
      this.db
        .prepare(
          'SELECT q.id,q.private_json,q.package_hash FROM question_packages q JOIN quiz_sessions s ON s.id=q.session_id WHERE s.id=? AND s.owner_id=? ORDER BY q.position',
        )
        .bind(id, ownerId),
      this.db
        .prepare(
          'SELECT a.package_id,a.text,a.submission_key,a.status,a.revision FROM answers a JOIN question_packages q ON q.id=a.package_id JOIN quiz_sessions s ON s.id=q.session_id WHERE s.id=? AND s.owner_id=?',
        )
        .bind(id, ownerId),
      this.db
        .prepare(
          'SELECT g.package_id,g.feedback_json FROM grading_revisions g JOIN question_packages q ON q.id=g.package_id JOIN quiz_sessions s ON s.id=q.session_id WHERE s.id=? AND s.owner_id=? AND g.revision=(SELECT MAX(g2.revision) FROM grading_revisions g2 WHERE g2.package_id=g.package_id)',
        )
        .bind(id, ownerId),
    ]);
    const s = sessions.results[0] as unknown as SessionRow | undefined;
    if (!s) throw new QuizError('NOT_FOUND', 'Attempt not found.');
    const questions = (packages.results as unknown as PackageRow[]).map((r) => {
      const q = JSON.parse(r.private_json) as PrivateQuestion;
      if (q.packageHash !== r.package_hash)
        throw new Error('Question hash mismatch.');
      return q;
    });
    for (const q of questions) await assertPackageIntegrity(q);
    const answerMap: Attempt['answers'] = {};
    const answerRows = answers.results as unknown as AnswerRow[];
    for (const a of answerRows.filter((row) => row.status === 'submitted'))
      answerMap[a.package_id] = {
        text: a.text,
        key: a.submission_key,
        skipped: !a.text.trim(),
      };
    const draft = answerRows.find(
      (a) =>
        a.status === 'draft' &&
        a.package_id === questions[s.position]?.public.id,
    );
    return {
      revision: s.revision,
      draft: draft?.text ?? '',
      draftRevision: draft?.revision ?? 0,
      attempt: {
        id: s.id,
        ownerId: s.owner_id,
        subjectId: s.subject_id,
        status: s.status,
        position: s.position,
        questions,
        answers: answerMap,
        grades: (grades.results as unknown as GradeRow[]).map(
          (g) => JSON.parse(g.feedback_json) as Grade,
        ),
      },
    };
  }
  async current(id: string, ownerId: string) {
    const { attempt, draft, draftRevision } = await this.load(id, ownerId);
    const view = publicAttempt(attempt, ownerId);
    return { ...view, draft, draftRevision };
  }
  async draft(
    id: string,
    ownerId: string,
    questionId: string,
    text: string,
    revision: number,
  ) {
    if (text.length > 16000 || !Number.isSafeInteger(revision) || revision < 1)
      throw new QuizError('INPUT', 'Invalid draft.');
    const { attempt } = await this.load(id, ownerId);
    if (
      attempt.status !== 'answering' ||
      attempt.questions[attempt.position]?.public.id !== questionId
    )
      throw new QuizError('ORDER', 'Question is not open.');
    const results = await this.db.batch([
      this.db
        .prepare(
          "INSERT INTO answers (package_id,text,status,revision,updated_at) SELECT ?,?,'draft',?,? WHERE EXISTS (SELECT 1 FROM quiz_sessions s JOIN question_packages q ON q.session_id=s.id LEFT JOIN answers a ON a.package_id=q.id WHERE s.id=? AND s.owner_id=? AND s.status='answering' AND q.id=? AND s.position=q.position AND (a.package_id IS NOT NULL OR ?=1)) ON CONFLICT(package_id) DO UPDATE SET text=excluded.text,revision=excluded.revision,updated_at=excluded.updated_at WHERE answers.status='draft' AND answers.revision=excluded.revision-1",
        )
        .bind(
          questionId,
          text,
          revision,
          new Date().toISOString(),
          id,
          ownerId,
          questionId,
          revision,
        ),
      this.db
        .prepare(
          'SELECT a.text,a.revision,a.status FROM answers a JOIN question_packages q ON q.id=a.package_id JOIN quiz_sessions s ON s.id=q.session_id WHERE q.id=? AND s.id=? AND s.owner_id=?',
        )
        .bind(questionId, id, ownerId),
    ]);
    const row = results[1].results[0] as unknown as
      | { text: string; revision: number; status: string }
      | undefined;
    if (row?.status === 'submitted')
      throw new QuizError('ORDER', 'Question has already been submitted.');
    const applied = Boolean(results[0].meta.changes);
    const unchanged =
      !applied && row?.revision === revision && row.text === text;
    return {
      saved: applied || unchanged,
      applied,
      superseded: !applied && !unchanged,
      revision: row?.revision ?? 0,
    };
  }
  async submit(
    id: string,
    ownerId: string,
    questionId: string,
    text: string,
    key: string,
    skipConfirmed = false,
  ) {
    const { attempt, revision } = await this.load(id, ownerId),
      next = submitAnswer(
        attempt,
        ownerId,
        questionId,
        text,
        key,
        skipConfirmed,
      );
    if (next === attempt) return this.current(id, ownerId);
    const token = crypto.randomUUID(),
      now = new Date().toISOString();
    const result = await this.db.batch([
      this.db
        .prepare(
          'UPDATE quiz_sessions SET status=?,position=?,revision=revision+1,mutation_token=?,updated_at=? WHERE id=? AND owner_id=? AND revision=?',
        )
        .bind(next.status, next.position, token, now, id, ownerId, revision),
      this.db
        .prepare(
          "INSERT INTO answers (package_id,text,status,revision,submission_key,updated_at) SELECT ?,?,'submitted',?,?,? WHERE EXISTS (SELECT 1 FROM quiz_sessions WHERE id=? AND owner_id=? AND mutation_token=?) ON CONFLICT(package_id) DO UPDATE SET text=excluded.text,status=excluded.status,revision=excluded.revision,submission_key=excluded.submission_key,updated_at=excluded.updated_at WHERE answers.status='draft'",
        )
        .bind(questionId, text, revision + 1, key, now, id, ownerId, token),
    ]);
    if (!result[0].meta.changes) {
      const latest = await this.load(id, ownerId);
      submitAnswer(
        latest.attempt,
        ownerId,
        questionId,
        text,
        key,
        skipConfirmed,
      );
      return this.current(id, ownerId);
    }
    return this.current(id, ownerId);
  }
  async complete(
    id: string,
    ownerId: string,
    grades: Grade[],
    modelVersion: string,
  ) {
    const { attempt, revision } = await this.load(id, ownerId);
    const next = finishMarking(attempt, ownerId, grades);
    const now = new Date().toISOString(),
      token = crypto.randomUUID(),
      score = grades.reduce((n, g) => n + g.earnedMarks, 0);
    const results = await this.db.batch([
      this.db
        .prepare(
          "UPDATE quiz_sessions SET status='complete',revision=revision+1,mutation_token=?,score=?,completed_at=?,updated_at=? WHERE id=? AND owner_id=? AND revision=? AND status='marking'",
        )
        .bind(token, score, now, now, id, ownerId, revision),
      ...grades.map((g) =>
        this.db
          .prepare(
            'INSERT INTO grading_revisions (id,package_id,revision,earned_marks,rubric_hash,model_version,feedback_json,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM quiz_sessions WHERE id=? AND owner_id=? AND mutation_token=?)',
          )
          .bind(
            crypto.randomUUID(),
            g.questionId,
            g.revision,
            g.earnedMarks,
            g.rubricHash,
            modelVersion,
            JSON.stringify(g),
            now,
            id,
            ownerId,
            token,
          ),
      ),
    ]);
    if (!results[0].meta.changes)
      throw new QuizError('CONFLICT', 'Attempt changed during marking.');
    return releaseResults(next, ownerId);
  }
  async results(id: string, ownerId: string) {
    return releaseResults((await this.load(id, ownerId)).attempt, ownerId);
  }
  async history(ownerId: string) {
    const r = await this.db
      .prepare(
        'SELECT id,subject_id,status,created_at,updated_at,completed_at,score FROM quiz_sessions WHERE owner_id=? ORDER BY created_at DESC LIMIT 100',
      )
      .bind(ownerId)
      .all();
    return r.results;
  }
  async remove(id: string, ownerId: string) {
    const r = await this.db
      .prepare('DELETE FROM quiz_sessions WHERE id=? AND owner_id=?')
      .bind(id, ownerId)
      .run();
    if (!r.meta.changes) throw new QuizError('NOT_FOUND', 'Attempt not found.');
    return { deleted: true };
  }
}
