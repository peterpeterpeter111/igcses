# Force marker boundary repair — 20 September 2026

Continues cefea63. The offline resultant marker previously ignored unexpected response keys, allowing contradictory working to be silently discarded. It now returns needs-review with no score for extra fields, including otherWorking, alternativeAnswer and a supplied score. This does not parse or grade the extra evidence. The existing two-field response contract remains unchanged.

Added three saved fixtures plus a regression check covering malformed and extra-field responses. Structural calibration fixtures previously passed their expectedScore metadata to the marker; both the test and report harness now pass only the explicitly defined response fields. This is fixture metadata, not discarded learner evidence.

Saved new research/validation/2026-09-20-resultant-marking.json without overwriting the historical report. Its current source hashes record 39 response cases (26 scored, 13 deferred), 16 structures / 96 structural outcomes and 200 deterministic seeds. Added its reference to the provisional family and exported the normalized template ledgers with the current date. Updated the ledger test's snapshot date.

80 application tests, typecheck, lint, 13 research checks, production build and public scan (46 files) pass. No live activation, no general free-text marking, no real student-response calibration and no claim of difficulty equivalence. Three provisional families, two experimental generators and two bounded offline markers remain; zero active templates. Content/paper totals from HUMAN-CELLS are unchanged.

Next: remaining Human Biology cells/tissues and wider curriculum; representation/difficulty and response calibration remain open. AI last. Preserve history, no reset, check both allowances and pause at 5%. GitHub safe-sync approval still unresolved after the prior automatic-review upload rejection. No Sites version or deployment.
