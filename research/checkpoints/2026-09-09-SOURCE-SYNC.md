# Astra checkpoint - 9 September 2026, source sync and statement inventory

This supersedes earlier PAUSED/architecture claims about GitHub and concurrency. Continue from the latest local commit, never reset to a historical SHA. Usage was 91% consumed before this final bounded save; no reset credit was used.

## Completed this resumed session

- Recovery implementation committed locally in e025e48b952ec63024805129a406d46509ea26b0. Snapshot D1 reads, compare-and-swap draft saves, identical retry acknowledgement, transactional submission races, and a tested client controller now preserve uncertain submissions and conflicting local drafts. See 2026-09-09-RECOVERY.md for details.
- Full source for that commit is backed up on GitHub main at 4a9c823e3afc237aab596fc054a3b08162666eb1. Its tree d764ccc969de886832a829961e68842855bcf099 exactly matches the local source tree; 180 tracked text files, no downloaded PDFs or secrets. The remote commit descends from bootstrap b89917d01eff13001f03272e58a43c31ec8f282e. Local history is untouched; remote and local commit IDs differ because the connector created an exact-tree mirror. The later checkpoint delta will be synced separately; verify main against the latest local tree when resuming.
- 33 Physics Forces and motion numbered statement identities and Paper 1/Paper 2 applicability visually verified against current official Issue 4 PDF pages 14,15,17,18,19. Original summaries and exact source hash recorded in research/syllabus/4PH1-forces-and-motion.json; matching 33 rows populate research/ledger/v1/syllabus-points.csv. Separate substatement auditing remains incomplete.
- Physics coverage page now exposes those reviewed statements separately from the immutable raw candidates. No teaching-completion counter was increased.
- Verification: 32 application tests passed, TypeScript passed, production build passed, public build scan checked 29 files with no sentinel findings. The prior recovery commit also passed a separate isolated Miniflare D1 runtime test. No live browser/authenticated production check is claimed. Existing lint backlog remains open.

## Honest content totals

Six partial note documents with eight teaching sections; zero complete chapters and zero fully covered syllabus points. 36 top-level chapter entries. 710 raw science candidates retained; 33 now have a separate reviewed statement-identity record, which is not full teaching coverage.

Six obtained question-paper/mark-scheme pairs: Human Biology 1, Biology 1, Chemistry 1, Physics 1, English Language B 2, Mathematics B 0. Five summer-2024 pairs remain indexed-only. The November-2024 English pilot has 11 tasks indexed, Q5 detailed, but whole-paper extraction incomplete. Zero fully processed papers. Raw discovery: 390 links (188 question-paper, 186 mark-scheme, 16 report), not a reconciled exhaustive paper inventory.

Template schema/contracts and one provisional English family exist; zero active templates or validated runnable families. Quiz generation is deliberately gated and cannot yet offer real quizzes. AI integration remains deferred and no provider key has been configured by this session.

## Not saved or not finished

An attempted larger Physics notes write timed out before creating its file. Therefore none of the proposed six additional sections or graph assets exist. The existing two Physics sections are unchanged. Only the 33-statement inventory and coverage display were saved.

All-subject curriculum completion, substatement breakdowns, detailed paper extraction/mapping, Mathematics B paper acquisition, runtime generators, rubric/marking review, final server-side AI, telemetry/privacy/export requirements, browser end-to-end checks and production migration remain unfinished. Client SPA navigation away with unsaved text and recovery-panel editing deserve another review; beforeunload alone does not cover every internal link. The synthetic D1 runtime script uses the installed transitive Miniflare dependency.

Sites project appgprj_6a9fb37ec9b48191a33eada1843b3a8f remains version 0 with no live or preview URL at this session's check. No Sites version or deployment was attempted. A successful local build is not a deployed site.

## Next bounded phase

1. Verify latest local status and GitHub main tree. Preserve both histories; no force push.
2. Continue Physics notes from the reviewed inventory, starting with units, distance/velocity graphs, practical motion investigation and v² = u² + 2as. Add original accessible diagrams and check calculations. Keep complete=false until the chapter's entire completion gate passes.
3. Continue exact substatement inventories across all six specifications and the existing English pilot or one obtained paper at a time. Never equate an indexed PDF with a processed paper.
4. Implement validated source-derived generators only after source-task mappings and rubric contracts are reviewed. Keep AI last. Build/test before any Sites version or deployment, and verify a live URL before presenting one.

Pause when Astra's allowance is exhausted; do not consume a reset or silently switch judgement-heavy work to reserve.
