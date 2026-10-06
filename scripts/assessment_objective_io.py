"""Separate English objective evidence from numbered curriculum statements.

Pure validation/projection only. A partial teaching link is not completion, an
exam mark, a calibrated rubric or a passed endorsement.
"""
import json
from pathlib import Path
from note_io import read_note

OBJECTIVE_FIELDS = ['objective_id', 'qualification', 'specification_document_id',
    'specification_issue', 'specification_sha256', 'official_reference',
    'reference_kind', 'domain', 'scope', 'short_original_summary',
    'qualification_weight_percent', 'source_pdf_pages_json', 'source_printed_pages_json',
    'statement_status', 'completion_status', 'reviewer_type', 'reviewed_by',
    'human_reviewed', 'updated_at']
LINK_FIELDS = ['objective_coverage_id', 'objective_id', 'qualification',
    'chapter_id', 'heading_id', 'explanation_status', 'example_ids_json',
    'teaching_review_path', 'teaching_reviewed_at', 'source_check_status',
    'human_reviewed', 'blockers_json', 'updated_at']

def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))

def objective_tables(model, root):
    root = Path(root)
    source = next(s for s in json.loads((root / 'research/sources.json').read_text())
                  if s['id'] == model['specificationDocumentId'])
    if (model['schemaVersion'], model['qualification'], model['reviewerType'], model['humanReviewed']) != (1, '4EB1', 'agent', False):
        raise ValueError('Unsupported objective contract or invented human review')
    if (model['specificationIssue'], model['specificationSha256'], source['qualification']) != (source['specificationIssue'], source['sha256'], model['qualification']):
        raise ValueError('Objective source issue/hash mismatch')
    definitions = model['objectives']
    if {d['reference'] for d in definitions} != {'AO1','AO2','AO3','AO4','AO5','AO6'} or len(definitions) != 6:
        raise ValueError('Missing or duplicate official objective')
    objective_rows, links, by_id = [], [], {}
    for d in definitions:
        ref = d['reference']; optional = ref == 'AO6'
        expected_domain = 'reading' if ref in ['AO1','AO2','AO3'] else 'spoken-language' if optional else 'writing'
        if (d['id'], d['referenceKind'], d['domain'], d['scope'], d['statementVerified'], d['complete'], d['humanReviewed']) != ('4EB1:issue4:'+ref, 'assessment-objective', expected_domain, 'optional-endorsement' if optional else 'exam', True, False, False):
            raise ValueError('Objective identity, scope or completion mismatch')
        weight = d['qualificationWeightPercent']
        if (optional and weight is not None) or (not optional and (type(weight) is not int or not 0 < weight <= 100)):
            raise ValueError('Unknown optional weight must remain null; exam weight must be an integer')
        if (d['sourcePdfPages'], d['sourcePrintedPages']) != ([10] if optional else [10,18], [6] if optional else [6,14]):
            raise ValueError('Objective source-page mismatch')
        by_id[d['id']] = d
        objective_rows.append(dict(zip(OBJECTIVE_FIELDS, [d['id'], model['qualification'], source['id'], source['specificationIssue'], source['sha256'], ref, d['referenceKind'], d['domain'], d['scope'], d['summary'], '' if weight is None else str(weight), encode(d['sourcePdfPages']), encode(d['sourcePrintedPages']), 'agent-source-checked', 'incomplete', 'agent', model['reviewer'], 'false', model['reviewDate']])))
    if sum(d['qualificationWeightPercent'] for d in definitions if d['scope']=='exam') != 100:
        raise ValueError('Exam objective weights do not sum to100')
    notes = {n['chapterId']: n for p in (root/'content/notes').glob('*.json')
             if (n := read_note(p))['subjectId']=='english'}
    expected, review_rows = set(), {}
    for name in ['4EB1-reading-foundations.json','4EB1-writing-foundations.json']:
        path = 'research/teaching-reviews/'+name
        review = json.loads((root/path).read_text())
        if review['humanReviewed'] or review['reviewerType']!='agent' or review['source']['sha256']!=source['sha256']:
            raise ValueError('Teaching review/source mismatch')
        for row in review['sections']:
            chapter = row.get('chapterId', review.get('chapterId'))
            for ref in row['assessmentObjectiveRefs']:
                key = '4EB1:issue4:'+ref+':'+chapter+':'+row['sectionId']
                if key in expected: raise ValueError('Duplicate reviewed teaching relationship')
                expected.add(key); review_rows[key]=(chapter,row['sectionId'],path,review['reviewDate'])
    seen=set()
    for link in model['teachingLinks']:
        objective=by_id.get(link['objectiveId']); key=link['id']
        if not objective or key in seen or key != link['objectiveId']+':'+link['chapterId']+':'+link['sectionId']:
            raise ValueError('Unknown/duplicate objective or relationship identity')
        seen.add(key)
        if link['status']!='partial' or link['humanReviewed']:
            raise ValueError('Partial links cannot promote completion or human review')
        if (link['chapterId'],link['sectionId'],link['teachingReviewPath'],link['teachingReviewedAt']) != review_rows.get(key):
            raise ValueError('Teaching review relationship/date mismatch')
        note=notes.get(link['chapterId']); section=next((s for s in note['sections'] if s['id']==link['sectionId']),None) if note else None
        if not section or objective['reference'] not in section.get('points',[]) or note['sourceId']!=source['id'] or note['complete'] or note['humanReviewed']:
            raise ValueError('Missing, stale or incorrectly completed teaching target')
        links.append(dict(zip(LINK_FIELDS,[key,objective['id'],model['qualification'],link['chapterId'],link['sectionId'],'partial',encode([link['sectionId']+':example'] if section.get('example') else []),link['teachingReviewPath'],link['teachingReviewedAt'],'agent-source-checked','false',encode(['Full text-range and whole-response calibration incomplete.','Objective/chapter completion not certified.']),model['reviewDate']])))
    if seen != expected:
        raise ValueError('Objective links omit or invent an existing reviewed relationship')
    return {'assessment-objectives':(OBJECTIVE_FIELDS,objective_rows), 'objective-coverage':(LINK_FIELDS,links)}
