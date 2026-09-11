# Navigation recovery — 11 September 2026

Preserved ec90ddc and all existing visual keyframes. Fixed a confirmed lifecycle bug: ChapterOpenLink discarded its animation handle after the animation completed, leaving the forwards-filled invisible card without recovery when navigation stalled. The shelf also had an uncovered animation-construction failure path.

Added a shared bounded transition owner for shelf and chapter links. It retains all animation handles through route navigation, clears visual fill/data flags on unmount and pageshow, restores after a stalled push, handles failed animation creation, prevents duplicate clicks and guards stale completion from navigating or cancelling a newer exit. A 2200 ms animation watchdog and 1500 ms post-animation navigation recovery prevent indefinite hidden content. Modified-click and reduced-motion native-link branches remain unchanged.

Five focused lifecycle regression tests pass, covering successful finish plus stalled navigation, cancellation/Back cleanup, duplicate clicks, a never-finishing animation, construction failure, failed route push and stale completion. Full suite: 57 tests, typecheck, lint, production build and public scan (39 files, zero findings) pass. The 13 research checks passed in the preceding content phase and no research content changed here. This is code/lifecycle verification; a new real-browser pass has not yet been performed.

Counts remain nine partial notes/74 sections, 113 reviewed Physics parents/135 partial links, six obtained pairs, Physics 24 detailed leaves/59 marks; zero complete chapters/points/papers or validated/active templates. AI is still last. No reset, Sites version or deployment.

GitHub main b23f25598d311230b5fbff77602f685b1f5b1336 exactly mirrors ec90ddc, tree ea95059f2d6dc620b1755563117625518326e2a6. This navigation/checkpoint delta is newer locally until the next sync. Preserve both histories; never force replacement. Last allowance read before this save: 19% five-hour / 24% weekly; recheck before continuing and checkpoint/pause at 5%.

Next: verify navigation in the browser, continue remaining Physics detail (Q1/Q2/Q4/Q9/Q10/Q11), curriculum/substatement audits and calibrated templates. Q4 source pages were reopened but its extraction is pending; retain its source-specific stellar-stage caveats. Keep source reports/current implementation evidence separate from template promotion metadata.
