# Coverage ledger format — v1

The existing `paper-ledger.json` (390 discovery records), `coverage.json` (710 science candidates), `sources.json` and `discovery-log.json` are retained. They are raw inputs, not proof of canonical paper counts or completed coverage. New reviewed records live under `ledger/v1/`; the pilot JSON is the current populated record. CSV files provide exact import headers for subsequent batches. These tables are a data contract, **not an applied D1 migration**.

All IDs are stable, opaque strings except documented natural keys. Dates are ISO 8601; PDF pages are one-based. In CSV, an empty cell is unknown/not supplied, never false or zero; booleans are `true`/`false`, and `_json` fields contain JSON arrays/objects. Each record records its schema version, batch and last update. Revisions append audit events rather than silently rewriting provenance.

| Table | Columns and meaning |
| --- | --- |
| `links.csv` | link_id; document_id (nullable until identified); qualification; discovery_url; original_url; resolved_url; label; claimed_type; verified_type; access_status; http_status; accessed_at; blocker; batch_id |
| `documents.csv` | document_id; qualification; document_type; canonical_url; title; publisher; specification_issue; year; series; component; variant; printed_exam_date; filename_date; publication_code; sha256; page_count; access_status; local_evidence_path; reviewed_pages_json (page, mode, reviewer, date); identity_status; identity_notes; batch_id; updated_at |
| `papers.csv` | paper_id; qualification; year; series; component; variant; qp_document_id; ms_document_id; insert_document_ids_json; examiner_report_ids_json; report_status; target_specification_id; applicability_status; stage; last_successful_stage; expected_leaf_tasks; indexed_leaf_tasks; extracted_leaf_tasks; assessed_marks; all_alternatives_marks; option_rules_json; reconciled_marks; scheme_match_status; complete_page_audit; template_links_complete; blocking_issues_json; reviewer_type; reviewed_by; reviewed_at; human_reviewed; batch_id; updated_at |
| `tasks.csv` | task_id; paper_id; question_path (e.g. 3.b.ii); parent_task_id; record_kind (leaf/aggregate); section; option_group; qp_pages_json; stimulus_refs_json; scheme_pages_json; command_word; original_marks; assessment_objectives_json; required_knowledge; context_summary; stimulus_types_json; solution_structure_json; marking_method; rubric_ref; acceptable_alternatives_json; dependencies_json; common_errors_json (source/editorial labels); report_refs_json; extraction_status; mapping_status; review_status; reviewed_by; reviewer_type; human_reviewed; blocker; batch_id; updated_at |
| `syllabus-points.csv` | point_id; qualification; specification_document_id; specification_issue; official_reference; parent_point_id; reference_kind (statement/substatement/skill); short_original_summary; pdf_page; printed_page; applicable_components_json; applicability_status; extraction_status; reviewed_by; reviewer_type; human_reviewed; updated_at |
| `coverage.csv` | coverage_id; point_id; chapter_id; heading_id; explanation_status; example_ids_json; answer_template_ids_json; source_refs_json; draft_status; source_check_status; human_review_status; checked_by; checked_at; blockers_json; updated_at |
| `task-mappings.csv` | mapping_id; task_id; point_id; mapping_kind (primary/supporting/historical); current_applicability; evidence_refs_json; rationale; review_status; reviewed_by; reviewer_type; updated_at |
| `template-links.csv` | link_id; task_id; template_id; template_version; relationship (derived/supporting/adapted); original_marks; custom_marks_json; adaptation_validation_status; evidence_refs_json; review_status; updated_at |
| `templates.csv` | template_id; version; qualification; origin (exam-derived/syllabus-derived); schema_path; family_status; original_marks_json; validated_custom_marks_json; source_task_ids_json; syllabus_point_ids_json; generator_status; validation_run_ids_json; pedagogy_review_status; human_reviewed; blocker; updated_at |
| `batches.csv` | batch_id; research_cutoff; scope_json; approval_reference; model; tools_json; started_at; finished_at; status; inventory_complete; cursor; discovered_links; obtained_documents; processed_papers; unresolved_issues_json; commit_sha |
| `audit-events.csv` | event_id; entity_type; entity_id; action; previous_status; new_status; evidence_refs_json; rationale; actor; actor_type; created_at; batch_id |

## Subject-partitioned ledger storage

`coverage.csv` and `syllabus-points.csv` retain only their table headers. Each table has an explicit `<table>-partitions.json` manifest. Version 2 entries declare a qualification and an ordered `paths` list. A subject with one file uses `<table>/<qualification>.csv`; a subject with multiple identity shards uses `<table>/<qualification>-001.csv`, `-002.csv`, and so on. Human Biology coverage currently has two shards. Empty English files remain explicitly declared; an empty file does not claim normalized English coverage.

Use `scripts/ledger_io.py` (`read_table(directory, name)`) for imports/audits; reading only a root CSV omits data. The reader supports the historical version 1 coverage manifest and current version 2 manifests. It rejects missing, undeclared or linked files, ambiguous/unordered paths, changed headers, duplicate identities, wrong-subject rows and populated roots. Other tables remain single files. The exporter validates both logical tables first, updates only the chosen subject and routes each coverage identity by the first eight bytes of its SHA-256 modulo the declared shard count. It never silently creates another shard.

The 30 September 2026 migration preserved all 356 rows and every field string; the canonical row hashes before and after match in `research/reviews/2026-09-30-coverage-partition-migration.json`. Grouping by subject changes physical row order only. This supports smaller subject updates and legible source review while retaining the existing GitHub request cap. It is not a D1 migration, content review or completion promotion. Future D1 import must read the logical table through the declared partitions.

The 6 October migration preserves all 1,283 coverage rows and 776 source-identity rows with matching canonical hashes in `research/reviews/2026-10-06-ledger-shard-migration.json`. Every field string is unchanged. Shards and subject files remain ordinary CSV text reviewed under the unchanged 195,000-byte request cap. A future file approaching that ceiling requires a new explicit lossless storage review; the sync planner does not transform files.

## Identity and references

Canonical paper natural key: qualification + sitting year + series + component + regional variant. Unknown variant is `unresolved`, not silently “standard”. Resits/versions with distinct covers receive an explicit edition discriminator if this key collides. A corrected PDF is a new document revision, with its own hash and a supersedes relation in the audit log. Duplicate links to the same hash do not increase document or paper counts.

Each source reference is `{documentId, pdfPages, printedPages?, region?, observation, provenanceKind}`. `provenanceKind` is `source-fact`, `editorial-inference` or `original-design`; these are not interchangeable. Source passages remain private working evidence; public notes use original explanations and bibliographic links.

Syllabus IDs include qualification, issue and reference. Internally assigned English skill IDs must be labelled editorial and anchored to an official AO/content location; never invent an official numbered specification statement. A chapter can cover multiple points and a point can require several explanations/examples. A separate completion gate checks these many-to-many relationships.

## Review and completion rules

Access statuses: `discovered`, `obtained`, `restricted`, `not-found`, `error`. Paper stages and the strict processed gate are in `EXTRACTION_WORKFLOW.md`. Task extraction is `indexed`, `extracted`, `source-checked`, `blocked`; review status is `pending`, `agent-reviewed`, `human-reviewed`, `rejected`. Template status is `provisional`, `validated`, `active`, `retired`. Runtime activity additionally requires an implemented generator and passing instance/rubric tests.

Every extracted leaf task must reference the paper's verified scheme and a current-scope mapping (or explicit exclusion). A task counted as complete must have its full analysis, not only an ID and marks. Option groups preserve all alternatives but validate permitted candidate paths. Unknown totals block percentages and completion. Checksum equality is a duplicate clue, never evidence of content review.

## Coverage UI rules

- Display raw links, canonical papers, obtained pairs and processed papers separately, per subject and sitting.
- Filter by stage, source, missing scheme, unreadable pages, unresolved syllabus mapping and provisional family.
- Link each count to its underlying rows and source evidence.
- Show notes drafted, source-checked and human-reviewed independently. No chapters are complete today.
- Keep syllabus coverage and exam-family coverage separate. A missing past-paper example does not remove a required syllabus point.
- Show the inventory cutoff, searched sites and outstanding gaps alongside every aggregate. Do not imply an exhaustive denominator while reconciliation is unfinished.

## Human Biology structural inventory — 5 October 2026

The obtained 4HB1/01 pair has a separate full visual inventory: 42 leaves / 90 marks. In papers.csv, `reconciled_marks` means original mark allocations reconcile, and `complete_page_audit` means all source pages have been seen structurally. Neither means every rubric, solution, mapping or template is complete. `extracted_leaf_tasks` is 24; stage remains indexed. The 18 index-only tasks have no invented knowledge, solution, rubric or mappings. The extraction overlay retains its narrower Q1–Q5 detailed page audit and false whole-detailed marks reconciliation. Legacy raw batches remain unchanged.

For index-only leaves, command labels are explicitly editorial shorthand rather than verified verbatim commands. Detailed Q1–Q5 command fields are source checked. The Q3 four-of-five cap, carrier concession, pedigree choices and unresolved DNA wording are private evidence, not active marking rules.

Q4–Q5 retain source apparatus topology and unimplemented drawing recognition; Q4 breathing explanation is any four of six, Q5 method any five of six. Same exercise pace applies within repeats of a condition, not across different intensities. The source enzyme graph has no numeric optimum. These private contracts are not validated runtime marking.

## English assessment-objective domain — 6 October 2026

Official AO identities are separate from numbered content statements. `research/assessment-objectives/4EB1-issue4.json` and `research/schemas/assessment-objectives.schema.json` define this domain; six definitions include five exam objectives and the optional AO6 endorsement. AO6's qualification weight is null, exported as an empty cell, never zero. Exam weights sum to 100%; this is an assessment allocation, not teaching completion.

- `assessment-objectives.csv`: objective_id; qualification; specification_document_id; specification_issue; specification_sha256; official_reference; reference_kind (assessment-objective); domain (reading/writing/spoken-language); scope (exam/optional-endorsement); short_original_summary; qualification_weight_percent (empty for optional endorsement); source_pdf_pages_json; source_printed_pages_json; statement_status; completion_status (incomplete); reviewer_type; reviewed_by; human_reviewed; updated_at.
- `objective-coverage.csv`: objective_coverage_id; objective_id; qualification; chapter_id; heading_id; explanation_status (partial); example_ids_json; teaching_review_path; teaching_reviewed_at; source_check_status; human_reviewed; blockers_json; updated_at.

The six objectives and 41 reviewed teaching relationships are projected by `scripts/export-assessment-objective-ledger.py`. It verifies the source issue/hash, objective scope, weight domains, source pages, complete relationship sets, original review dates and actual lesson references before writing either table. Unrelated qualifications are preserved. English numbered-source partitions remain empty. Original teaching reviews are historical evidence and remain unchanged; their then-pending ledger work is completed by this new overlay, not a retroactive change to their recorded review scope.

These are research tables, not an applied D1 migration. The public coverage view reads the same checked objective model and links every partial relationship to its lesson. Zero complete objectives, processed papers and active templates are inferred from this normalization. Full varied-text practice, whole-response calibration and optional endorsement teaching remain incomplete.
