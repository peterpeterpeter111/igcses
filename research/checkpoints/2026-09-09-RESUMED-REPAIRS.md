# Resumed repairs — 9 September 2026

Continued from 0716b7e with all local history intact. GitHub main was read as 1e5a0dbb35defd484dbb414d839cc4b1daafe5dc; later local changes are not yet synced.

## Verified fixes

- Styles now load in explicit base/theme/override order. Previously the later rules inside globals.css undid path spacing and chapter-card layout changes. Existing base styles are preserved in app/base.css.
- The book spine uses a fixed 28px strip, rather than 9% of the panel width. Human Biology preview visually confirmed that the strip no longer extends beneath search text.
- SVG route strokes do not stretch in thickness. Selected progress is measured to the actual chapter height, allowing wrapped text and expanded panels rather than assuming equal chapter heights.
- A disposed/remounted quiz controller cannot dispatch its old submission after waiting for a draft save. Recovery restoration while loading preserves the recovery text.
- The flaky remount test claims its first request before awaiting transport, with a bounded timeout and cleanup. A cancelled earlier run was not proof of a production hang.
- 34 application tests, TypeScript and production build passed after these changes. No tests cancelled. Local Human Biology sidebar/chapter selection checked in the existing browser. Full browser quiz/auth/mobile validation remains incomplete.

## Unchanged research state

Six partial note documents, six obtained paper/scheme pairs, no fully processed papers, no complete chapters or points, no active templates. Source PDFs/ledgers preserved. No Sites version/deployment and no AI integration this phase.

## Next

Expand Physics Forces and motion from the already reviewed specification page 17, then review its remaining statement pages. Keep partial teaching evidence distinct from completed coverage. Continue curriculum/extraction and save a new checkpoint when either applicable Astra allowance has 5% remaining. No reset credit authorised or consumed.
