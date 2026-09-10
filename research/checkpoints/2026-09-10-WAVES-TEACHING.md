# Waves teaching checkpoint — 10 September 2026

Previous phase 160f651 fixed selected-card clipping, verified chapter-four progress at 390px and 1280px, and corrected global coverage wording. See PATH-VERIFIED.md for bounded browser evidence.

## Added and verified

- New content/notes/physics-waves.json: 16 source-checked partial sections, each with worked example and practice answer. Scope includes wave definitions/equations, Doppler effect, electromagnetic spectrum/uses/hazards, reflection/refraction, refractive index/TIR, sound, oscilloscope and pitch/loudness. Three structured practical guides address four named specification practical requirements (3.17, 3.19, 3.25P, 3.27P).
- Two original SVG teaching diagrams: spatial wave snapshot and rectangular-block refraction. Browser inspection checked both rendered figures and their worked examples. Final refraction angle arcs explicitly show the reference normal; the updated figure was visually rechecked in the browser.
- research/syllabus/4PH1-waves.json: 29 parent identities/applicability checked visually against official Issue 4 PDF pages 22–24 (printed 16–18), whose unchanged hash is recorded. 36 partial teaching relationships added to normalized ledger. No substatement-complete status claimed.
- lib/syllabus.ts lets the coverage page display separate reviewed chapters. The note registry supports multiple chapters per subject, and scripts/seed-content.ts now uses that registry instead of loading only one subject-named JSON file. This fixes the omitted-second-chapter seed bug.
- Independent numeric report research/reviews/2026-09-10-waves-notes.json checks 17 numerical answers. Isolated in-memory SQLite migration/seed application verified 758 rows and all seven note documents/40 sections; no live database modified.
- Research activation check corrected to accept the schema's actual reviewed statuses when appropriate; pending families still cannot activate. No template promoted.

40 application tests, TypeScript, 13 research checks and Sites production build pass. Public build scan: 36 files, zero sentinel findings. The production build was refreshed successfully after the final diagram arc edit. AI still deferred. No Sites version or deployment.

## Honest totals

Seven partial note documents across six subjects, 40 sections total: Physics Forces and motion 18, Physics Waves 16, other five subjects six sections combined. Six diagrams total. Reviewed Physics parent statements: 62 (33 Forces and motion + 29 Waves), with 78 partial teaching links. Zero complete chapters or fully covered points. 36 chapter navigation entries remain.

Paper counts unchanged: six obtained QP/scheme pairs; Physics seven detailed parts/23 original marks and English pilot one detailed task; zero fully processed papers. Two provisional template definitions, one experimental generator, zero active templates. 390 raw discovery links remain unreconciled/exhaustiveness-unproven.

## Continue next

1. Save/sync exact local source tree without replacing histories. GitHub before this resumed session was 096628d matching local a1146e3; verify latest main.
2. Complete whole-paper inventory of obtained Physics 2024 1P: 36 PDF pages (includes equation enclosure), 17 scheme pages. Reconcile leaf paths/marks and all 110 candidate marks before updating whole-paper counts. Detailed processing still requires solutions, mappings and source-derived template links.
3. Continue detailed extraction, substatement teaching audits and calibrated generative families. Typed quizzes still cannot fairly reproduce drawing marks. Additional subject curriculum, Mathematics paper acquisition and all-subject coverage remain large unfinished areas.
4. Keep AI for final pre-deployment phase; complete production/storage/privacy and end-to-end verification before any deployment. Pause at 5% in either applicable allowance, without consuming a reset.
