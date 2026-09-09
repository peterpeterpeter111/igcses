import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  loginCount: integer('login_count').notNull().default(0),
});
export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
});
export const sources = sqliteTable('sources', {
  id: text('id').primaryKey(),
  qualification: text('qualification').notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  kind: text('kind').notNull(),
  issue: text('issue'),
  sha256: text('sha256'),
  accessStatus: text('access_status').notNull(),
  accessDate: text('access_date'),
  reviewJson: text('review_json').notNull().default('{}'),
});
export const chapters = sqliteTable(
  'chapters',
  {
    id: text('id').primaryKey(),
    subjectId: text('subject_id')
      .notNull()
      .references(() => subjects.id),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    sortOrder: integer('sort_order').notNull(),
    contentJson: text('content_json'),
    status: text('status').notNull().default('planned'),
    humanReviewed: integer('human_reviewed', { mode: 'boolean' })
      .notNull()
      .default(false),
  },
  (t) => [uniqueIndex('chapters_subject_slug').on(t.subjectId, t.slug)],
);
export const specificationPoints = sqliteTable('specification_points', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id),
  sourceId: text('source_id')
    .notNull()
    .references(() => sources.id),
  reference: text('reference').notNull(),
  parentId: text('parent_id'),
  sourcePage: integer('source_page').notNull(),
  scopeStatus: text('scope_status').notNull().default('candidate'),
  editorialSummary: text('editorial_summary'),
});
export const coverage = sqliteTable(
  'coverage',
  {
    pointId: text('point_id')
      .notNull()
      .references(() => specificationPoints.id),
    chapterId: text('chapter_id')
      .notNull()
      .references(() => chapters.id),
    sectionId: text('section_id').notNull(),
    drafted: integer('drafted', { mode: 'boolean' }).notNull().default(false),
    sourceChecked: integer('source_checked', { mode: 'boolean' })
      .notNull()
      .default(false),
    humanReviewed: integer('human_reviewed', { mode: 'boolean' })
      .notNull()
      .default(false),
    complete: integer('complete', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.pointId, t.chapterId, t.sectionId] })],
);
export const papers = sqliteTable('papers', {
  id: text('id').primaryKey(),
  qualification: text('qualification').notNull(),
  component: text('component').notNull(),
  series: text('series').notNull(),
  year: integer('year').notNull(),
  variant: text('variant').notNull(),
  printedDate: text('printed_date'),
  paperSourceId: text('paper_source_id').references(() => sources.id),
  schemeSourceId: text('scheme_source_id').references(() => sources.id),
  identityStatus: text('identity_status').notNull(),
  processingStatus: text('processing_status').notNull(),
  taskCount: integer('task_count').notNull().default(0),
  totalMarks: integer('total_marks'),
  marksReconciled: integer('marks_reconciled', { mode: 'boolean' })
    .notNull()
    .default(false),
  reviewJson: text('review_json').notNull().default('{}'),
});
export const tasks = sqliteTable(
  'paper_tasks',
  {
    id: text('id').primaryKey(),
    paperId: text('paper_id')
      .notNull()
      .references(() => papers.id),
    label: text('label').notNull(),
    marks: integer('marks').notNull(),
    commandWord: text('command_word'),
    status: text('status').notNull(),
    analysisJson: text('analysis_json').notNull(),
  },
  (t) => [
    uniqueIndex('paper_tasks_paper_label').on(t.paperId, t.label),
    check('task_marks_nonnegative', sql`${t.marks} >= 0`),
  ],
);
export const templates = sqliteTable(
  'templates',
  {
    id: text('id').notNull(),
    version: text('version').notNull(),
    qualification: text('qualification').notNull(),
    status: text('status').notNull(),
    privateContractJson: text('private_contract_json').notNull(),
    validationJson: text('validation_json').notNull(),
  },
  (t) => [primaryKey({ columns: [t.id, t.version] })],
);
export const taskTemplateLinks = sqliteTable(
  'task_template_links',
  {
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id),
    templateId: text('template_id').notNull(),
    templateVersion: text('template_version').notNull(),
    relation: text('relation').notNull(),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.templateId, t.templateVersion] })],
);
export const sessions = sqliteTable(
  'quiz_sessions',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    subjectId: text('subject_id')
      .notNull()
      .references(() => subjects.id),
    status: text('status').notNull(),
    position: integer('position').notNull().default(0),
    revision: integer('revision').notNull().default(0),
    mutationToken: text('mutation_token'),
    blueprintJson: text('blueprint_json').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    completedAt: text('completed_at'),
    score: integer('score'),
  },
  (t) => [
    index('sessions_owner_created').on(t.ownerId, t.createdAt),
    check(
      'session_score_range',
      sql`${t.score} IS NULL OR (${t.score} >= 0 AND ${t.score} <= 80)`,
    ),
    check(
      'session_position_range',
      sql`${t.position} >= 0 AND ${t.position} <= 22`,
    ),
  ],
);
export const packages = sqliteTable(
  'question_packages',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    maxMarks: integer('max_marks').notNull(),
    publicJson: text('public_json').notNull(),
    privateJson: text('private_json').notNull(),
    packageHash: text('package_hash').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('packages_session_position').on(t.sessionId, t.position),
    check('package_marks_allowed', sql`${t.maxMarks} IN (2,4,6)`),
  ],
);
export const answers = sqliteTable('answers', {
  packageId: text('package_id')
    .primaryKey()
    .references(() => packages.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  status: text('status').notNull(),
  revision: integer('revision').notNull(),
  submissionKey: text('submission_key'),
  updatedAt: text('updated_at').notNull(),
});
export const grading = sqliteTable(
  'grading_revisions',
  {
    id: text('id').primaryKey(),
    packageId: text('package_id')
      .notNull()
      .references(() => packages.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    earnedMarks: integer('earned_marks').notNull(),
    rubricHash: text('rubric_hash').notNull(),
    modelVersion: text('model_version').notNull(),
    feedbackJson: text('feedback_json').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('grading_package_revision').on(t.packageId, t.revision),
    check(
      'earned_marks_range',
      sql`${t.earnedMarks} >= 0 AND ${t.earnedMarks} <= 6`,
    ),
  ],
);
export const summaries = sqliteTable('progress_summaries', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id),
  sourceSessionIdsJson: text('source_session_ids_json').notNull(),
  statisticsJson: text('statistics_json').notNull(),
  summaryJson: text('summary_json').notNull(),
  createdAt: text('created_at').notNull(),
});
export const visits = sqliteTable(
  'visits',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').references(() => users.id),
    sessionHash: text('session_hash').notNull().unique(),
    networkHash: text('network_hash'),
    createdAt: text('created_at').notNull(),
    expiresAt: text('expires_at').notNull(),
  },
  (t) => [index('visits_expiry').on(t.expiresAt)],
);
export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id'),
  entityId: text('entity_id').notNull(),
  kind: text('kind').notNull(),
  detailsJson: text('details_json').notNull(),
  createdAt: text('created_at').notNull(),
});
