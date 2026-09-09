# Astra architecture checkpoint — 9 September 2026

Resumed a27a0b4. The user authorised Astra review and continuing until its usage limit; pause immediately if Astra becomes unavailable, do not silently use reserve for judgement work. Do not consume the available reset credit. Save each major phase. AI integration remains last, provider undecided after the user's plan to switch. No more clarification questions requested.

## Completed this phase

- Inspected all five downloaded question-paper and scheme covers visually. Qualification/component/sitting match at cover level. All five printed dates differ from filenames. Saved separate review evidence without rewriting historical indexer output or promoting processed counts.
- Rechecked all six current Pearson qualification-page specification links and downloaded hashes: identical to the saved specifications. Official final November 2026 timetable includes all six codes. Mathematics B Issue 1's old January/June wording is superseded for availability by the current timetable; full amendment audit is not complete.
- Built six subject routes and 36 top-level chapter routes, reusable navigation, subject search with one-edit typo tolerance, snippets and heading-link support, overall and per-subject coverage pages, quiz readiness and history states, and a health route.
- D1 schema: 17 tables; generated and inspected schema-only migration. Production/local D1 migration application and persistence service are not yet done.
- Implemented executable quiz state contracts: fixed 22-question/80-mark blueprint, private/public allowlist, owner checks, confirmed skips, ordered/idempotent submissions, bounded deterministic scores and completion-gated results. Synthetic test fixtures only; no active generator or live quiz.
- TypeScript check and 7 quiz contract tests passed; 11 existing research-design checks passed. Browser checked Physics route, typo search for “refracton”, and navigation to Waves. Initial home click did not navigate; direct navigation and later search-result click worked. Full walkthrough/build remains pending.

## Honest content state

- 390 raw discovery links; no canonical exhaustive inventory. Five batch pairs plus the English November 2024 pilot obtained. Six pairs in total, but all whole-paper processing counts remain zero.
- 710 candidate science references. Zero complete chapters, zero complete notes, zero completed syllabus points. The 36 chapter entries are structure, not completed content.
- One provisional research template; zero active templates. Quiz runtime contracts exist, but package generation, persistence, model marking and live flow are unfinished.
- Sites rechecked: version 0, live URL null. No production build, Sites version save or deployment this phase. No GitHub push yet.

## Next unfinished work

1. Write and source-check original notes against the current PDFs; inventory every statement/substatement and English/Mathematics skill.
2. Finish D1 persistence, ownership/idempotency tests, secure session routes and real history. Keep private schemes out of public responses.
3. Complete reviewed per-task extractions and validated generative families; no batch record may become processed from cover review alone.
4. Resolve Maths B discovery and reconcile remaining raw links in bounded batches. Respect the prior lower-model choice for repetitive collection; do not spawn agents without explicit delegation authority.
5. Run production build and full browser/security checks, push to GitHub, save a Sites version. Integrate the chosen AI provider through backend-only routes in the final phase, then deploy only after the complete requested site is verified.

Local preview: existing server PID 60566 at http://localhost:3000. CUA in-app tab 1. The server predates this turn; reuse it. New files are listed by Git; raw PDFs and review images remain ignored under work/.
