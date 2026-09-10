# Resumed UI and validation repair — 10 September 2026

Resumed local 35d8bc5 after reading CONTINUE_ASTRA, PROGRESS_CHECKPOINT and RESUME-GATE. Five-hour 96% and weekly 84% remained; no reset consumed. Mirrored the exact saved tree 812ab4dc9a614a60bd2761a4bdc2e45d418fae20 to GitHub main 3c2b6ed0153c96c71c111b6064c034ce66cb77ed without changing local history. The implementation in this checkpoint is newer and needs another sync.

## Repairs

- Road progress no longer combines normalised pathLength with non-scaling dashes on a stretched SVG. A height clip follows the actual selected marker. Layout coordinates avoid entrance transforms; ResizeObserver tracks cards and container. Browser measurements at 390px and 1280px place the clip within 0.32px of marker centre; neither has horizontal overflow. Narrow screenshot confirms readable titles, Open action and terms. Current screen 639px was also checked. Reduced-motion is code-reviewed, not emulated.
- Subject shelf links now zoom the selected book and fade bottom-to-top for 420ms before navigation. The subject shell and contents fade in; the former whole-page clip ran in the opposite direction and could hide content on tall pages. Normal/modified links and reduced motion preserve native navigation. Actual click, contents arrival and browser Back verified; no console errors in the checked flow.
- The book panel had both outer and inner padding and a central spine over the terms. Removed duplicate padding and moved the decorative spine into the left margin. Open remains the exact visible CTA.
- Lint passes. Fixed external-store subscriptions in mobile hook/carousel (including missing reInit unsubscribe), explicit forwarded label/anchor content, and chart config keys (function accessors no longer stringify). Test registrations use explicit void: node:test owns their promises. Search result count uses output.
- Scoped lint exceptions are intentional, not proof that 61 functional defects existed: shared UI role-vs-tag preference is disabled because valid ARIA grouping need not become a fieldset; input addon click is an optional focus convenience with a keyboard-reachable input; original local SVG diagrams do not need raster image optimisation. Other accessibility rules remain enabled.

## Verification and limits

40 tests and 13 research checks pass. Lint passes. Isolated Miniflare D1 migrations/concurrent drafts/submissions/marking/ownership/privacy/deletion pass with synthetic data; the earlier EPERM was sandbox-only. Sites production build passes. No production database or AI service was called. No Sites version/deployment is claimed.

Curriculum/paper/template counts unchanged: seven partial notes/40 sections, six obtained pairs, seven detailed Physics parts/23 marks, English pilot one detailed task, zero fully processed papers and zero active templates. Continue whole Physics leaf inventory and exact scheme/mark reconciliation next; then detailed extraction, curriculum and template calibration. Keep immutable raw batch indexed-only.
