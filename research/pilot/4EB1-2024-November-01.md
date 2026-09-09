# One-paper extraction pilot

Scope: **Pearson International GCSE English Language B, November 2024, 4EB1/01**. One question paper, matching official mark scheme and optional examiner report obtained. This is a paper-wide index plus a detailed Q5 sample, not a claim that the whole paper is fully processed.

- [Official paper](https://qualifications.pearson.com/content/dam/pdf/International-GCSE/English-Language-B/2016/Exam-materials/4eb1-01-que-20241106.pdf): 36 PDF pages, including the source booklet.
- [Official scheme](https://qualifications.pearson.com/content/dam/pdf/International-GCSE/English-Language-B/2016/Exam-materials/4eb1-01-rms-20250123.pdf): 20 pages; November 2024, component 01 confirmed on cover.
- [Official examiner report](https://qualifications.pearson.com/content/dam/pdf/International-GCSE/English-Language-B/2016/Exam-materials/4eb1-01-pef-20250123.pdf): 16 pages; Q5 observation checked on PDF page 6.

Hashes, reviewed pages, identity checks and task records are in the adjacent JSON file. The paper cover says 5 November; the filename encodes 6 November. Both are retained, with the cover used as the exam date. Automatic extraction loses much of the scheme's text, so pages 5–20 were inspected visually.

## Paper-wide index

| Task | Section | Available marks | AO allocation | Scheme PDF pages | Analysis status |
| --- | --- | ---: | --- | --- | --- |
| 1 | A | 1 | AO1: 1 | 5 | Indexed |
| 2 | A | 1 | AO1: 1 | 5 | Indexed |
| 3 | A | 10 | AO2: 10 | 6–7 | Indexed |
| 4 | A | 1 | AO1: 1 | 8 | Indexed |
| 5 | A | 2 | AO1: 2 | 8 | Detailed sample, source-checked by agent |
| 6 | A | 10 | AO2: 10 | 9–11 | Indexed |
| 7 | A | 15 | AO3: 15 | 12–13 | Indexed |
| 8 | B | 30 | AO1: 10; AO4: 12; AO5: 8 | 14–17 | Indexed |
| 9 | C | 30 | AO4: 20; AO5: 10 | 18–20 | Indexed |
| 10 | C | 30 | AO4: 20; AO5: 10 | 18–20 | Indexed |
| 11 | C | 30 | AO4: 20; AO5: 10 | 18–20 | Indexed |

All A, one B and one of three C options: 40 + 30 + 30 = **100 marks** and **nine answered tasks**. There are 11 printed tasks and 160 marks across all printed alternatives. Q5 has two answer slots, not two separately numbered subparts. These allocations were also checked against the current Issue 4 specification, PDF page 18; this does not complete the historical amendment audit.

## Detailed extraction: Q5

| Field | Extracted finding |
| --- | --- |
| Evidence | Question: PDF p6. Text: PDF p33, named subsection at lines 30–39. Scheme: p8. Examiner report: p6. |
| Task | Identify two sources of unhappiness from the specified text section. |
| Assessment | AO1; two marks, discrete points rather than a levels grid. |
| Solution structure | Locate the requested section → distinguish causes from remedies → select two distinct supported items. |
| Accepted examples | Smoking; social media. These are examples, not the complete official list. |
| Sourced failure | Reversing the meaning by giving the action that removes a cause. The examiner report identifies this problem. |
| Current mapping | Editorial skill `4EB1.issue4.AO1.retrieve-explicit-information`, anchored to official AO1 in specification PDF p10 and Q5 allocation on p18. |
| Proposed family | `4EB1.retrieve-two-causes@0.1.0`. Provisional; no runtime generator or validated custom allocation yet. |

## Original design illustration

The following newly written passage illustrates the proposed family. It is a manually authored design example, **not live AI output or a bank of fixed quiz questions**.

> At Saturday's repair club, volunteers hoped to finish every bicycle before lunch. Several repairs were delayed because the tools had been left in unlabelled boxes. Missing delivery labels caused further delays: nobody could tell which replacement parts belonged to each bicycle. Clear labels on the boxes helped volunteers find their tools quickly. Meanwhile, a new checklist helped them match each delivery to its owner. The bright posters at the entrance attracted more visitors, but they did not affect the repairs. By the afternoon, the team had completed the remaining work.

**Question:** Identify two things that caused delays at the repair club. **[2 marks]**

Design-review solution: unlabelled tool boxes and missing delivery labels. One credit per distinct supported cause, up to two; equivalent meanings accepted. The new labels and checklist are remedies. The public quiz must never receive this solution or its evidence mapping before the session is completed. This research file is not imported by the frontend.

## What this proves and does not prove

The download/identity/page-review workflow works for this pair, and option-aware arithmetic avoids a false 160-mark paper total. The data contract captures the two-mark retrieval structure without forcing extended English tasks into a six-mark rubric.

It does not establish whole-paper processing, full syllabus coverage, calibrated AI marking or a working generator. Ten detailed task analyses, complete family mappings, page audit sign-off and whole-paper current-scope reconciliation remain. Human-reviewed records: zero. Fully processed papers: zero.
