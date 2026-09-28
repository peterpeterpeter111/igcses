# Seed and preview verification — 28 September 2026

Continues 294a606. Added read-only --stdout mode to scripts/seed-content.ts so checks do not replace a prepared seed file. New integration test applies it twice to isolated SQLite, verifies exact JSON for all 13 notes, all 36 catalog chapters and six subjects, retains 710 source candidates as candidates, and confirms an existing synthetic quiz/draft and private packages remain unchanged. Foreign keys remain valid.

Extended scripts/check-d1-runtime.ts to verify the same saved chapter payloads in nonpersistent Miniflare D1 before its existing quiz concurrency/private-results/cascade checks. It passes; no development or hosted database data was modified. 83 application tests, typecheck, lint and diff whitespace checks pass. Product/UI source is unchanged; no new product build was required.

Restored the stopped local preview server on port 3000 (retained execution session 22719). The old tab held a connection-error document, so the replacement working tab is browser 1 / tab 3. All six subject searches returned their tested teaching targets. Offline exact-title search resolves every one of 197 sections. Browser DOM checks visited all 13 written chapters: headings and incomplete labels present, no broken same-page contents targets, all 17 diagram images loaded. These are functionality checks, not scientific diagram review or full responsive visual QA. Saved research/reviews/2026-09-28-preview-check.json.

README now reflects the current counts and documents read-only evidence reporting/seed checks. research/ASTRA_RESUME.md has a new current header retaining the old handoff as historical, explicitly superseding the old OpenAI key instruction because the user later requested another provider with AI last.

Counts unchanged: 13 partial documents / 197 sections; 248 reviewed parents / 612 partial requirements / 332 teaching links; six obtained pairs, Physics 51 detailed leaves / 110 marks; zero complete chapters/points/papers or active templates. Three provisional families / two experimental generators / two bounded offline markers. GitHub safe-sync approval remains pending; no Sites version or deployment, no reset.

Next bounded routine work: inspect the Mathematics B discovery gap without treating candidate links/downloads as reviewed papers, followed by the reserved Astra queue. Preserve UI/history/raw ledgers. Keep AI last.
