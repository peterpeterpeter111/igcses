# Coverage storage and source sync — 30 September 2026

Resumed local 415732b after allowance renewal. GitHub 1e5b2d0dfdac351d6fe5b8d0676cdaa74260e9f8 now exactly mirrors 415732bdae3f928c6917872b1d63745c8a144fa4, tree f4c8b57df436508958bc67fef5d1467afcc2f203. Verified by fetch, zero tree diff and prior remote 8410558 ancestor check. No reset, force push or rewritten history.

## Completed
The coverage table had reached 194970 bytes per reviewed request, just under the unchanged 195000-byte cap. Reorganized its persistent source storage by subject: coverage.csv now contains the schema header, coverage-partitions.json declares six subject CSVs, and scripts/ledger_io.py assembles the logical table. Every one of the 356 rows and every field string is preserved; canonical before/after hashes match in research/reviews/2026-09-30-coverage-partition-migration.json. Only physical row ordering changed. This is an explicit source-schema storage change, not hidden encoding, truncation or a changed review limit.

Updated the teaching exporter to write the appropriate subject partition after validating the whole table, and updated evidence auditing and the curriculum test to read all declared rows. The reader rejects missing/undeclared files, inconsistent headers, repeated IDs, wrong-subject identities and data left in the schema-only root. LEDGER_COLUMNS.md, GITHUB_SYNC.md and README document import requirements. No D1 migration or product UI change.

## Verification
90 application tests pass, including six corrupted-partition cases and isolated exporter row-preservation verification. Typecheck, lint, 13 research checks and diff whitespace checks pass. The new evidence audit has zero errors and retains four known normalization gaps. The last successful product build/public scan and bounded browser check remain d1f8c05: this phase changes offline storage/scripts/tests/docs only, with no runtime import of the CSV files.

## Status and next
All academic counts unchanged: 13 partial note documents / 210 sections; 260 reviewed parent identities / 642 partial requirements / 356 links; seven obtained pairs. Maths has 38 text-indexed parts / 100 marks and selected visual checks, zero detailed Maths tasks. Physics has 51 detailed parts / 110 marks. Three provisional families, two experimental generators, two offline markers; zero active templates, complete chapters/points or fully processed papers. No AI provider configured, Sites version or deployment.

Latest allowances: 75% five-hour / 34% weekly remaining. No reset. Continue Maths visual page review and detailed extraction, Algebra 3D–L and wider curriculum/calibration. Source syncing this storage checkpoint remains the next step until exact remote equality is verified. Save/pause at 5% in either allowance. Preserve all history/UI and keep AI integration last.

User-facing overall estimate on 30 September: approximately 30/100, explicitly a judgement estimate rather than a coverage-ledger percentage. Architecture is substantially built; full content, validated assessment families, AI marking and deployment still require substantial work.
