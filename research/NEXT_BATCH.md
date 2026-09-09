# First lower-model batch (paused before download)

User decision, 8 September 2026: use a lower model for repetitive work. The workflow/schema/pilot were delivered at commit 499d900. Do not redesign or restart. No further model-choice confirmation is needed. The user then broadened the scope beyond English and requested a pause before starting. **This batch is currently paused before any download.**

## Scope

- Cross-subject smoke batch: at most five additional released question-paper/mark-scheme pairs, one each from available recent inventories: 4HB1, 4BI1, 4CH1, 4PH1 and 4EB1. Exclude the November 2024 component 01 pilot already obtained. 4MB1 remains a discovery gap until an actual Mathematics B pair is identified.
- Start with the most recent identifiable pair in each selected subject; do not guess dates from wrapper URLs or pair solely by adjacent link order. Candidate identities are recorded in the planned script, but require cover verification.
- Resolve existing links and obtain publicly accessible official files. Do not crawl all archives or run the unrestricted research script. Optional reports may be obtained for these same five pairs; do not expand the paper count.
- Use deterministic scripts for downloads, SHA-256, page counts, deduplication and arithmetic. Use the lower model only for source-based identification and indexing.

## Required output per pair

1. Original/referring/resolved URLs, access date and result; exact blocker if inaccessible.
2. Cover-verified qualification, sitting, component, variant and matching scheme identity. Distinguish inserts and schemes from question papers. Flag ambiguity instead of guessing.
3. Raw PDFs and page extracts in ignored work/batches/; provenance and original metadata in research/ledger/v1/ or a versioned batch JSON conforming to LEDGER_COLUMNS.md.
4. Page inventory, all printed task/subpart IDs, exact original marks, scheme page references and optional-question rules. Flag unreadable text and missing grids for visual review.
5. Separate obtained, indexed and processed counts. This indexing batch must not promote a paper to processed, certify syllabus mappings or activate templates.
6. An Astra review queue for identity conflicts, amendments, detailed solution/rubric analysis, current-syllabus mappings, family equivalence and custom-mark adaptations.

Stop after five pairs or sooner if a shared access/extraction blocker prevents useful work. Save an exact next cursor and per-document state so retries resume instead of redownloading. Commit metadata and update PROGRESS_CHECKPOINT.md; keep downloaded sources out of public commits. Report successful pairs, incomplete pairs, indexed task counts and blockers before expanding the batch.

## Pause state

No files from this batch have been downloaded or indexed. `scripts/index-4eb1-batch.py` remains an unused English-only draft and is not the approved cross-subject batch. Do not run it. Create/use a new bounded script only after the pause is lifted and the active task is on the lower model.

## Separate API setup

User reports OpenAI Platform connected and has approved a new key plus the exact .env.local destination recorded in PROGRESS_CHECKPOINT.md. Retry discovery for the secure Platform tools. Do not request those approvals again, ask for secrets in chat, or infer that an unavailable tool proves the user is disconnected. No key has yet been created. Paper indexing itself needs no application API key.

## Scope reserved for Astra

Current syllabus/amendment interpretation; educational mappings; complete task analysis; family abstraction; original stimulus/rubric design; solvability and alternative-answer judgement; custom 2/4/6-mark validation; final review. A valid JSON record is not an educationally validated template.
