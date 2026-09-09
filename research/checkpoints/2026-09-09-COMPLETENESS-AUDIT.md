# Completeness audit — 9 September 2026

This is a conservative audit of the full build prompt against the saved local project. The percentage measures requested deliverables, content and release readiness; it is not a line-of-code estimate. It rounds down so partial architecture cannot be mistaken for finished educational coverage.

## Estimate

**Approximately 30% complete overall** (30.5 weighted points, rounded down).

| Area | Weight | Evidence in the repository | Estimated area completion | Weighted points |
| --- | ---: | --- | ---: | ---: |
| Specification research and coverage control | 20 | Six official specification PDFs and the November 2026 timetable were rechecked; workflow, ledger schemas and 710 science candidates exist. Full statement/substatement and English/Mathematics skill audits are unfinished. | 30% | 6 |
| Paper discovery, reconciliation and extraction | 20 | 390 raw links are catalogued; six QP/MS pairs are obtained in total (five indexed-only batch pairs plus the English pilot). No paper is fully processed. Mathematics B discovery is still a gap. | 15% | 3 |
| Subject content, notes, search and navigation | 20 | Six routes, 36 chapter entries, coverage pages, search and restrained styling exist. Six partial note documents contain eight sections; zero chapters or syllabus points are complete. | 45% | 9 |
| Quiz contracts, templates, generation and marking | 20 | The 22-question/80-mark contracts, D1 session store, private package hashes, UI and provisional template schema exist. The runtime registry has zero active families; generation, marking and review are absent. | 35% | 7 |
| Persistence, identity, history, privacy and telemetry | 10 | Seventeen-table schema, local migrations/seed, ChatGPT owner checks, history route and synthetic isolation tests exist. Guest history, visit/login counters, retention/opt-out, summaries, export, review amendments and spend controls are absent. | 45% | 4.5 |
| GitHub, Sites, production and end-to-end verification | 10 | Local typecheck/tests/build and a partial browser walkthrough pass. GitHub contains only the README bootstrap; Sites has version 0, no live URL and no production D1 migration/seed. | 10% | 1 |

## Hard blockers

- Complete syllabus teaching coverage: **0 complete chapters, 0 complete specification points, 0 human-reviewed records**.
- Exhaustive paper processing: **0 fully processed papers**; the indexed batch is not promoted by cover evidence.
- Active generative bank: **0 active templates**; the one English family is provisional and runtime-disabled.
- Live product: full source sync, production D1 setup, Sites version, deployment and verified URL are all pending.

## Holes Astra should patch

1. Finish the current-specification statement/skill inventories and map every point to original notes, examples, experiments, diagrams, answer guidance and source evidence. Expand all 36 chapter entries, including the verified Mathematics B matrix/differentiation/sectors/coordinate-geometry topics and the complete English Language B question guides.
2. Reconcile expected-versus-found paper matrices, resolve the 4MB1 discovery gap, then extract every task and subpart from each obtained pair with exact scheme matching, optional-mark arithmetic and source/report provenance. Keep indexed, provisional and processed states separate.
3. Implement the validated template runtime: source/task links, bounded parameter generation, independent solution and rubric checks, multi-seed boundary tests, duplicate prevention and server-side frozen packages. Keep the registry empty until families pass educational review.
4. Add backend-only provider integration in the final phase with bounded requests, timeouts, retries, schema validation, redacted logs, rate/spend limits and no client-visible secret. Implement examiner-style marking, ambiguity review/amendments and evidence-based improvement summaries.
5. Complete guest/local history, visit/session telemetry with pseudonymised short-lived network identifiers and opt-out, login counters, export/deletion UI and account isolation across intended persistence boundaries.
6. Add transaction-serialising D1/Worker concurrency tests and finish reload/interruption/duplicate-click handling. Run the full six-subject keyboard, mobile, focus, reduced-motion, back/forward and live-API walkthrough.
7. Sync the exact reviewed source to `peterpeterpeter111/igcses`, migrate/seed production D1, package and save a Sites version, deploy only after the completed flows pass, then verify the real URL.
8. Resolve or deliberately scope the current lint failures after application behavior is stable, prioritising quiz-component compiler warnings and accessibility findings in user-facing controls.

## Current evidence

- 21 application tests pass, including catalog, search, coverage-ledger, quiz-contract and SQLite-backed store tests.
- TypeScript and production build pass; the research-design validator reports 11 passing checks.
- The public-build scan passes with no API-key pattern or synthetic private quiz fixture found in `dist/client`.
- `npm run lint` currently fails on generated UI accessibility rules, quiz-component React compiler warnings, seed-script stringification, and no-floating-promises warnings in tests. These should be cleared or deliberately scoped before release; no generated-component rewrite was attempted in the constrained pass.
- No AI call has been made, no API key is configured in the project, and no public source PDF is committed.

An attempted lower-model audit handoff was blocked by the account usage limit, so this report is based on local deterministic inspection of the saved source and manifests.
