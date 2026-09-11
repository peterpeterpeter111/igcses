# Offline force calibration — 11 September 2026

The Physics phase ff5e9c6 is synced non-force at GitHub 95fcd3909b168b225e789387fd8e20315f26dd4b; both have tree 2fbfcfb548c4c595c87ebddeef5eadebc18629ca.

Fixed two bounded offline marking defects: direction lookup could treat inherited object-property names as wrong directional answers rather than unsupported text; floating-point comparison could round a long incorrect decimal into full magnitude credit. Lookup now checks own aliases, and the magnitude comparison preserves exact decimal digits with bounded integer exponent arithmetic. This is not a general answer parser, and no live quiz family is registered.

Calibration is now 36 hand-authored final-answer cases (26 scored, 10 deliberately deferred) plus 16 structural fixtures with 96 synthetic outcomes (80 scored, 16 deferred). The fixtures use eight independently solved setups represented in prose and tables; they cover direct/inverse tasks, horizontal/vertical axes and two/three forces. The existing 200-seed, 16-structure deterministic checks still pass. These are synthetic checks, not student-response calibration or assessment-difficulty validation.

62 application tests passed. Typecheck and lint passed after replacing unsupported BigInt literal syntax with the equivalent constructor form, preserving the existing compilation target. The calibrated runner, 13 research checks, final production build and public scan passed. Run report hashes identify the exact generator, marker and fixtures. Two provisional families and zero active/validated templates remain.

Physics retains 195 reviewed numbered parent identities; 51 detailed leaf records/110 marks; 83 parent mappings. Notes remain nine partial documents/74 sections and 135 partial teaching links. Zero complete chapters/points or fully processed papers. No reset, AI integration, Sites version or deployment.

Next phase: inspect the official experimental/mathematical skills pages to resolve Q10 contextual mapping limitations, then curriculum substatements, assessment-demand calibration and remaining paper gates. Continue only above 5% in both allowances.
