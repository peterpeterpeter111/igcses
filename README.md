# IGCSEs study library

Work in progress for six Pearson Edexcel International GCSE linear qualifications: 4HB1, 4BI1, 4CH1, 4PH1, 4EB1 and 4MB1.

## Current checkpoint
- Six subject routes and 36 top-level chapter entries, with subject search and transparent coverage pages.
- Six partial source-checked note documents (8 sections), with original examples. No complete chapters or complete syllabus coverage.
- Six paper/scheme pairs obtained including the English pilot; zero whole papers fully processed.
- D1 schema, session/history routes and tested quiz state/storage contracts. Thirty-one automated tests, including concurrent writes and lost-response recovery; isolated local Cloudflare D1 verification passes.
- No active generative templates. Live AI generation and marking remain deferred. This is not the completed question bank.
- Sites hosting is configured, but no live website is claimed. Read PROGRESS_CHECKPOINT.md and the newest research/checkpoints file before resuming.

## Local development
Use Node 24 and npm. Run `npm ci`, then `npm run dev`.
Checks: `npm run typecheck`, `npm test`, `npm run research:check`, `node scripts/validate-content.mjs`, `npm run public:check` (after a build).
Build: `npm run build`.

D1 schema changes use `npm run db:generate`. Apply SQL migrations in order to the intended database. Content seed data is separate from schema migrations: `node --experimental-strip-types scripts/seed-content.ts` writes ignored `work/seed-content.sql`. Never run it against an unintended environment.

## Research integrity
The raw 390-link inventory is not a deduplicated paper inventory. Batch manifests and review overlays preserve provenance and limitations. Downloaded papers, extracts and review images stay in ignored `work/`; the repository does not distribute the source PDFs.

Notes are original teaching material. Linked Pearson specifications define scope; official schemes define assessment. AI source checks are not human review.

## Quiz security and remaining work
Private packages belong in D1, not the frontend. Owner checks, draft/submission idempotency, package hashes and completion-gated scheme release are tested with synthetic fixtures. Tests do not certify examiner-quality marking or a working AI generator. Guest mode, grading reviews, telemetry, summaries, full content audits and production end-to-end verification remain unfinished.

AI calls will use a backend-only provider adapter and hosted secrets in the final phase. Never commit real keys or put them in public environment variables. No AI provider is configured by this checkout.

GitHub source: https://github.com/peterpeterpeter111/igcses
