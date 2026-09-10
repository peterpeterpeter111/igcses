# Physics extraction and first generator prototype — 10 September 2026

Continue from the latest local commit; preserve all earlier work. This supersedes the previous checkpoint's extraction/template counts. No reset credit used. Pause at 5% remaining in either applicable Codex allowance.

## Completed in this phase

- Reviewed obtained Physics Summer 2024 1P Q5 and Q12 against official scheme. Detailed overlay: research/extractions/4PH1-2024-June-1-standard.json. Seven leaf parts, 23 original marks: Q5(a), (b)(i–iii), Q12(a–c). Scheme maxima 3/2/3/3/4/5/3 preserved, including ECF and graph answer bands. Four document/task/mapping CSV ledgers now link the overlay: 2 documents, 1 partial paper, 7 tasks and 12 mappings. Raw batch remains indexed-only. Whole paper is NOT processed.
- First executable source-derived generator: server/generators/collinear-resultant.ts and provisional template 4PH1-collinear-resultant.v0.1.0.json. Generates original direct/inverse force problems with two/three forces, two axes, prose/table representations and three contexts per axis. Independent checks reconcile displayed data, force balance, answer direction and marks. Separate public/private projections; no route imports it and it cannot start a live quiz.
- Validation report: research/validation/2026-09-10-resultant-prototype.json; 200 deterministic unique seed examples, 16 structural combinations, 96 declared boundary/context cases. This is mathematical/representation validation ONLY. Full pedagogical validation and free-text marking calibration pending. No active template.
- Student answer guide in Physics forces-and-vectors links the same family and exact source task. Coverage page reports partial extraction and blockers separately from indexing.
- Research validation now checks both family files and exact Physics guide/task references. CSV header checks accept both common newline formats. Exporter deliberately restricted to this one reviewed paper.

## Verified

40 application tests pass, TypeScript passes, 13 research checks pass, production build succeeds, public bundle scan checks 34 files with zero sentinel findings. This does not prove a deployed or fully end-to-end tested site. Earlier browser checks covered notes/search/practice answers and the repaired layout. The source-derived answer guide is visible in the local browser. Production/authenticated quiz flow remains unverified and real quizzes remain disabled.

## Honest totals

- Six partial chapter note documents, 24 teaching sections, of which 18 are Physics Forces and motion; four original diagrams and two practical guides. Zero complete chapters and zero fully covered syllabus points.
- 33 reviewed Physics parent statements have partial teaching links (42 relationships). Detailed substatement coverage remains unaudited. Other subject inventories remain partial/raw. 36 chapter navigation entries are not 36 complete chapters.
- Six obtained QP/scheme pairs: Human Biology 1, Biology 1, Chemistry 1, Physics 1, English Language B 2, Mathematics B 0. English November pilot: 11 tasks indexed, one detailed Q5. Physics: 7 detailed leaf parts from two question groups. These are different task granularities; do not sum them into a whole-paper completion measure. Zero fully processed papers.
- Raw discovery ledger: 390 links = 188 QP-labelled (including two English extracts), 186 schemes, 16 reports. Neither exhaustive nor reconciled canonical counts.
- Two provisional template definitions (English retrieval, Physics resultant), one experimental runnable generator, zero active templates, zero calibrated live marking families.
- Quiz state/storage/recovery architecture exists and tests pass; 80-mark live quiz bank remains unavailable. AI integration still deferred; no credentials or calls added.
- Build succeeds locally. No Sites version or deployment created; no verified live website URL.

## Files added this phase

research/extractions/4PH1-2024-June-1-standard.json; research/templates/4PH1-collinear-resultant.v0.1.0.json; research/validation/2026-09-10-resultant-prototype.json; scripts/export-extraction-ledger.py; scripts/check-resultant-prototype.ts; server/generators/collinear-resultant.ts; tests/paper-extraction.test.ts; tests/resultant-generator.test.ts; this checkpoint. Existing coverage UI/library, Physics note guide/type, research validator and four normalized CSV ledgers updated. Downloaded PDFs/renders stay untracked in work/; no reference material under sources/ altered.

## Exact next steps

1. Recheck local commit, GitHub branch/tree and usage. Remote main before this phase: 9c5fa2a13df3fa161f58e717f194576d692f97c8, exact tree match to local bacd9591b89b4584216b2d9b01a7ce64ef14593e. Sync this phase as a non-force descendant mirror; preserve independent local history. Verify latest branch rather than relying on historical SHA.
2. Finish whole Physics paper leaf/page inventory and remaining ten question groups systematically. QP has 36 PDF pages including four enclosure pages, MS 17 including publisher footer. Whole-paper leaf count remains unknown and full 110-mark reconciliation incomplete. Examiner-report discovery still unresolved. Keep raw indexed-only records immutable and update detailed overlays separately.
3. Review Physics force-family inverse/three-force adaptations, original AO mapping and marking alternatives/contradictions. Add calibration exemplars and robust validators before any activation. Sketch/tangent/area families need an input design decision; typed answers cannot reproduce graph drawing marks. Do not treat successful algebra tests as assessment validation.
4. Continue exact substatement inventories and curriculum across all six subjects. All-subject completion is the largest remaining body of work. Obtain Mathematics B source evidence before claiming its paper coverage.
5. Keep AI last. Complete privacy/export/telemetry, navigation-loss review, browser end-to-end/authentication, production D1 migration and deployment verification. Build/test before a Sites version or deployment; only present a verified live URL.

## Paused at the requested threshold

Final usage reading: five-hour Codex allowance 95% used (5% remaining), weekly 94% used (6% remaining). Paused immediately after this reading; no reset consumed.

Implementation commit 3db7c60bd82fa4456be7c38169c8c29ed3de867d is backed up on GitHub main as 617f80991bbbb85017eec717909ef775a16c2853. Branch fetched and verified: both trees equal be043a72000219d962a93dd2c94e7a51db381e29. Connector text reads must preserve CRLF bytes (use git show bytes.decode, not Path.read_text) to reproduce exact CSV blob hashes. No force update or local history replacement used. This final checkpoint-only commit will be newer locally and needs a small sync on resume.

Final local browser screenshot confirms Physics coverage displays seven parts/23 marks and explicitly incomplete whole-paper status. One remaining wording hole was found at app/coverage/page.tsx:103: global coverage still mentions only the English provisional family. On resume update it to two provisional definitions, one experimental generator, zero active templates; also mention the partial Physics extraction. This was recorded rather than changing application code after the pause threshold. The final path-progress endpoint after the ResizeObserver fix still needs a browser check at chapter four, including narrow viewport and reduced-motion behavior. No claim of comprehensive visual or production QA.
