# Text preparation and source references — 28 September 2026

Continues 2133275. This phase is mechanical preparation and evidence reconciliation only.

## Mathematics B text preparation
Added scripts/preflight-paper-text.py. It reads an explicit discovery overlay offline, verifies PDF hashes and page counts, saves source text only under ignored work/, and creates a new metadata report with exclusive writes. It never downloads, overwrites source evidence, assigns task IDs, maps syllabus points or changes paper stages.

Ran it against the newly obtained 4MB1 Summer 2024 Paper 01 candidate using bundled pypdf 6.10.0 (recorded in the report, separate from the old five-pair indexer's pinned version). All 24 question-paper and 26 scheme pages returned text without exceptions or the limited sparse/replacement/null-character warnings. This does not validate mathematical notation, reading order, diagrams or tables. Those require visual review; identity/date discrepancy and pairing still require Astra.

Saved research/reviews/2026-09-28-maths-text-preflight.json. Actual page text remains in work/discovery/2026-09-28-mathematics-b/text-preflight, excluded from source/public output. Checked all 50 sequential page identities and reported character counts against the saved text; a repeat run correctly refused to overwrite the report and preserved its hash. No task index or question extraction is claimed.

## Source document ledger
Appended six specification document rows by direct transcription from research/sources.json. Exact qualification, type, URL, title, publisher, issue, hash, page count and access state retained. The two existing Physics document rows were compared before/after and preserved exactly. New rows are explicitly metadata-only with no reviewed pages. No paper dates/variants, publication codes or batch identities were invented; existing identity/teaching reviews remain separate overlays.

Enhanced scripts/audit-evidence.py to compare these normalized source fields and reject metadata-only entries that claim page review. Added a cross-file invariant test. The latest report, research/reviews/2026-09-28-source-ledger-audit.json, has zero structural errors, 21 matching local evidence documents and four remaining normalization gaps:
- Mathematics B candidate exists only in its discovery overlay, pending review.
- English Q5 template source task exists only in the pilot JSON.
- Normalized batch table is still empty; historical batch manifests remain authoritative.
- Normalized links table is still empty; original 390-link ledger is unchanged.

The CSV contract remains an unapplied research import; no D1 migration or hosted database write occurred. Removing reference gaps does not complete teaching, processing or templates. Prior reports remain unchanged.

## Validation and current truth
85 application tests, typecheck, lint and 13 research checks pass. Last product build/public scan/browser checks remain from 2133275; this phase changes only research, scripts, tests and documentation. No need to rebuild unchanged product output.

13 partial notes / 197 sections, 248 reviewed parent identities / 612 partial requirements / 332 partial teaching links. Seven downloaded pairs include the new unreviewed Mathematics B candidate. Physics has 51 detailed records / 110 marks. Zero complete chapters/points, fully processed papers or active templates. Three provisional families, two experimental generators and two bounded offline markers.

Latest checked allowances: 60% five-hour / 79% weekly remaining. No reset used and no assertion that usage is exhausted. Keep the routine-work boundary: Astra handles identity review, exact extraction/mapping, academic calibration and activation. AI/provider work remains last. No Sites version or deployed URL exists.

GitHub blocker remains: automatic approval review rejected the earlier oversized (>200000-byte) tree upload. The specific safe-upload proposal remains unanswered. Do not retry or bypass it; all work is saved locally.

## Resume
Read this checkpoint and CONTINUE_ASTRA.md from the latest local commit. Preserve history/UI/raw ledgers. The Maths PDFs and page text are ready for visual identity review and later indexing, not processed content. Continue the Astra curriculum/calibration queue when the requested model and allowance are available. Treat old provider and old totals in historical handoffs as superseded. No reset or automatic template activation.
