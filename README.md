# IGCSEs study library

Work in progress for six Pearson Edexcel International GCSE linear qualifications: 4HB1, 4BI1, 4CH1, 4PH1, 4EB1 and 4MB1.

## Current checkpoint
- Six subject routes and 36 top-level chapter entries, with subject search and transparent coverage pages.
- Nineteen partial source-checked note documents (387 sections), with original examples. No complete chapters or complete syllabus coverage. Reviewed inventories contain 426 parent identities (407 with partial teaching audits) and 1,125 partial local requirements; these are not completion counts.
- Seven paper/scheme pairs obtained. Mathematics B has 38 detailed parts / 100 marks and a whole-page visual audit, with source discrepancies recorded. Physics has 51 detailed records / 110 marks and a whole-paper inventory. Human Biology has seventeen partial Q1–Q3 records / 32 marks; its separate visual inventory establishes 42 parts / 90 marks across all 24 question-paper and 12 scheme pages. The remaining 25 parts are indexed only. One English pilot task is detailed; the other obtained pairs retain indexed-only status. Zero whole papers fully processed.
- D1 schema, session/history routes and tested quiz state/storage contracts. 124 automated tests, including concurrent writes, lost-response recovery, exact repeatable content seeding, ordered note-part integrity and partial-paper/rubric-cap integrity; isolated local Cloudflare D1 verification passes.
- Six provisional families and six experimental generators (two Physics, three Maths, one English); zero active templates. Six bounded offline markers exist, but live AI generation and examiner-style marking remain deferred. This is not the completed question bank.
- Sites hosting is configured, but no live website is claimed. Read PROGRESS_CHECKPOINT.md and the newest research/checkpoints file before resuming.

## Local development
Use Node 24 and npm. Run `npm ci`, then `npm run dev`.
Checks: `npm run typecheck`, `npm test`, `npm run research:check`, `node scripts/validate-content.mjs`, `npm run public:check` (after a build).
Build: `npm run build`.

The content checker prints a report without changing files. To save new evidence, pass `--output research/reviews/NEW-REPORT.json`; existing reports cannot be overwritten. `python3 scripts/audit-evidence.py` reconciles saved ledger references and local PDF hashes without downloads, extraction or promotion of coverage. Its optional `--output` also requires a new filename. Missing normalized rows remain explicit gaps even when their JSON source records exist. Coverage rows are partitioned by subject; use scripts/ledger_io.py to read the full logical table, as documented in research/LEDGER_COLUMNS.md.

Large notes can declare an ordered `sectionFiles` manifest in their top-level JSON, with an empty inline `sections` array. Each referenced file under `content/note-sections/` contains its subject/chapter identity and sections. Biology structures currently uses eight parts. Update the explicit static imports in `content/biology-structures.ts` when adding a new part; never infer part order from filenames or directory contents. Browser bundles assemble the same chapter contract through `content/compose-note.mjs`; offline JavaScript uses `scripts/read-note.mjs`, and Python tools use `scripts/note_io.py`. Missing, duplicate, mismatched or ambiguous parts fail validation. The source split preserves every teaching value and section order, recorded in the migration report; it does not increase syllabus completion. Keep individual source files below the bounded GitHub upload size.

D1 schema changes use `npm run db:generate`. Apply SQL migrations in order to the intended database. Content seed data is separate from schema migrations: `node --experimental-strip-types scripts/seed-content.ts` writes ignored `work/seed-content.sql`. Never run it against an unintended environment.
Use `--stdout` to inspect/test the seed without replacing that prepared file. Large chapter payloads are reset then appended in escaped UTF-8 chunks so each SQL statement stays below D1’s 100 KB limit. Allow the entire seed to finish before using the content; a partial import is not a complete chapter payload. Isolated checks read through an invocation-owned temporary file, preserving prepared deployment files. `npm run db:check` uses a nonpersistent local D1 database and verifies the current note payloads as well as synthetic quiz behavior; it never applies data to a deployed database.

## Research integrity
The raw 390-link inventory is not a deduplicated paper inventory. Batch manifests and review overlays preserve provenance and limitations. Downloaded papers, extracts and review images stay in ignored `work/`; the repository does not distribute the source PDFs.

Notes are original teaching material. Linked Pearson specifications define scope; official schemes define assessment. AI source checks are not human review.

## Quiz security and remaining work
Private packages belong in D1, not the frontend. Owner checks, draft/submission idempotency, package hashes and completion-gated scheme release are tested with synthetic fixtures. Tests do not certify examiner-quality marking or a working AI generator. Guest mode, grading reviews, telemetry, summaries, full content audits and production end-to-end verification remain unfinished.

AI calls will use a backend-only provider adapter and hosted secrets in the final phase. Never commit real keys or put them in public environment variables. No AI provider is configured by this checkout.

GitHub source: https://github.com/peterpeterpeter111/igcses

Source synchronization uses the connected GitHub app because ordinary Git has no saved write login. The oversized-upload blocker was resolved on 28 September 2026. See [the verified sync procedure](research/GITHUB_SYNC.md); preserve both histories and never force-push.
