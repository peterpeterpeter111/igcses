# Current source-policy calibration — 25 October 2026

Chemistry isotope-mass v0.1.0 is now an offline four-mark generator and bounded structured-transcription marker. It enumerates60 original tables from three genuine isotope triplets with clearly authored enriched-sample proportions. There are60 tables, not an unlimited bank. Exact-tenth results, rounding ties and the source table are excluded initially. Four source marks are retained, but no validated custom maximum or live template is claimed.

480 synthetic cases (420 scored/60 deferred) test all60 tables separately from five source-policy fixtures. The fixture set contains TWO actual publisher examiner-labelled responses and THREE explicit mark-scheme concessions, not five independent learner responses. They are development examples used to shape the implementation, not a held-out accuracy estimate. Transcriptions and review are by agents, not a human examiner.

The pictured Q3.c response uses neutron values12,13,14, obtains1232/100 and rounds12.32 to12.3. Pearson explicitly awards3/4. Nearby prose calls the inputs protons/atomic numbers; preserve this discrepancy. The exact historical response receives an aggregate3/4 in a source-only adapter. Individual mark attribution is not invented, and this exception is NOT transferred to generated responses. General wrong-mass ECF, conflicting work, unsupported notation and precision defer for fuller review.

The Q4.a.ii response with complete correct caffeine substitution but final196 receives1/2, matching the examiner label. A different example with intermediate194 then unnecessary division to0.123 has no unambiguous numeric label: excluded from gold counts. The formula-mass shared scoring core was refactored without changing its existing generated-response policy; all80 prior synthetic cases remain required.

Evidence: research/calibration/4CH1-2024-June-1-standard.json, research/validation/2026-10-25-chemistry-isotope-prototype.json and research/reviews/2026-10-25-ISOTOPE-CALIBRATION-REVIEW.json. Public coverage receives only an explicit counts/limits projection. No response fixture, source scan or private solution is imported into student code.

Current bank:19 provisional families,25 versions,32 versioned source links,NINE offline runtimes,ZERO active exam templates. Curriculum and paper counts unchanged. Further response breadth, rendering/demand calibration, official AO review and all remaining blueprint/source/curriculum gates are unfinished. DeepSeek remains optional offline research; no key has been configured and no provider call has occurred. Student AI stays last.

The 19 October record below is historical and remains useful for the runner and earlier synthetic prototype.

# Template development and calibration

The 19 October priority is to accelerate exam-template implementation and testing. DeepSeek may assist with offline research evaluations; this does not enable student-facing AI early. The production registry stays empty until source, generation, marking and blueprint gates are satisfied. A single reviewed family may cover multiple genuinely equivalent source tasks; a separate family per task is not required.

## What now runs

Chemistry relative-formula-mass v0.2.0 has an offline deterministic generator, immutable private packages and a bounded structured-transcription marker. All ten original candidate formulas are generated from a reviewed neutral structural representation; there are ten formula variants, not unlimited uniqueness. Seeds repeat. Source caffeine is excluded from fresh generation.

The synthetic regression set contains 80 responses: 50 scored cases and 30 deferrals. Cases cover correct answers alone, reordered correct working, evaluation errors, method-only answers, wrong-formula/no-ECF, conflicting working, units and extra evidence. These agent-authored labels are regression targets, not independently examiner-labelled learner responses. Agreement on them is not examiner accuracy or evidence of equivalent difficulty.

Generate the private dataset and run deterministic checks:

```sh
node --experimental-strip-types scripts/check-formula-mass-prototype.ts
python3 scripts/deepseek_calibration.py work/template-calibration-2026-10-19/formula-mass-cases.json
```

The second command is a dry-run. It makes zero network calls. It reports whether a credential is present without displaying it.

## DeepSeek research evaluation

The [official model table](https://api-docs.deepseek.com/quick_start/pricing/) checked on 19 October 2026 identifies `deepseek-flash` as DeepSeek-V4.1-Flash-1017. It is the default for bounded repetitive evaluations. `deepseek-v4-pro` is an explicitly selectable alternative. Hosted inference is usage-priced; these scripts do not install weights or assume a free hosted service.

The runner reads `DEEPSEEK_API_KEY` from the process environment or an explicitly supplied local `--env-file`. It never executes that file, reads another credential from it, stores the key, prints it or puts it in frontend code. No credential has been configured or used as of the initial checkpoint. Do not paste secrets into chat or commit them. For a securely configured environment, an explicit research run is:

```sh
python3 scripts/deepseek_calibration.py work/template-calibration-2026-10-19/formula-mass-cases.json --execute --output work/template-calibration-2026-10-19/deepseek-first-run.json
```

Optionally append `--env-file /absolute/path/to/an/existing/secure.env` if the key is already stored securely there. The path is not a key. A run is capped at two requests of up to eight cases each, with 2,048 output tokens per request, no retries and a 30-second request timeout. Cases are interleaved so the first 16 cover all ten formulas and all eight response patterns, but only 16 of 80 actual responses. It must not be reported as full-set model calibration. The report's `nextCaseOffset` is a stable resume cursor; pass `--case-offset 16` for the next slice, using a new output file each time. There is no automatic multi-run loop. Transport/auth/quota failures stop immediately; malformed/truncated model replies are failed evaluations rather than passing abstentions.

Only original question data, response transcriptions and a task policy are sent. Gold labels and descriptive case identifiers remain local. No PDFs, source scans, student records, live quiz answers or API credentials are included in model prompts. Redirects are refused so the authentication header cannot be forwarded to another host. Model reasons are untrusted research observations saved privately for inspection, never commands or authoritative mark-scheme amendments.

## Promotion gates

1. Verify exact source identity, original maximum, current applicability and scheme concessions.
2. Check finite parameter boundaries, chemical/mathematical validity, source exclusion, determinism and private-package integrity.
3. Compare marker results with independent, source-referenced response labels. Separate unsupported responses requiring review from wrong answers.
4. Review actual rendered stimuli, notation, diagrams and equivalent difficulty. Validate each proposed mark adaptation separately.
5. Review complete blueprint coverage and server integration. Only then register an active family.

DeepSeek can propose variants, adversarial responses and review comments. It cannot approve its own drafts, redefine official scheme policy, assign invented official AO allocations, alter coverage counts or activate a template. AI-assisted synthetic agreement is one item of evidence, not a substitute for the remaining review gates.
