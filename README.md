# IGCSEs study library

Work in progress for six Pearson Edexcel International GCSE linear qualifications: 4HB1, 4BI1, 4CH1, 4PH1, 4EB1 and 4MB1.

## Current checkpoint
- Six subject routes and all 36 top-level chapter routes have original teaching content, with subject search, examples, exercises and transparent coverage pages.
- 36 partial source-checked note documents / 1,056 sections; 796 reviewed numbered identities / 796 partial teaching audits / 2,824 local requirements / 1,354 partial numbered links. English’s six objectives / 41 links are tracked separately; the optional spoken endorsement now has eight original preparation sections without an invented exam AO or numeric grade.
- Chapter practice is available across all six subjects: temporary ten-question self-assessment sets drawn from original lesson exercises, answer explanations and focused revisits. Written answers remain in the page and are not uploaded or stored; leaving or reloading resets the session. This is separate from the generated exam bank.
- Seven paper/scheme pairs obtained. Detailed Physics51parts/110marks, Maths38/100, Human Biology42/90, Biology29/65, and one English pilot/2marks. Biology Q6 table, graph restrictions and direction-specific concessions are checked; whole visual inventory confirms 45 parts /110 allocation marks; detailed extraction remains a subset. No fully processed papers or complete chapters/points/objectives are claimed.
- D1 ownership, idempotency, drafts, history and completion-gated private results are tested. 178 automated tests, types/lint, research checks and isolated D1 proof pass for this phase.
- Seven provisional offline families / zero active exam templates. The fixed 22-question/80-mark generated quiz and live AI marking remain gated until curriculum, generation and marking calibration pass.
- Sites publication status and continuation details are recorded in the latest checkpoint; preserve both source histories.

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
