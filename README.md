# IGCSEs study library

Work in progress for six Pearson Edexcel International GCSE linear qualifications: 4HB1, 4BI1, 4CH1, 4PH1, 4EB1 and 4MB1.

## Current checkpoint
- Six subject routes and 36 top-level chapter entries, with subject search and transparent coverage pages.
- Thirteen partial source-checked note documents (222 sections), with original examples. No complete chapters or complete syllabus coverage. Reviewed inventories contain 264 parent identities and 661 partial local requirements; these are not completion counts.
- Seven paper/scheme pairs downloaded, including Mathematics B with a 38-part / 100-mark text index, selected visual checks and three detailed records across Q15–Q16 (eight marks); zero whole papers fully processed.
- D1 schema, session/history routes and tested quiz state/storage contracts. Ninety automated tests, including concurrent writes, lost-response recovery and exact, repeatable content seeding; isolated local Cloudflare D1 verification passes.
- Four provisional families and three experimental generators (two Physics, one Maths); zero active templates. Three bounded offline markers exist, but live AI generation and examiner-style marking remain deferred. This is not the completed question bank.
- Sites hosting is configured, but no live website is claimed. Read PROGRESS_CHECKPOINT.md and the newest research/checkpoints file before resuming.

## Local development
Use Node 24 and npm. Run `npm ci`, then `npm run dev`.
Checks: `npm run typecheck`, `npm test`, `npm run research:check`, `node scripts/validate-content.mjs`, `npm run public:check` (after a build).
Build: `npm run build`.

The content checker prints a report without changing files. To save new evidence, pass `--output research/reviews/NEW-REPORT.json`; existing reports cannot be overwritten. `python3 scripts/audit-evidence.py` reconciles saved ledger references and local PDF hashes without downloads, extraction or promotion of coverage. Its optional `--output` also requires a new filename. Missing normalized rows remain explicit gaps even when their JSON source records exist. Coverage rows are partitioned by subject; use scripts/ledger_io.py to read the full logical table, as documented in research/LEDGER_COLUMNS.md.

D1 schema changes use `npm run db:generate`. Apply SQL migrations in order to the intended database. Content seed data is separate from schema migrations: `node --experimental-strip-types scripts/seed-content.ts` writes ignored `work/seed-content.sql`. Never run it against an unintended environment.
Use `--stdout` to inspect/test the seed without replacing that prepared file. `npm run db:check` uses a nonpersistent local D1 database and verifies the current note payloads as well as synthetic quiz behavior; it never applies data to a deployed database.

## Research integrity
The raw 390-link inventory is not a deduplicated paper inventory. Batch manifests and review overlays preserve provenance and limitations. Downloaded papers, extracts and review images stay in ignored `work/`; the repository does not distribute the source PDFs.

Notes are original teaching material. Linked Pearson specifications define scope; official schemes define assessment. AI source checks are not human review.

## Quiz security and remaining work
Private packages belong in D1, not the frontend. Owner checks, draft/submission idempotency, package hashes and completion-gated scheme release are tested with synthetic fixtures. Tests do not certify examiner-quality marking or a working AI generator. Guest mode, grading reviews, telemetry, summaries, full content audits and production end-to-end verification remain unfinished.

AI calls will use a backend-only provider adapter and hosted secrets in the final phase. Never commit real keys or put them in public environment variables. No AI provider is configured by this checkout.

GitHub source: https://github.com/peterpeterpeter111/igcses

Source synchronization uses the connected GitHub app because ordinary Git has no saved write login. The oversized-upload blocker was resolved on 28 September 2026. See [the verified sync procedure](research/GITHUB_SYNC.md); preserve both histories and never force-push.
