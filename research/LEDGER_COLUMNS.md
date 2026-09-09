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
