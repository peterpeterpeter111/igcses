# Routine validation and evidence reconciliation — 28 September 2026

Resumed 4509a44 and preserved the unfinished 22 September edits. No content, curriculum, paper-processing, template-readiness or UI changes were made in this phase.

## Repairs and checks

- Fixed the new English AO review test's TypeScript inference error with an explicit NoteSection type and a checked lookup.
- Content reporting is now read-only by default and only creates an explicitly named new report. Exclusive creation refuses to overwrite an existing report. The historical 9 September report is unchanged; 22 and 28 September reports are retained separately.
- 82 application tests, typecheck and lint pass. All 13 research checks pass. The isolated D1 check passed on 22 September after its sandbox loopback-port restriction was resolved through approval; it used synthetic, nonpersistent data only.
- New scripts/audit-evidence.py performs read-only CSV shape/identity/JSON checks, syllabus/teaching-export reconciliation and hashes saved PDFs. No downloads, PDF extraction or academic judgement occurs. The dated evidence report records zero structural errors and all 19 expected documents matched locally by hash (six specifications, twelve paper/scheme documents and one English examiner report).

## Honest counts and gaps

13 partial note documents / 197 sections. 248 reviewed parent identities / 612 partial local requirements. 332 partial teaching links. Six obtained pairs. Physics 51 detailed leaves / 110 marks; zero fully processed papers. Three provisional families / two experimental generators / zero active templates. All chapters and points remain incomplete.

Eight normalization gaps are recorded without treating the sidecars as missing evidence: five used specification identities are absent from documents.csv; the English template task exists in pilot JSON but not tasks.csv; batches.csv and links.csv remain empty. The CSVs are a data contract rather than an applied D1 migration, and raw JSON sources remain intact. Scope reconciliation and population require the next reviewed migration phase; no automatic import or readiness promotion was performed.

Only scripts/tests/reports changed, so the last product build remains the verified 2dcf71b build; no new production build or UI verification was needed for this phase. No Sites version or deployment. GitHub safe-sync approval is still pending after the oversized-upload automatic-review rejection; no retry/bypass.

The user explicitly authorized a bounded Luna pass through the available weekly allowance, superseding the earlier 5% pause for that pass only. Current allowances renewed naturally; no reset consumed. Continue useful routine validation and low-risk repairs; reserve curriculum judgements, examiner marking and template activation for Astra. Keep AI integration last and save progress at major checkpoints.
