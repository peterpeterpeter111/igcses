# Bounded batch result — 9 September 2026 offline extraction check

Continued from 32a3ae9, preserving the indexer introduced at 4c2ac4c and the original five-pair scope. The batch ID retains its planning date. Earlier download and recovery results remain in Git history.

| Subject | QP pages | Scheme pages | Result |
| --- | ---: | ---: | --- |
| 4HB1 Human Biology | 24 | 12 | indexed-only; cached Pearson files |
| 4BI1 Biology | 32 | 24 | indexed-only; alternate Pearson files |
| 4CH1 Chemistry | 24 | 18 | indexed-only; alternate Pearson files |
| 4PH1 Physics | 36 | 17 | indexed-only; alternate Pearson files |
| 4EB1 English Language B | 36 | 21 | indexed-only; cached Pearson files |

**Five candidate pairs obtained and mechanically indexed; ten PDFs; 244 pages; zero fully processed.** Six alternative document URLs were discovered for three existing pairs. No additional pairs were added.

## Recovery and verification

PMT's PDF host still refused connections; its subject indexes remained accessible. Pearson course-material pages returned dynamic placeholders through the web reader without usable PDF links. The three Save My Exams IGCSE subject indexes supplied direct public Pearson URLs for the selected standard Paper 1 papers and schemes. All six alternative PDFs downloaded. Their URLs and discovery dates are saved. Original PMT URLs, earlier failures and retry failures remain recorded; historical failures do not mean recovered pairs remain blocked.

Verification passed for PDF signatures, SHA-256 hashes, page counts, consecutive one-based page indexes, saved index/manifest agreement and nonempty text extracts. All ten hashes are distinct. Previously obtained hashes and the five paper IDs are unchanged. These checks do not establish identity, content completeness or correct scheme pairing.

The subsequent offline pass installed the missing fontTools dependency (4.60.2) in the existing temporary environment and re-extracted only the ten cached PDFs. No paper downloads or new discovery occurred. All ten text hashes and character counts are identical to the prior extraction. Missing-font warnings no longer occur; this removes a dependency warning without demonstrating improved content coverage. Acquisition dates and historical download failures are preserved. The remaining urllib3/LibreSSL compatibility warning concerns network support; the offline pass made no network requests.

## Saved files

- `2026-09-08-cross-subject-lower-01.manifest.json`: current execution evidence, page indexes, original/alternate URLs and error history.
- `2026-09-08-cross-subject-lower-01.alternate-sources.json`: six Pearson URLs discovered through three Save My Exams indexes.
- `2026-09-08-cross-subject-lower-01.validation.json`: local verification of all ten PDFs, before/after text hashes and extraction environment versions.
- `scripts/index-cross-subject-batch.py`: bounded fallback downloads, cache reuse, preserved acquisition dates and prior failures; `--offline` prevents network requests, and dependency warnings reflect the actual environment.
- `scripts/indexer-requirements.txt`: pinned direct dependencies for reproducing this indexer environment.
- Raw PDFs, text extracts, page indexes, partial records and generated manifest: ignored `work/batches/2026-09-08-cross-subject-lower-01/`. Raw papers are not committed.

The original plan remains historical. The legacy global paper ledger remains unchanged; this manifest is the execution overlay for these five pairs.

## Limitations and stop point

- Every record retains `processingStatus: indexed-only`, `fullyProcessed: false`, zero extracted tasks and no reviewed pages. Covers, dates, component/variant identities and exact scheme matching remain candidates requiring later review, including alternate copies.
- Missing-font warnings are resolved. Candidate labels and page-warning heuristics still cannot certify complete text, diagrams, tables or marking grids.
- Mathematics B remains outside this batch because no pair was catalogued.
- No syllabus mapping, template activation, marking design, AI generation or website/deployment work occurred. The deterministic runner made no model calls.
- The five-pair mechanical batch is complete. Stop here for the later authorised review phase. Do not retry successful pairs because their manifest retains historical failures.

The Astra handoff/checkpoint files and future activation message were not edited. AI integration remains deferred.
