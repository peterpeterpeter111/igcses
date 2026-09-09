"""Export a reviewed extraction overlay without changing immutable discovery batches.

Usage: python3 scripts/export-extraction-ledger.py research/extractions/<file>.json
The input remains the authority for detailed criteria; CSV rows link to it.
"""
import csv
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = Path(sys.argv[1]).resolve()
if path.parent != root / 'research/extractions':
    raise ValueError('Expected one saved research/extractions JSON file')
m = json.loads(path.read_text())
if m['fullyProcessed'] or m['paperStage'] != 'indexed':
    raise ValueError('This exporter handles partial extractions only')
if m['paperId'] != '4PH1-2024-June-1-standard':
    raise ValueError('This bounded exporter is for the reviewed Physics 2024 1P overlay only')
date = m['reviewDate']
batch = 'physics-detailed-' + date
relative = str(path.relative_to(root))
paper = m['paperId']


def merge(name, key, records):
    file = root / 'research/ledger/v1' / (name + '.csv')
    with file.open() as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames
        rows = list(reader)
    indexed = {r[key]: r for r in rows}
    for record in records:
        unknown = set(record) - set(fields)
        if unknown:
            raise ValueError(unknown)
        indexed[record[key]] = {field: record.get(field, '') for field in fields}
    with file.open('w', newline='') as f:
        writer = csv.DictWriter(f, fields)
        writer.writeheader()
        writer.writerows(indexed.values())


common = dict(reviewed_by=m['reviewer'], reviewer_type='agent', human_reviewed='false', batch_id=batch, updated_at=date)
docs = []
for d in m['documents']:
    pages = m['pageAudit']['questionPaper' if d['type'] == 'question-paper' else 'markScheme']['visuallyReviewedPages']
    docs.append(dict(document_id=d['id'], qualification=m['qualification'], document_type=d['type'], canonical_url=d['url'], title=paper + ' ' + d['type'], publisher='Pearson', year=2024, series='Summer', component='1P', variant='standard', printed_exam_date='2024-05-22' if d['type'] == 'question-paper' else '', filename_date='2024-05-23' if d['type'] == 'question-paper' else '2024-08-22', publication_code='P75826A' if d['type'] == 'question-paper' else '4PH1_1P_2406_MS', sha256=d['sha256'], page_count=d['pageCount'], access_status='obtained', local_evidence_path=relative, reviewed_pages_json=json.dumps([dict(page=p, mode='visual-and-text', reviewer=m['reviewer'], date=date) for p in pages]), identity_status='agent-reviewed', identity_notes='Matched existing cover review; retained legacy paper ID. Full page audit remains incomplete.', batch_id=batch, updated_at=date))
merge('documents', 'document_id', docs)
merge('papers', 'paper_id', [dict(paper_id=paper, qualification=m['qualification'], year=2024, series='Summer', component='1P', variant='standard', qp_document_id=m['documents'][0]['id'], ms_document_id=m['documents'][1]['id'], insert_document_ids_json='[]', examiner_report_ids_json='[]', report_status=m['examinerReportStatus'], target_specification_id='4PH1-spec', applicability_status='partial-current-scope-review', stage='indexed', last_successful_stage='indexed', extracted_leaf_tasks=len(m['tasks']), assessed_marks=110, all_alternatives_marks=110, option_rules_json=json.dumps({'mode': 'all-compulsory', 'sourcePages':[1,31]}), reconciled_marks='false', scheme_match_status='matched-reviewed-subset', complete_page_audit='false', template_links_complete='false', blocking_issues_json=json.dumps(m['blockers']), reviewed_at=date, **common)])
rows = []
mappings = []
for t in m['tasks']:
    rows.append(dict(task_id=t['taskId'], paper_id=paper, question_path=t['questionPath'], record_kind='leaf', qp_pages_json=json.dumps(t['questionPaperPages']), stimulus_refs_json=json.dumps([{'documentId':m['documents'][0]['id'], 'pdfPages':t['questionPaperPages']}]), scheme_pages_json=json.dumps(t['markSchemePages']), command_word=t['commandWord'], original_marks=t['originalMarks'], assessment_objectives_json='[]', required_knowledge='; '.join(t['requiredKnowledge']), context_summary=t['contextSummary'], stimulus_types_json='["diagram","scenario"]' if t['questionPath'].startswith('5.b') else '["graph"]', solution_structure_json=json.dumps(t['solutionStructure']), marking_method=t['markingMethod'], rubric_ref=relative+'#'+t['taskId'], acceptable_alternatives_json=json.dumps(t['acceptableAlternatives']), dependencies_json=json.dumps(t['dependencies']), common_errors_json=json.dumps(t['commonErrors']), report_refs_json='[]', extraction_status=t['extractionStatus'], mapping_status='agent-reviewed', review_status='agent-reviewed', blocker='; '.join(t['blockers']), **common))
    for ref in t['syllabusMappings']:
        mappings.append(dict(mapping_id=t['taskId']+':'+ref['pointId'], task_id=t['taskId'], point_id=ref['pointId'], mapping_kind=ref['kind'], current_applicability=ref['currentApplicability'], evidence_refs_json=json.dumps([{'documentId':'4PH1-spec','pdfPages':[18] if int(ref['pointId'].split(':')[-1].split('.')[1]) >= 11 else [17]}, {'documentId':m['documents'][1]['id'],'pdfPages':t['markSchemePages']}]), rationale=ref['rationale'], review_status='agent-reviewed', reviewed_by=m['reviewer'], reviewer_type='agent', updated_at=date))
merge('tasks', 'task_id', rows)
merge('task-mappings', 'mapping_id', mappings)
print(json.dumps({'paper':paper, 'detailedLeafTasks':len(rows), 'taskMappings':len(mappings), 'fullyProcessed':False}))
