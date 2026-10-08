"""Compose source-checked May English records without changing historical batches."""
import json
from pathlib import Path
from ledger_io import read_table, table_outputs
from english_paper_io import load_paper, public_summary, PAPER, EVIDENCE, SUMMARY


def encode(value):
    return json.dumps(value, separators=(',', ':'), ensure_ascii=False)


def prepare(root):
    root = Path(root)
    m = load_paper(root)
    processing = m.get('_processingReview')
    directory = root / 'research/ledger/v1'
    common = dict(reviewed_by=m['reviewer'], reviewer_type='agent', human_reviewed='false', batch_id=m['batchId'], updated_at=m['reviewDate'])
    docs = []
    for d in m['documents']:
        pages = [dict(page=p, mode='visual-and-text' if p in d['textPages'] and p in d['visualPages'] else 'visual' if p in d['visualPages'] else 'text', reviewer=m['reviewer'], date=m['reviewDate']) for p in sorted(set(d['visualPages'] + d['textPages']))]
        docs.append(dict(document_id=d['id'], qualification='4EB1', document_type=d['type'], canonical_url=d['url'],
                         title=PAPER + ' ' + d['type'], publisher='Pearson', year=2024, series=m['publisherSeries'], component='01', variant='standard',
                         printed_exam_date=m['printedExamDate'] if d['type'] == 'question-paper' else '',
                         filename_date=m['filenameDate'] if d['type'] == 'question-paper' else '2024-08-22',
                         publication_code='P73897A' if d['type'] == 'question-paper' else '4EB1_01_2406_MS',
                         sha256=d['sha256'], page_count=d['pageCount'], access_status='obtained', local_evidence_path=str(EVIDENCE),
                         reviewed_pages_json=encode(pages), identity_status='agent-reviewed', identity_notes=' '.join(m['identityNotes']),
                         batch_id=m['batchId'], updated_at=m['reviewDate']))
    paper = dict(paper_id=PAPER, qualification='4EB1', year=2024, series=m['publisherSeries'], component='01', variant='standard',
                 qp_document_id=m['documents'][0]['id'], ms_document_id=m['documents'][1]['id'], insert_document_ids_json='[]',
                 examiner_report_ids_json='[]', report_status=m['reportStatus'], target_specification_id='4EB1-spec',
                 applicability_status='provisional-current-scope', stage='indexed', last_successful_stage='indexed',
                 expected_leaf_tasks=11, indexed_leaf_tasks=11, extracted_leaf_tasks=11, assessed_marks=100, all_alternatives_marks=160,
                 option_rules_json=encode(m['optionRules']), reconciled_marks='true', scheme_match_status='verified',
                 complete_page_audit='false', template_links_complete='false', blocking_issues_json=encode(m['limitations']), reviewed_at=m['reviewDate'], **common)
    tasks = []
    for t in m['tasks']:
        tasks.append(dict(task_id=t['id'], paper_id=PAPER, question_path=str(t['number']), record_kind='leaf', section=t['section'], option_group=t['section'],
                          qp_pages_json=encode(t['qpPages']), stimulus_refs_json=encode([dict(documentId=m['documents'][0]['id'], pdfPages=t['stimulusPages'], **({'sourceLines': t['sourceLines']} if t['sourceLines'] else {}))] if t['stimulusPages'] else []),
                          scheme_pages_json=encode(t['msPages']), command_word=t['commandWord'], original_marks=t['marks'], assessment_objectives_json=encode(t['aoMarks']),
                          required_knowledge=t['requiredKnowledge'], context_summary=t['contextSummary'], stimulus_types_json=encode(t['stimulusTypes']), solution_structure_json=encode(t['solutionStructure']),
                          marking_method=t['markingMethod'], rubric_ref=str(EVIDENCE) + '#' + t['id'], acceptable_alternatives_json=encode(t['acceptableGroups']),
                          dependencies_json=encode(t['sourceCreditRules']), common_errors_json=encode(t['editorialCommonErrors']), report_refs_json='[]',
                          extraction_status='source-checked', mapping_status='official-AO-only', review_status='agent-partial-review', blocker=' '.join(t['calibrationBlockers']), **common))
    if processing:
        from english_processing import REF
        for doc, reviewed in zip(docs, processing['documents']):
            doc['reviewed_pages_json'] = encode(reviewed['pages'])
            doc['local_evidence_path'] = REF
        report = processing['examinerReport']
        docs.append(dict(document_id=report['documentId'], qualification='4EB1', document_type='examiner-report',
                         canonical_url=report['url'], title='June2024 EnglishLanguageB examiner report', publisher='Pearson',
                         year=2024, series='June', component='01', variant='standard', publication_code=report['publicationCode'],
                         filename_date='2024-08-22', sha256=report['sha256'], page_count=report['pageCount'], access_status='obtained',
                         local_evidence_path=REF, identity_status='agent-reviewed', identity_notes='Official June2024 4EB1/01 report; environment/climate tasks match this obtained sitting.',
                         reviewed_pages_json=encode([dict(page=p, mode='text', reviewer=processing['reviewer'], date=processing['reviewDate']) for p in report['textPagesReviewed']]),
                         updated_at=processing['reviewDate']))
        paper.update(stage='processed', last_successful_stage='processed', applicability_status='current-AO-and-task-demand-reviewed',
                     complete_page_audit='true', template_links_complete='true', blocking_issues_json='[]',
                     examiner_report_ids_json=encode([report['documentId']]), report_status='observations-reviewed',
                     reviewed_by=processing['reviewer'], reviewed_at=processing['reviewDate'])
        for row in tasks:
            review = next(t for t in processing['taskReviews'] if t['taskId'] == row['task_id'])
            row.update(mapping_status='current-AO-reviewed', review_status='agent-source-processed',
                       report_refs_json=encode([review['reportObservation']]))
    pending = {}
    for name, additions, key in [('documents', docs, 'document_id'), ('papers', [paper], 'paper_id'), ('tasks', tasks, 'task_id')]:
        fields, old = read_table(directory, name)
        ids = {r[key] for r in additions}
        output = [r for r in old if r[key] not in ids] + [{f: str(r.get(f, '')) for f in fields} for r in additions]
        output.sort(key=lambda r: r[key])
        pending.update(table_outputs(directory, name, fields, output, '4EB1'))
    pending[root / SUMMARY] = json.dumps(public_summary(m), indent=2) + '\n'
    return pending


def export(root):
    pending = prepare(root)
    for path, content in pending.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
    summary = json.loads(pending[Path(root) / SUMMARY])
    return dict(paper=PAPER, detailedTasks=11, printedMarks=160, assessedMarks=100, fullyProcessedPapers=summary['fullyProcessedPapers'], activeTemplates=0)


if __name__ == '__main__':
    print(encode(export(Path(__file__).resolve().parents[1])))
