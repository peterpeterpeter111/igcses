"""Export bounded Maths details; permit extracted only with full page evidence.

All references and all four output tables are checked before writing any table.
The original discovery, text index and cover review remain immutable evidence.
"""
import csv
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OVERLAY = 'research/extractions/4MB1-2024-summer-01.json'


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def prepare(root=ROOT):
    def read(name):
        return json.loads((root / name).read_text())

    m = read(OVERLAY)
    paper = m['paperId']
    require(paper == '4MB1-2024-summer-01-candidate' and m['qualification'] == '4MB1', 'Wrong bounded paper')
    require(m['paperStage'] in ['indexed', 'extracted'] and m['fullyProcessed'] is False and m['humanReviewed'] is False, 'Processed/human promotion not permitted')
    index, cover = read(m['indexRef']), read(m['coverReviewRef'])
    require(index['paperId'] == paper and cover['candidateId'] == paper, 'Index/cover identity mismatch')
    candidate = next(r for r in read('research/discovery/2026-09-28-mathematics-b.json')['records'] if r['id'] == paper)
    docs = {d['type']: d for d in m['documents']}
    require(len(docs) == len(m['documents']) == 2, 'Expected two distinct documents')
    qp, ms = docs['question-paper'], docs['mark-scheme']
    require(qp['id'] != ms['id'], 'Duplicate document identity')
    for key, doc in [('questionPaper', qp), ('markScheme', ms)]:
        source = candidate[key]
        require(doc['sha256'] == index[key + 'Sha256'] == cover[key + 'Sha256'] == source['sha256'], 'Source hash mismatch')
        require(doc['pageCount'] == source['pageCount'] and doc['url'] == source['url'], 'Source metadata mismatch')
        audit = m['pageAudit'][key]
        pages = audit['visuallyReviewedPages']
        require(pages and len(pages) == len(set(pages)) and all(type(p) is int and 1 <= p <= doc['pageCount'] for p in pages), 'Invalid reviewed pages')
        require(type(audit['wholeDocumentReviewed']) is bool, 'Invalid page audit flag')
        if audit['wholeDocumentReviewed']:
            require(sorted(pages) == list(range(1, doc['pageCount'] + 1)), 'Whole-page audit has missing pages')
    identity = m['canonicalIdentity']
    for key in ['year', 'series', 'printedDate', 'filenameDate', 'paperLog', 'schemePublicationCode']:
        require(identity[key] == cover[key], 'Cover identity mismatch: ' + key)
    require(identity['component'] == cover['observedComponent'] and identity['variant'] == 'unresolved', 'Do not invent a variant')
    indexed = {t['taskId']: t for t in index['tasks']}
    require(len(indexed) == len(index['tasks']) == index['indexedLeafCount'] == m['wholePaperLeafCount'], 'Index count mismatch')
    require(sum(t['originalMarks'] for t in index['tasks']) == index['indexedOriginalMarks'] == m['wholePaperMarks'] == cover['printedTotalMarks'], 'Index mark mismatch')
    tasks = m['tasks']
    require(len({t['taskId'] for t in tasks}) == len(tasks) == m['detailedLeafTasks'] <= len(indexed), 'Invalid detailed coverage')
    require(sum(t['originalMarks'] for t in tasks) == m['detailedOriginalMarks'] and m['marksReconciled'] is True, 'Detailed mark mismatch')
    totals = {}
    points = {}
    for file in (root / 'research/syllabus').glob('4MB1-*.json'):
        inventory = json.loads(file.read_text())
        require(inventory['specificationSha256'] == m['currentSpecification']['sha256'], 'Specification hash mismatch')
        points.update({p['id']: p for p in inventory['points']})
    for t in tasks:
        item = indexed[t['taskId']]
        require(t['paperId'] == paper and t['recordKind'] == 'leaf' and t['extractionStatus'] == 'source-checked' and t['humanReviewed'] is False, 'Invalid task review status')
        for field in ['questionPath', 'originalMarks', 'questionPaperPages', 'markSchemePages']:
            require(t[field] == item[field], 'Index task mismatch: ' + field)
        require(t['assessmentObjectives'] == [] and t['templateLinkStatus'] == 'candidate-only', 'No inferred AO or template activation')
        require(sum(c['marks'] for c in t['criteria']) == t['originalMarks'], 'Criteria maximum mismatch')
        earlier = set()
        for criterion in t['criteria']:
            require(criterion['id'] not in earlier and set(criterion.get('dependsOn', [])) <= earlier, 'Duplicate criterion or invalid/cyclic dependency')
            earlier.add(criterion['id'])
        for key, field in [('questionPaper', 'questionPaperPages'), ('markScheme', 'markSchemePages')]:
            require(set(t[field]) <= set(m['pageAudit'][key]['visuallyReviewedPages']), 'Task lacks visual page evidence')
        expected_stimulus = sorted(set(item['stimulusPages'] + t['questionPaperPages']))
        actual_stimulus = set()
        for stimulus in t['stimulusRefs']:
            require(stimulus['documentId'] == qp['id'] and stimulus['pdfPages'] and set(stimulus['pdfPages']) <= set(m['pageAudit']['questionPaper']['visuallyReviewedPages']), 'Invalid visual stimulus reference')
            actual_stimulus.update(stimulus['pdfPages'])
        require(t['stimulusTypes'] and sorted(actual_stimulus) == expected_stimulus, 'Missing exact stimulus reference')
        require(set(t['generalSchemePages']) <= set(m['pageAudit']['markScheme']['visuallyReviewedPages']), 'General scheme pages not reviewed')
        require(t['syllabusMappings'], 'Missing reviewed mapping')
        for mapping in t['syllabusMappings']:
            point = points[mapping['pointId']]
            require(mapping['currentApplicability'] in ['current-specification', 'unresolved-specification-scope'], 'Unknown scope status')
            scope = t.get('scopeReview', {})
            if scope.get('status') == 'unresolved' and scope.get('pointId') == mapping['pointId']:
                require(mapping['currentApplicability'] == 'unresolved-specification-scope' and scope.get('resolution') is None, 'Unresolved scope cannot be promoted')
                require(any(d['id'] == scope['discrepancyId'] for d in m.get('sourceDiscrepancies', [])), 'Missing scope discrepancy')
            if mapping['currentApplicability'] == 'unresolved-specification-scope':
                require(scope.get('status') == 'unresolved' and scope.get('pointId') == mapping['pointId'] and t['blockers'], 'Missing unresolved-scope review')
            require({'documentId': m['currentSpecification']['documentId'], 'pdfPages': [point['pdfPage']]} in mapping['evidenceRefs'], 'Missing exact specification page')
            require({'documentId': ms['id'], 'pdfPages': t['markSchemePages']} in mapping['evidenceRefs'], 'Missing exact scheme page')
        q = t['questionPath'].split('.')[0]
        totals[q] = totals.get(q, 0) + t['originalMarks']
    require(totals == m['reviewedQuestionTotals'], 'Reviewed question totals mismatch')
    complete_pages = all(m['pageAudit'][key]['wholeDocumentReviewed'] for key in ['questionPaper', 'markScheme'])
    if m['paperStage'] == 'extracted':
        require(complete_pages and len(tasks) == len(indexed) and m['detailedOriginalMarks'] == m['wholePaperMarks'], 'Extracted stage requires every task, mark and page')
        audit = read(m['wholeDocumentAuditRef'])
        require(audit['paperId'] == paper and audit['pageAuditComplete'] is True and audit['tasksReconciled'] is True and audit['fullyProcessed'] is False and audit['humanReviewed'] is False, 'Invalid whole-document evidence')
        require(set(audit['reconciledTaskIds']) == set(indexed) and len(audit['reconciledTaskIds']) == len(indexed), 'Whole-audit task mismatch')
        require(set(audit['sourceDiscrepancyIds']) == {d['id'] for d in m['sourceDiscrepancies']}, 'Whole-audit discrepancy drift')
        audit_docs = {d['documentId']: d for d in audit['documents']}
        require(len(audit_docs) == len(audit['documents']) == 2, 'Whole-audit document mismatch')
        for doc in [qp, ms]:
            a = audit_docs[doc['id']]
            require(a['sha256'] == doc['sha256'] and a['pageCount'] == doc['pageCount'] and a['visuallyReviewedPages'] == list(range(1, doc['pageCount'] + 1)), 'Whole-audit hash/page mismatch')

    date = m['reviewDate']
    common = dict(reviewed_by=m['reviewer'], reviewer_type='agent', human_reviewed='false', batch_id='maths-detailed-' + date, updated_at=date)
    documents = []
    for key, doc in [('questionPaper', qp), ('markScheme', ms)]:
        pages = sorted(set(m['pageAudit'][key]['visuallyReviewedPages'] + cover[key + 'VisualPages']))
        documents.append(dict(document_id=doc['id'], qualification='4MB1', document_type=doc['type'], canonical_url=doc['url'], title='4MB1/01 Summer 2024 ' + doc['type'], publisher='Pearson', year=identity['year'], series=identity['series'], component=identity['component'], variant='unresolved', printed_exam_date=identity['printedDate'] if key == 'questionPaper' else '', filename_date=identity['filenameDate'] if key == 'questionPaper' else '', publication_code=identity['paperLog'] if key == 'questionPaper' else identity['schemePublicationCode'], sha256=doc['sha256'], page_count=doc['pageCount'], access_status='obtained', local_evidence_path=OVERLAY, reviewed_pages_json=compact([dict(page=p, mode='visual-and-text', reviewer=m['reviewer'], date=m['pageAudit'][key].get('pageReviewDates', {}).get(str(p), date) if p in m['pageAudit'][key]['visuallyReviewedPages'] else cover['reviewedAt']) for p in pages]), identity_status='agent-reviewed', identity_notes='Cover identity matched; candidate ID and unresolved variant retained. ' + cover['dateDiscrepancy'], batch_id=common['batch_id'], updated_at=date))
    require(index['allCompulsory'] is True and cover['allQuestionsRequired'] is True, 'Option rule not established')
    papers = [dict(paper_id=paper, qualification='4MB1', year=identity['year'], series=identity['series'], component=identity['component'], variant='unresolved', qp_document_id=qp['id'], ms_document_id=ms['id'], insert_document_ids_json='[]', examiner_report_ids_json='[]', report_status=m['examinerReportStatus'], target_specification_id=m['currentSpecification']['documentId'], applicability_status='partial-current-scope-review', stage=m['paperStage'], last_successful_stage=m['paperStage'], expected_leaf_tasks=len(indexed), indexed_leaf_tasks=len(indexed), extracted_leaf_tasks=len(tasks), assessed_marks=m['wholePaperMarks'], all_alternatives_marks=m['wholePaperMarks'], option_rules_json=compact({'mode': 'all-compulsory', 'sourcePages': [1]}), reconciled_marks='true', scheme_match_status='matched-all-detailed-with-source-issues' if m['paperStage'] == 'extracted' else 'matched-reviewed-subset', complete_page_audit=str(complete_pages).lower(), template_links_complete='false', blocking_issues_json=compact(m['blockers']), reviewed_at=date, **common)]
    task_rows, mappings = [], []
    for t in tasks:
        task_common = {**common, 'reviewed_by': t['reviewer'], 'reviewer_type': t['reviewerType'], 'updated_at': t['reviewDate']}
        task_rows.append(dict(task_id=t['taskId'], paper_id=paper, question_path=t['questionPath'], record_kind='leaf', qp_pages_json=compact(t['questionPaperPages']), stimulus_refs_json=compact(t['stimulusRefs']), scheme_pages_json=compact(t['markSchemePages']), command_word=t['commandWord'], original_marks=t['originalMarks'], assessment_objectives_json='[]', required_knowledge='; '.join(t['requiredKnowledge']), context_summary=t['contextSummary'], stimulus_types_json=compact(t['stimulusTypes']), solution_structure_json=compact(t['solutionStructure']), marking_method=t['markingMethod'], rubric_ref=OVERLAY + '#' + t['taskId'], acceptable_alternatives_json=compact(t['acceptableAlternatives']), dependencies_json=compact(t['dependencies']), common_errors_json=compact(t['commonErrors']), report_refs_json='[]', extraction_status=t['extractionStatus'], mapping_status='agent-reviewed', review_status='agent-reviewed', blocker='; '.join(t['blockers']), **task_common))
        for mapping in t['syllabusMappings']:
            mappings.append(dict(mapping_id=t['taskId'] + ':' + mapping['pointId'], task_id=t['taskId'], point_id=mapping['pointId'], mapping_kind=mapping['kind'], current_applicability=mapping['currentApplicability'], evidence_refs_json=compact(mapping['evidenceRefs']), rationale=mapping['rationale'], review_status='agent-reviewed', reviewed_by=t['reviewer'], reviewer_type=t['reviewerType'], updated_at=t['reviewDate']))
    outputs = {}
    for name, key, records in [('documents', 'document_id', documents), ('papers', 'paper_id', papers), ('tasks', 'task_id', task_rows), ('task-mappings', 'mapping_id', mappings)]:
        path = root / 'research/ledger/v1' / (name + '.csv')
        with path.open() as f:
            reader = csv.DictReader(f)
            fields, rows = reader.fieldnames, list(reader)
        require(fields and len({r[key] for r in rows}) == len(rows), 'Invalid existing table: ' + name)
        saved = {r[key]: r for r in rows}
        incoming = {r[key] for r in records}
        owned = {r[key] for r in rows if r.get('paper_id') == paper or r.get('task_id', '').startswith(paper + '.') or r.get('document_id', '').startswith(paper + '-')}
        require(owned <= incoming, 'Refusing to leave stale detailed rows: ' + name)
        for record in records:
            require(not set(record) - set(fields), 'Unknown CSV column')
            saved[record[key]] = {field: record.get(field, '') for field in fields}
        stream = io.StringIO(newline='')
        writer = csv.DictWriter(stream, fields, lineterminator='\n')
        writer.writeheader()
        writer.writerows(saved.values())
        outputs[path] = stream.getvalue()
    return outputs


if __name__ == '__main__':
    outputs = prepare()
    for path, content in outputs.items():
        path.write_text(content)
    print('Maths detailed records exported at saved stage; no processed-paper or template activation.')
