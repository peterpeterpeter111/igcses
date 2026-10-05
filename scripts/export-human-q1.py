"""Normalize the bounded, visually reviewed 4HB1 Q1 subset only.

No full leaf inventory exists. Unknown expected/indexed counts stay blank, the
paper stays indexed, and an any-two-of-three rubric retains its distinct cap.
All evidence/table validation happens before any write. Raw manifests are read.
"""
import csv
import hashlib
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAPER = '4HB1-2024-May-01-standard'
OVERLAY = 'research/extractions/' + PAPER + '.json'
INVENTORY = 'research/syllabus/4HB1-selected-q1-demands.json'
EXPECTED = {
    '1.a.i': (1, [2]), '1.a.ii': (1, [2]),
    '1.b.i': (2, [3]), '1.b.ii': (2, [3]), '1.b.iii': (2, [4]),
    '1.c.i': (1, [5]), '1.c.ii': (2, [5]), '1.c.iii': (1, [5]),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def pages_valid(pages, maximum):
    return (isinstance(pages, list) and bool(pages)
            and all(type(p) is int and 1 <= p <= maximum for p in pages)
            and len(set(pages)) == len(pages))


def rubric_maximum(task):
    """Validate distinct point capacity; not a semantic response marker."""
    criteria, rule = task['criteria'], task['scoringRule']
    ids = [c['id'] for c in criteria]
    require(criteria and len(ids) == len(set(ids)) and all(c['marks'] == 1 and type(c['marks']) is int and c['rule'] for c in criteria), 'Invalid one-mark criteria')
    require(rule['eligibleCriterionIds'] == ids and rule['creditPerCriterion'] == 1, 'Rubric eligibility mismatch')
    require(type(rule['maximum']) is int and type(rule['selectionLimit']) is int and rule['maximum'] == rule['selectionLimit'] == task['originalMarks'], 'Rubric cap mismatch')
    require(rule['mode'] in ['all-distinct', 'any-distinct'], 'Unknown selection policy')
    require(rule['maximum'] <= len(criteria), 'Insufficient criteria capacity')
    if rule['mode'] == 'all-distinct':
        require(len(criteria) == rule['maximum'], 'All-distinct maximum mismatch')
    return rule['maximum']


def prepare(root=ROOT):
    root = Path(root)
    def read(path):
        return json.loads((root / path).read_text())
    m = read(OVERLAY)
    require(m['paperId'] == PAPER and m['qualification'] == '4HB1', 'Wrong bounded paper')
    require(m['paperStage'] == 'indexed' and m['fullyProcessed'] is False and m['humanReviewed'] is False and m['marksReconciled'] is False, 'No whole-paper or human promotion')
    require(m['wholePaperLeafCount'] is None and m['wholePaperMarks'] == 90 and m['reviewedSubsetMarksReconciled'] is True, 'Unknown whole inventory must remain unknown')
    require(m['detailedLeafTasks'] == 8 and m['detailedOriginalMarks'] == 12 and m['reviewedQuestionTotals'] == {'1': 12}, 'Wrong Q1 subset counts')
    require(m['rawManifestRef'] == 'research/batches/2026-09-08-cross-subject-lower-01.manifest.json'
            and m['coverReviewRef'] == 'research/reviews/2026-09-09-cover-review.json', 'Unexpected evidence authority')
    for field in ['rawManifest', 'coverReview']:
        require(hashlib.sha256((root / m[field + 'Ref']).read_bytes()).hexdigest() == m[field + 'Sha256'], 'Historical evidence bytes changed')
    batch = read(m['rawManifestRef'])
    raw = next(r for r in batch['records'] if r['paperId'] == PAPER)
    cover = next(r for r in read(m['coverReviewRef'])['records'] if r['paperId'] == PAPER)
    require(raw['processingStatus'] == 'indexed-only' and raw['extractedTaskCount'] == 0 and raw['fullyProcessed'] is False, 'Raw index must be preserved')
    identity = m['canonicalIdentity']
    require(identity == dict(year=2024, series=cover['canonicalSeries'], component=cover['observedComponent'], variant='unresolved', printedDate=cover['printedDate'], filenameDate='2024-05-15', legacyPaperIdPreserved=True), 'Cover/date identity mismatch')
    require(cover['maximumMarks'] == m['wholePaperMarks'] and cover['filenameDateConflict'] is True, 'Cover marks/date-conflict mismatch')
    docs = {d['type']: d for d in m['documents']}
    require(set(docs) == {'question-paper', 'mark-scheme'} and len(m['documents']) == 2, 'Expected two distinct documents')
    qp, ms = docs['question-paper'], docs['mark-scheme']
    for key, doc, expected_pages in [('questionPaper', qp, [2, 3, 4, 5]), ('markScheme', ms, [3, 4])]:
        source, audit = raw[key], m['pageAudit'][key]
        require(doc['id'] == PAPER + ':' + key and doc['sha256'] == source['sha256'] == cover[key + 'Sha256'] and doc['url'] == source['url'] and doc['pageCount'] == source['pageCount'], 'Document identity/hash metadata mismatch')
        require(audit['visuallyReviewedPages'] == expected_pages and audit['wholeDocumentReviewed'] is False, 'Bounded visual audit drift')
        require(pages_valid(expected_pages, doc['pageCount']), 'Invalid audit pages')
    spec = m['currentSpecification']
    inv = read(INVENTORY)
    source = next(s for s in read('research/sources.json') if s['id'] == '4HB1-spec')
    require(spec['documentId'] == inv['specificationDocumentId'] == source['id'] and spec['sha256'] == inv['specificationSha256'] == source['sha256'], 'Current specification identity mismatch')
    require(spec['issue'] == '2' and spec['reviewedPages'] == inv['reviewedPages'] == [20, 24] and spec['wholeHistoricalAmendmentReconciliation'] == 'pending', 'Specification scope drift')
    points = {p['id']: p for p in inv['points']}
    require(set(points) == {'4HB1:issue2:' + ref for ref in ['5.1', '5.5', '5.7', '10.1']} and len(inv['points']) == 4, 'Selected identity scope changed')
    tasks = m['tasks']
    require(len(tasks) == 8 and {t['questionPath'] for t in tasks} == set(EXPECTED) and len({t['taskId'] for t in tasks}) == 8, 'Missing/duplicate Q1 parts')
    require(sum(t['originalMarks'] for t in tasks) == 12, 'Subset mark sum mismatch')
    for t in tasks:
        marks, pages = EXPECTED[t['questionPath']]
        require(t['taskId'] == PAPER + '.Q' + t['questionPath'] and t['paperId'] == PAPER and t['recordKind'] == 'leaf', 'Task identity mismatch')
        require(type(t['originalMarks']) is int and t['originalMarks'] == marks and t['questionPaperPages'] == pages and t['markSchemePages'] == [4] and t['generalSchemePages'] == [3], 'Task marks/page drift')
        require(t['assessmentObjectives'] == [] and t['templateLinkStatus'] == 'candidate-only' and t['extractionStatus'] == 'source-checked' and t['humanReviewed'] is False and t['reviewerType'] == 'agent', 'Unreviewed AO/template/human promotion')
        require(t['requiredKnowledge'] and t['contextSummary'] and t['solutionStructure'] and t['blockers'], 'Missing detailed review content/gates')
        require(rubric_maximum(t) == marks and t['scoringRule']['sourceRef'] == dict(documentId=ms['id'], pdfPages=[4]), 'Rubric capacity/source mismatch')
        any_two = t['questionPath'] == '1.b.ii'
        require(t['scoringRule']['mode'] == ('any-distinct' if any_two else 'all-distinct') and t['markingMethod'] == ('capped-discrete-points' if any_two else 'discrete-points') and len(t['criteria']) == (3 if any_two else marks), 'Any-two policy drift')
        expected_stimulus = [3, 4] if t['questionPath'] == '1.b.iii' else pages
        require(t['stimulusRefs'] == [dict(documentId=qp['id'], pdfPages=expected_stimulus)] and t['stimulusTypes'], 'Missing shared diagram/method evidence')
        require(t['syllabusMappings'], 'Missing mapping evidence')
        for mapping in t['syllabusMappings']:
            p = points.get(mapping['pointId'])
            require(p and p['statementVerified'] is True and p['humanReviewed'] is False and p['teachingCoverage'] == 'not-started' and p['noteSectionIds'] == [], 'Identity must not invent teaching')
            require(mapping['currentApplicability'] == 'current-specification' and mapping['reviewStatus'] == 'agent-reviewed', 'Unreviewed mapping status')
            require(mapping['evidenceRefs'] == [dict(documentId=spec['documentId'], pdfPages=[p['pdfPage']]), dict(documentId=ms['id'], pdfPages=[4]), dict(documentId=qp['id'], pdfPages=pages)], 'Exact mapping source mismatch')
            if t['questionPath'] in ['1.c.i', '1.c.ii']:
                require(mapping['pointId'] == '4HB1:issue2:5.7' and mapping['kind'] == 'supporting', 'Do not claim full prescribed practical coverage')
    require(m['blockers'] and m['processingNotes'], 'Missing paper processing gaps')

    date = m['reviewDate']
    common = dict(reviewed_by=m['reviewer'], reviewer_type='agent', human_reviewed='false', batch_id='human-q1-' + date, updated_at=date)
    documents = []
    for key, doc in [('questionPaper', qp), ('markScheme', ms)]:
        pages = sorted(set(m['pageAudit'][key]['visuallyReviewedPages'] + cover['reviewedPages'][key]))
        documents.append(dict(document_id=doc['id'], qualification='4HB1', document_type=doc['type'], canonical_url=doc['url'], title='4HB1/01 Summer 2024 ' + doc['type'], publisher='Pearson', year=2024, series=identity['series'], component='01', variant='unresolved', printed_exam_date=identity['printedDate'] if key == 'questionPaper' else '', filename_date=identity['filenameDate'] if key == 'questionPaper' else '', sha256=doc['sha256'], page_count=doc['pageCount'], access_status='obtained', local_evidence_path=OVERLAY, reviewed_pages_json=compact([dict(page=p, mode='visual', reviewer=m['reviewer'] if p != 1 else 'Codex cover visual review', date=date if p != 1 else '2026-09-09') for p in pages]), identity_status='agent-reviewed', identity_notes='Original legacy ID retained; printed date differs from filename. Variant remains unresolved. Only Q1 matched to scheme.', batch_id=common['batch_id'], updated_at=date))
    papers = [dict(paper_id=PAPER, qualification='4HB1', year=2024, series=identity['series'], component='01', variant='unresolved', qp_document_id=qp['id'], ms_document_id=ms['id'], insert_document_ids_json='[]', examiner_report_ids_json='[]', report_status=m['examinerReportStatus'], target_specification_id=spec['documentId'], applicability_status='partial-current-scope-review', stage='indexed', last_successful_stage='indexed', expected_leaf_tasks='', indexed_leaf_tasks='', extracted_leaf_tasks=8, assessed_marks=90, all_alternatives_marks='', option_rules_json='[]', reconciled_marks='false', scheme_match_status='matched-Q1-only', complete_page_audit='false', template_links_complete='false', blocking_issues_json=compact(m['blockers']), reviewed_at=date, **common)]
    task_rows, mappings = [], []
    for t in tasks:
        task_rows.append(dict(task_id=t['taskId'], paper_id=PAPER, question_path=t['questionPath'], record_kind='leaf', qp_pages_json=compact(t['questionPaperPages']), stimulus_refs_json=compact(t['stimulusRefs']), scheme_pages_json=compact(t['markSchemePages']), command_word=t['commandWord'], original_marks=t['originalMarks'], assessment_objectives_json='[]', required_knowledge='; '.join(t['requiredKnowledge']), context_summary=t['contextSummary'], stimulus_types_json=compact(t['stimulusTypes']), solution_structure_json=compact(t['solutionStructure']), marking_method=t['markingMethod'], rubric_ref=OVERLAY + '#' + t['taskId'], acceptable_alternatives_json=compact(t['acceptableAlternatives']), dependencies_json=compact(t['dependencies']), common_errors_json=compact(t['commonErrors']), report_refs_json='[]', extraction_status='source-checked', mapping_status='agent-reviewed-partial-current-scope', review_status='agent-reviewed', blocker='; '.join(t['blockers']), **common))
        for mapping in t['syllabusMappings']:
            mappings.append(dict(mapping_id=t['taskId'] + ':' + mapping['pointId'], task_id=t['taskId'], point_id=mapping['pointId'], mapping_kind=mapping['kind'], current_applicability=mapping['currentApplicability'], evidence_refs_json=compact(mapping['evidenceRefs']), rationale=mapping['rationale'], review_status='agent-reviewed', reviewed_by=m['reviewer'], reviewer_type='agent', updated_at=date))
    outputs = {}
    for name, key, incoming in [('documents', 'document_id', documents), ('papers', 'paper_id', papers), ('tasks', 'task_id', task_rows), ('task-mappings', 'mapping_id', mappings)]:
        path = root / 'research/ledger/v1' / (name + '.csv')
        with path.open(newline='') as stream:
            reader = csv.DictReader(stream)
            fields, rows = reader.fieldnames, list(reader)
        require(fields and len({r[key] for r in rows}) == len(rows), 'Duplicate existing table IDs')
        saved = {r[key]: r for r in rows}
        owned = {r[key] for r in rows if r.get('paper_id') == PAPER or r.get('task_id', '').startswith(PAPER + '.Q') or r.get('document_id', '').startswith(PAPER + ':')}
        require(owned <= {r[key] for r in incoming}, 'Refusing stale owned rows')
        for record in incoming:
            require(not set(record) - set(fields), 'Unknown output columns')
            saved[record[key]] = {field: record.get(field, '') for field in fields}
        stream = io.StringIO(newline='')
        writer = csv.DictWriter(stream, fields, lineterminator='\n')
        writer.writeheader()
        writer.writerows(saved.values())
        outputs[path] = stream.getvalue()
    return outputs


def export(root=ROOT):
    outputs = prepare(root)
    for path, content in outputs.items():
        path.write_text(content)
    return dict(detailedTasks=8, detailedMarks=12, fullyProcessedPapers=0, activeTemplates=0)


if __name__ == '__main__':
    print(compact(export()))
