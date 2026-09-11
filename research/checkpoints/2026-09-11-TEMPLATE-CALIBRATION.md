# Force-template calibration — 11 September 2026

Preserves Energy implementation 940db83, exactly mirrored by GitHub 32cb849d70b302fc0ab76ab883a4abfb833b7e84 (tree ab8b6c2b1e5fbf96f497e30739cee86f0cbcae0e). No resets or AI calls.

Reopened Q5(b.i) QP p12 and scheme p8 for original two-mark magnitude/direction rules. Fixed a validator gap: altered working, criterion IDs/text, source-family identity, table header, context, structural signature and extra public fields are now rejected. The family identity is frozen. Arithmetic validation still computes directional totals independently of the generation sum; the rendering check additionally compares canonical working.

Added an offline marker for separate final magnitude and direction fields. It accepts equivalent numeric units/notation and unambiguous direction aliases; the source's unqualified north earns no direction credit. Unsupported working, signed conventions, units or competing claims are deferred with a null score, never silently marked wrong or cherry-picked. No live quiz imports this marker.

28 hand-authored synthetic calibration cases pass: 21 scored, 7 intentionally deferred. Both direct and labelled editorial inverse/three-force adaptations are represented. This is not real student-response calibration or general examiner-style marking. 200 seeds retain all 16 structural combinations. New report stores current source/fixture hashes; the older report is historical.

The 47 application tests, typecheck, lint and 13 research checks pass. Two provisional families, one experimental generator, zero validated/active families remain. Broader assessment-demand, free-text and contradiction calibration still blocks promotion. No completion counts changed; AI integration stays last. Continue bounded source extraction and save a current build before any Sites version.
