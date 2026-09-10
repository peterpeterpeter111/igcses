# Grain transition and Physics leaf index

## Follow-up visual correction — completed in the Luna pass

The queued correction is now implemented in the latest local descendant of `4a98dac`: the grain alpha-mask transition was removed; subject navigation uses a smooth bottom-to-top fade with perspective lift and light blur, and every chapter `Open` link has a bounded 3D book exit before routing. Reduced-motion and modified-click behavior remain native. Validation remains green (41 tests, typecheck, lint, 13 research checks, production build and public scan). Coverage, paper, template and deployment counts are unchanged. GitHub still needs a later explicit source sync; no Sites version or deployment was created.

## Final pause and latest user correction (historical)

Final allowance read after implementation commit 4a4e42b: five-hour 2% remaining, weekly 69%. Threshold crossed during checkpoint saving; paused immediately on observing it. No further application changes or source sync attempted; no reset consumed.

User subsequently rejected grain: use a smooth fade-away with 3D effects instead. Also add a 3D transition when each chapter's Open link is clicked (not just expansion of the chapter card). That correction is now recorded above as completed in the latest descendant. Preserve exact Open wording, accessible navigation, reduced-motion, browser Back and the corrected road clip.

Resume the latest commit, preserving history. Read this and RESUMED-UI-AUDIT.md before older checkpoints. No reset consumed. Last allowance reading before saving: five-hour 7% remaining; weekly 70%. Finish saving and pause at 5% in either.

## Saved implementation before the visual correction (historical)

- Previous repair commit 6c87084 fixes SVG road stretch/dash drift with a measured height clip, central spine text overlap, shelf-link exit navigation and all lint findings (including narrow, documented exceptions). D1 runtime passed. Browser road endpoint differs from marker centre by less than 0.32px at 390/1280; no horizontal overflow.
- New user-requested grain dissolve: 25 deterministic alpha-mask frames erase the shelf from bottom to top while the selected book advances/tilts in 3D, followed by contents fade-in. Total exit is 700ms. Modified clicks/reduced-motion use native links; cancellation and a bounded recovery restore the shelf on Back or failed navigation. Browser verified arrival/Back and zero console errors. A screenshot captured the 3D lift; the entire short grain sequence was not frame-by-frame visually audited. Browser inspection API lacks getAnimations; this is not an app error.
- research/reviews/2026-09-10-physics-leaf-index.json: 51 lowest printed task/subpart labels, 110 marks, reconciled against obtained QP/MS text. Q4(a)'s four rows remain one task; Q8 remains one six-mark task. This is NOT a whole-document visual audit and does NOT increase fully processed count.
- research/reviews/2026-09-10-physics-q3-page-review.json: visually inspected QP pages 6/7 and official MS page 6, five leaves/10 marks. Observations saved; full structured extraction/mapping/export pending. Detailed extraction count is still seven parts/23 marks, not twelve.
- 41 application tests pass; lint passes; Sites production build passes. Earlier phase's 13 research checks and isolated D1 runtime passed. AI untouched; no Sites version or deployment.

## Honest counts and next actions

Seven partial note documents/40 teaching sections; six obtained pairs; 62 reviewed Physics parents/78 partial teaching links; seven detailed Physics parts/23 marks and one English pilot task. Zero complete chapters/points, fully processed papers or active templates. Two provisional families, one experimental generator. 390 raw discovery links remain unreconciled. Raw lower-model batch remains indexed-only.

1. Check both allowances; continue only above 5%, consume no reset.
2. Sync the complete local delta to GitHub as a non-force descendant. GitHub 3c2b6ed0153c96c71c111b6064c034ce66cb77ed exactly mirrors local 35d8bc5. Newer repairs, grain effect, audits and this checkpoint need exact-tree sync unless later sync evidence says otherwise.
3. Inspect all remaining Physics QP/MS pages and enclosure visually; reconcile the 51 text-indexed leaves. Do not replace unknown fully-audited leaf counts with text-only proof. Complete Q3 structured extraction using saved page review, exact syllabus references and scheme alternatives; export through the bounded ledger script after removing its hardcoded Forces-only page/stimulus assumptions.
4. Continue full curriculum, per-leaf processing and validated template bank; keep AI integration until final pre-deployment phase. No new template or complete chapter was added this session.
5. Carry new index status into coverage UI separately from detailed/processed counts. The UI still correctly shows seven detailed parts but does not yet expose the new 51-leaf text index.
6. Build/test before saving a Sites version or deploying. Never claim a final deployed URL until the complete requested build and live verification succeed.
