# Template bank and quiz contract — design checkpoint

`schemas/template.schema.json` defines a strict JSON Schema v1. `templates/4EB1-retrieve-two-causes.v0.1.0.json` is one populated, provisional family. This is an implemented **data schema with a design example**, not a working generative quiz bank. Runtime generators, rubric validators, answer guides and model routes remain unimplemented. No active templates and no live API requests exist.

## Template fields

Identity/version/status; subject; exam-derived or syllabus-derived origin; current issue/point/page mappings; exact source task/paper/scheme references; shared student answer-guide ID; command word; skill and AO; original mark maxima; separately validated 2/4/6 custom maxima; original stimulus/evidence requirements; typed parameters with bounds; semantic constraints and relationships; difficulty controls; allowed/forbidden transformations; solution procedure; marking method and criteria; acceptable alternatives; dependencies, contradictions, units/tolerances; sourced versus editorial errors; validator IDs and test evidence; runtime private/public fields and review state.

Relations such as cause → outcome and remedy → reduced cause are part of the English example. A numerical family must instead encode its governing equations, units, domains, rounding rules and excluded singularities; naming a formula without an executable solution check is insufficient.

The schema enforces required fields and prevents provisional/untested records being declared active. Further semantic checks must verify parameter bounds, references, mark sums, rubric bands, dependency graphs and actual executable rule registration. JSON-schema success proves shape only. It does not prove solvability, clear wording, syllabus fit or fair marking.

## Promotion gates

1. `provisional`: provenance and proposed structure exist; must not be served.
2. `validated`: curriculum mapping and pedagogy reviewed; implemented generation/validation tested with at least 20 seeds, every parameter boundary and each supported transformation. Include positive, equivalent, duplicate, contradictory and invalid responses. Failures and corrections are recorded. Twenty seeds are a minimum gate, not statistical proof of correctness.
3. `active`: implemented generator, registered executable validators and persisted passing runs available; no unresolved review blockers. Custom quizzes may use only that template's independently validated custom maxima.
4. `retired`: unavailable for new selection; retain versions and served packages for historical attempts.

The same stable family ID links source tasks, chapter answer guides and generators. A template can have multiple source tasks; a task can map to more than one family. Preserve different official mark allocations. Unsupported custom adaptations remain pending. Never label model review as human review.

## Runtime contract to implement after this checkpoint

Selection → parameter seed → original stimulus/question → independently checked solution and rubric → bounded validation/retry → immutable stored package → serve public fields only. Do not use a finite fixed-question list as the main generator. Record meaningful context/data/representation variation, structural signatures and recent served fingerprints to reject exact and near repeats.

The server selects the blueprint once: **8 × 2 + 10 × 4 + 4 × 6 = 80 marks, 22 questions**. Maximum marks are only 2, 4 or 6; earned marks may be odd. Balance eligible topics, skills and difficulty before starting. If there are insufficient validated families, report the coverage gap rather than filling the session with unvalidated questions.

Public response allowlist: instance ID, position, prompt, complete stimulus, maximum marks and progress. Server-only package: template/version/seed, sampled parameters, provenance, model and validator versions, solution, rubric, accepted alternatives, evidence spans, package hash and validation record. Never import research/template files containing solutions into a client bundle. Hidden HTML and pre-completion network responses count as disclosure.

Freeze the entire package before an answer can be submitted. Store the generated output as well as the seed: an LLM seed alone cannot guarantee identical output across retries or model changes. Save drafts and final answers durably; use ownership checks and idempotency before advancing. A retry must retrieve the same served package. Loading text and the known mark maximum appear only while generation is actually running.

OpenAI generation and marking calls belong only in authenticated backend/serverless routes, using a Sites secret. No key in browser code, public environment variables, logs or Git. Requests require bounded size/time/retries, rate and spending controls, structured output validation and isolation of student text as untrusted data.

Mark against the frozen scheme, with deterministic arithmetic for awarded marks and totals. A second review handles ambiguity; record any justified rubric amendment/version and score revision without silently replacing the original. Release schemes and feedback only after the full session is completed and saved. AI marking is formative, never an official Pearson grade.

## Current API setup state

OpenAI is the selected provider. User approved creating a new key and the secure local destination `.env.local` / `OPENAI_API_KEY` on 2026-09-08. Do not ask those decisions again. The user now reports Platform connected. The OpenAI Developers local-confirmation tool is available, but fresh discovery still exposes neither the Platform picker nor encrypted key-creation tool in this task. No key has been created; the last Sites environment check was revision 0 with no entries. The remaining blocker is callable tool availability, not a verified failure of the user's connection. On resume, rediscover tools, use the approved destination and configure a Sites secret before deployment; do not repeatedly ask the user to reconnect or paste a secret in chat.
