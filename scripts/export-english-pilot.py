"""Normalize the saved English pilot without claiming new paper processing.

The immutable pilot JSON remains the evidence authority. Ten tasks stay indexed;
Q5 retains its partial source-checked extraction, not a complete runnable rubric.
No syllabus point or AO skill is invented and no template is activated.
"""
import csv
import hashlib
import io
import json
import re
from pathlib import Path
from ledger_io import read_table, table_outputs
from english_followup import load_followup, public_summary, FOLLOWUP, PUBLIC_SUMMARY

PILOT = Path('research/pilot/4EB1-2024-November-01.json')
PAPER = '4EB1-2024-November-01'
DATE = '2026-10-05'


def encode(value):
    return json.dumps(value, separators=(',', ':'), ensure_ascii=False)


def check_pages(pages, count, *, required=False):
    if not isinstance(pages, list) or (required and not pages) or len(pages) != len(set(pages)):
        raise ValueError('Invalid or repeated evidence pages')
    if any(type(p) is not int or not 1 <= p <= count for p in pages):
        raise ValueError('Out-of-range evidence page')


def prepare(root):
    """Validate all records/tables before making any write; safe for fixture tests."""
    root = Path(root)
    m = json.loads((root / PILOT).read_text())
    if (m['paperId'] != PAPER or m['qualification'] != '4EB1' or m['stage'] != 'indexed'
            or m['completePageAudit'] or m['templateLinksComplete'] or m['humanReviewed']
            or m['counts']['fullyProcessedPapers'] != 0 or not m['marksReconciled']):
        raise ValueError('Unsupported pilot or completion promotion')
    docs = {d['type']: d for d in m['documents']}
    if (len(m['documents']) != 3 or len({d['id'] for d in m['documents']}) != 3
            or len(docs) != 3 or set(docs) != {'question-paper', 'mark-scheme', 'examiner-report'}):
        raise ValueError('Expected three unique pilot documents')
    for d in docs.values():
        if d['accessStatus'] != 'obtained' or not re.fullmatch(r'[0-9a-f]{64}', d['sha256']):
            raise ValueError('Missing obtained document/hash evidence')
        for key in ['visualPagesInspected', 'textPagesInspected']:
            check_pages(d[key], d['pageCount'])
    qp, ms, er = (docs[k] for k in ['question-paper', 'mark-scheme', 'examiner-report'])
    if (qp['id'] != 'pilot-' + PAPER + '-qp' or ms['id'] != 'pilot-' + PAPER + '-ms'
            or er['id'] != 'pilot-' + PAPER + '-er' or m['schemeMatchStatus'] != 'verified'):
        raise ValueError('Document identity or matched-scheme evidence changed')
    tasks = m['tasks']
    if (len(tasks) != 11 or [t['number'] for t in tasks] != list(range(1, 12))
            or any(t['id'] != PAPER + '.Q' + str(t['number']) for t in tasks)
            or len({t['id'] for t in tasks}) != 11):
        raise ValueError('Incomplete or duplicate eleven-task index')
    detailed = [t for t in tasks if t.get('detailedExtraction')]
    if ([t['number'] for t in detailed] != [5] or m['counts']['detailedExtractions'] != 1
            or m['counts']['printedLeafTasks'] != 11 or m['counts']['indexedTasks'] != 11):
        raise ValueError('Detailed pilot scope changed; review before exporting')
    for t in tasks:
        if (type(t['marks']) is not int or t['marks'] <= 0
                or not t['aoMarks'] or any(type(n) is not int or n <= 0 for n in t['aoMarks'].values())
                or set(t['aoMarks']) - {'AO1', 'AO2', 'AO3', 'AO4', 'AO5'}
                or sum(t['aoMarks'].values()) != t['marks']):
            raise ValueError('Task/AO marks disagree')
        if t['section'] != ('A' if t['number'] <= 7 else 'B' if t['number'] == 8 else 'C'):
            raise ValueError('Section index mismatch')
        if t['status'] != ('source-checked' if t['number'] == 5 else 'indexed'):
            raise ValueError('Unsupported task-stage promotion')
        check_pages(t['qpPages'], qp['pageCount'], required=True)
        check_pages(t['msPages'], ms['pageCount'], required=True)
        check_pages(t['stimulusPages'], qp['pageCount'])
    expected_rules = [{'group': 'A', 'choose': 7, 'taskNumbers': list(range(1, 8)), 'marks': 40},
                      {'group': 'B', 'choose': 1, 'taskNumbers': [8], 'marks': 30},
                      {'group': 'C', 'choose': 1, 'taskNumbers': [9, 10, 11], 'marks': 30}]
    base = sum(t['marks'] for t in tasks if t['section'] != 'C')
    if (m['optionRules'] != expected_rules or base != 70
            or any(base + t['marks'] != 100 for t in tasks if t['section'] == 'C')
            or sum(t['marks'] for t in tasks) != 160
            or m['counts']['assessedMarks'] != 100 or m['counts']['allAlternativesMarks'] != 160
            or m['counts']['candidateAnsweredTasks'] != 9):
        raise ValueError('Options/marks do not reconcile')
    ref = str(PILOT)
    common = dict(reviewed_by=m['reviewedBy'], reviewer_type='agent', human_reviewed='false',
                  batch_id=m['batchId'], updated_at=DATE)
    doc_rows = []
    for d in m['documents']:
        visual = set(d['visualPagesInspected'])
        pages = [dict(page=p, mode='visual-and-text' if p in visual and p in d['textPagesInspected']
                      else 'visual' if p in visual else 'text', reviewer=m['reviewedBy'], date=m['reviewedAt'])
                 for p in sorted(visual | set(d['textPagesInspected']))]
        doc_rows.append(dict(document_id=d['id'], qualification='4EB1', document_type=d['type'],
            canonical_url=d['url'], title=PAPER+' '+d['type'], publisher='Pearson', year=2024,
            series='November', component='01', variant='standard',
            printed_exam_date=m['printedExamDate'] if d['type']=='question-paper' else '',
            filename_date=m['filenameDate'] if d['type']=='question-paper' else '2025-01-23',
            sha256=d['sha256'], page_count=d['pageCount'], access_status='obtained',
            local_evidence_path=ref, reviewed_pages_json=encode(pages), identity_status='agent-reviewed',
            identity_notes='Normalized existing pilot metadata and exact recorded review modes only. '+d['notes'],
            batch_id=m['batchId'], updated_at=DATE))
    paper_row = dict(paper_id=PAPER, qualification='4EB1', year=2024, series='November', component='01',
        variant='standard', qp_document_id=qp['id'], ms_document_id=ms['id'], insert_document_ids_json='[]',
        examiner_report_ids_json=encode([er['id']]), report_status='obtained-partially-reviewed',
        target_specification_id=m['currentSpecificationCheck']['documentId'], applicability_status='provisional-current-scope',
        stage='indexed', last_successful_stage='indexed', expected_leaf_tasks=11, indexed_leaf_tasks=11,
        extracted_leaf_tasks=1, assessed_marks=100, all_alternatives_marks=160,
        option_rules_json=encode(m['optionRules']), reconciled_marks='true', scheme_match_status=m['schemeMatchStatus'],
        complete_page_audit='false', template_links_complete='false', blocking_issues_json=encode(m['blockingIssues']),
        reviewed_at=m['reviewedAt'], **common)
    rows = []
    for t in tasks:
        detail = t.get('detailedExtraction')
        rows.append(dict(task_id=t['id'], paper_id=PAPER, question_path=str(t['number']), record_kind='leaf',
            section=t['section'], option_group=t['section'], qp_pages_json=encode(t['qpPages']),
            stimulus_refs_json=encode([dict(documentId=qp['id'], pdfPages=t['stimulusPages'],
                **({'sourceLines':t['sourceLines']} if t.get('sourceLines') else {}))] if t['stimulusPages'] else []),
            scheme_pages_json=encode(t['msPages']), command_word=t['commandWord'], original_marks=t['marks'],
            assessment_objectives_json=encode(t['aoMarks']),
            required_knowledge=detail['requiredKnowledge'] if detail else '',
            context_summary=detail['contextSummary'] if detail else '',
            stimulus_types_json=encode(detail['stimulusTypes'] if detail else ['passage'] if t['stimulusPages'] else []),
            solution_structure_json=encode(detail['solutionStructure'] if detail else []), marking_method=t['markingMethod'],
            rubric_ref=ref+'#'+t['id'], acceptable_alternatives_json='[]',
            dependencies_json=encode(detail['dependencies'] if detail else []),
            common_errors_json=encode(detail['commonErrors'] if detail else []),
            report_refs_json=encode([dict(documentId=er['id'], pdfPages=[6])] if detail else []),
            extraction_status=t['status'], mapping_status='editorial-AO-skill-only' if detail else 'not-mapped',
            review_status='agent-partial-review' if detail else 'indexed-only',
            blocker=('Partial scheme summary: two examples are not the complete equivalence list; no runnable rubric. '
                     'AO1 editorial skill stays in pilot JSON, not an invented official syllabus point; template provisional.'
                     if detail else 'Index only; detailed knowledge, solution, alternatives and template analysis pending.'), **common))
    # A later source-checked subset composes over the immutable pilot. Validate
    # everything before producing writes; never let this exporter downgrade it.
    followup = load_followup(root, m)
    if followup:
        by_id = {t['id']: t for t in followup['tasks']}
        for row in rows:
            t = by_id.get(row['task_id'])
            if t:
                row.update(required_knowledge=t['requiredKnowledge'], context_summary=t['contextSummary'],
                           stimulus_types_json=encode(t['stimulusTypes']), solution_structure_json=encode(t['solutionStructure']),
                           rubric_ref=str(FOLLOWUP)+'#'+t['id'], acceptable_alternatives_json=encode(t['acceptableGroups']),
                           common_errors_json=encode(t['editorialResponseTraps']), report_refs_json='[]',
                           extraction_status='source-checked', mapping_status='official-AO-only',
                           review_status='agent-partial-review', reviewed_by=followup['reviewedBy'],
                           blocker=' '.join(t['calibrationBlockers']), updated_at=followup['reviewDate'])
        paper_row.update(extracted_leaf_tasks=followup['combinedDetailedTasks'], reviewed_at=followup['reviewDate'],
                         updated_at=followup['reviewDate'], blocking_issues_json=encode(public_summary(followup)['limitations']))
    additions = {'documents':('document_id', doc_rows), 'papers':('paper_id',[paper_row]), 'tasks':('task_id', rows)}
    pending = []
    for name,(key,records) in additions.items():
        path=root/'research/ledger/v1'/ (name+'.csv')
        fields,old=read_table(path.parent,name)
        if not fields or len(set(fields))!=len(fields) or any(set(r)!=set(fields) or None in r.values() for r in old):
            raise ValueError('Malformed existing table: '+name)
        if len({r[key] for r in old})!=len(old) or any(set(r)-set(fields) for r in records):
            raise ValueError('Duplicate or unsupported export row: '+name)
        merged={r[key]:r for r in old}
        for row in records:merged[row[key]]={field:row.get(field,'') for field in fields}
        pending.extend(table_outputs(path.parent,name,fields,merged.values(),'4EB1').items())
    if followup:
        pending.append((root/PUBLIC_SUMMARY, json.dumps(public_summary(followup), indent=2)+'\n'))
    summary=dict(paper=PAPER, indexedTasks=11, detailedTasks=followup['combinedDetailedTasks'] if followup else 1, fullyProcessedPapers=0, activeTemplates=0,
                 normalizedDocuments=3, originalPilotSha256=hashlib.sha256((root/PILOT).read_bytes()).hexdigest())
    return pending,summary


def export(root):
    pending,summary=prepare(root)
    for path,content in pending:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
    return summary


if __name__=='__main__':
    print(encode(export(Path(__file__).resolve().parents[1])))
