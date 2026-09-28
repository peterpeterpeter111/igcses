# Weight marking checkpoint — 19 September 2026

Follows e9e37c9 mechanics curriculum checkpoint, preserving history. Last allowance 59% five-hour / 47% weekly; no reset.

Visually rechecked original Q10(a) question page 22 and scheme pages 3/13. Implemented a bounded offline marker for explicitly transcribed mass and g multiplicands, final answer and preserved other working. It uses exact decimal arithmetic, checks the frozen question package, awards explicit substitution/evaluation and one deduction for a proved mass power-of-ten error, and refuses to infer a method from a favourable final number. It is not a student-facing response form, general free-text parser or live marker.

36 hand-authored synthetic response fixtures pass: 20 scored / 16 deferred. Deferred cases include missing working, alternative g, rounding/arithmetic ambiguity, conflicting answers, other working and unsupported notation. The source ignore-units instruction is applied to bounded unscaled labels; scale-bearing units are deferred. Unknown response fields, invalid types, overlong values and tampered schemes are rejected or deferred. Real student-response calibration remains absent.

Saved separate prose/table assessment-demand review. Both preserve gram conversion and multiplication but explicit g, removal of surrounding diagram and table layout are adaptations, not established equal difficulty. Source allows multiple g values; generated prompts select one, so alternative-g decisions remain deferred. Generator metadata remains markingCalibrated=false and liveEligible=false. The plain-text table needs a real rendered-table review before live use.

Files: server/generators/weight-marking.ts; tests/weight-marking.test.ts; scripts/check-weight-marking.ts; research/validation/weight-marking-cases.json; 2026-09-19-weight-marking.json; 2026-09-19-weight-demand-review.json; updated provisional family and normalized template ledger.

79 application tests, typecheck, lint, 13 research checks, production build and public scan pass (41 files, no findings). No UI source/layout changes in this phase and no fresh browser check. Nine partial note documents / 81 sections / 150 Physics teaching links; curriculum 33 parents / 57 partial requirements. Six obtained pairs, Physics 51 detailed parts / 110 marks, zero processed papers or complete chapters/points. Three provisional families / two experimental generators / zero active or validated templates; two bounded offline markers now exist. Physics versioned links still 2 of 51.

Next: Waves curriculum audit and teaching gaps, further source-derived families and broader calibration. AI last; no Sites version/deployment. GitHub sync remains pending the specific safe-upload approval after automatic review rejected the oversized upload; no bypass/retry and no remote write in this phase. Continue only above 5% in both windows, save/pause at 5%, never consume a reset.
