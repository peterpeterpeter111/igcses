"""Evidence gate for processed-source status, separate from live template validation."""
import hashlib
import json
from datetime import date
from pathlib import Path
from ledger_io import read_table

PAPER = '4EB1-2024-May-01-standard'
REF = 'research/processing/' + PAPER + '.json'
SPEC_HASH = '11d478a0846ec5269e9b3006f4c8872d075e2991a6a3edb3004eff3a599fe08f'
CURRENT_AO = [{ 'AO1': 1 }, { 'AO1': 1 }, { 'AO2': 10 }, { 'AO1': 1 }, { 'AO1': 2 },
              { 'AO2': 10 }, { 'AO3': 15 }, { 'AO1': 10, 'AO4': 12, 'AO5': 8 },
              { 'AO4': 20, 'AO5': 10 }, { 'AO4': 20, 'AO5': 10 }, { 'AO4': 20, 'AO5': 10 }]


def require(value, message):
    if not value:
        raise ValueError(message)


def load_processing(root, source):
    root = Path(root)
    if not (root / REF).exists():
        return None
    r = json.loads((root / REF).read_text())
    date.fromisoformat(r['reviewDate'])
    require(r['schemaVersion'] == 1 and r['paperId'] == source['paperId'] == PAPER
            and r['status'] == 'processed' and r['reviewerType'] == 'agent' and r['reviewer']
            and r['humanReviewed'] is False and r['activeTemplates'] == 0 and r['liveMarkerImplemented'] is False
            and r['blockingIssues'] == [], 'Processing review scope or readiness claim changed')
    require(r['sourceEvidenceSha256'] == hashlib.sha256((root / 'research/english-extractions' / (PAPER + '.json')).read_bytes()).hexdigest(),
            'Detailed source extraction changed after the processing review')
    require(r['specificationReview'] == dict(documentId='4EB1-spec', issue='4', sha256=SPEC_HASH, pdfPages=[10, 18],
            applicability='current-AO-and-task-demand-reviewed', historicalScope='This review reconciles these 2024 task demands with current Issue4; it does not certify every historical amendment.'),
            'Current specification reconciliation changed')
    objectives = json.loads((root / 'research/assessment-objectives/4EB1-issue4.json').read_text())
    require(objectives['specificationSha256'] == SPEC_HASH, 'Processing specification differs from reviewed AO source')
    require(r['printedTasks'] == 11 and r['printedChoiceMarks'] == 160 and r['candidateAnsweredTasks'] == 9
            and r['candidateMarks'] == 100 and r['completePageAudit'] is True,
            'Processed paper counts or page audit changed')
    require(sum(t['marks'] for t in source['tasks']) == 160 and sum(t['marks'] for t in source['tasks'][:8]) == 70
            and all(t['marks'] == 30 for t in source['tasks'][8:]), 'Optional path totals do not reconcile')
    require(len(r['documents']) == 2, 'Paper/scheme review documents missing')
    for document, original in zip(r['documents'], source['documents']):
        require(document['id'] == original['id'] and document['sha256'] == original['sha256']
                and document['pageCount'] == original['pageCount'] and document['wholeDocumentReviewed'] is True,
                'Whole-page audit source identity differs')
        pages = document['pages']
        require([p['page'] for p in pages] == list(range(1, original['pageCount'] + 1)), 'Whole-page audit omitted or duplicated a page')
        require(all(p['mode'] in ['visual', 'visual-and-text'] and p['reviewer'] == r['reviewer']
                    and p['contentKind'] in ['source-or-instructions', 'answer-space', 'publisher-footer']
                    and p['evidenceRef'] and p['date'] == r['reviewDate'] for p in pages), 'Page audit lacks a recorded review')
    report = r['examinerReport']
    require(report['documentId'] == PAPER + ':examinerReport' and report['sha256'] == '7e3aafb84a541aeafcd3cf370db4c1a085f4478c5f529962595e8f6fdac180d2'
            and report['pageCount'] == 66 and report['identityStatus'] == 'agent-reviewed'
            and report['observationsReviewed'] is True and report['wholeVisualAudit'] is False
            and report['calibrationStatus'] == 'not-implemented' and report['publicationCode'] == '4EB1_01_2406_ER'
            and report['url'] == 'https://qualifications.pearson.com/content/dam/pdf/International-GCSE/English-Language-B/2016/Exam-materials/4eb1-01-pef-20240822.pdf',
            'Report review identity/scope changed')
    require(report['textPagesReviewed'] == sorted(set(report['textPagesReviewed']))
            and all(type(p) is int and 1 <= p <= report['pageCount'] for p in report['textPagesReviewed']),
            'Report review page inventory is invalid')
    def check_observation(observation):
        require(observation['origin'] == 'examiner-report' and observation['documentId'] == report['documentId']
                and observation['summary'] and observation['automaticPenalty'] is False
                and observation['pdfPages'] and all(p in report['textPagesReviewed'] for p in observation['pdfPages']),
                'Report observation lacks reviewed source pages or invents a penalty')
    require(len(r['generalReportObservations']) == 3, 'General report observations missing')
    for observation in r['generalReportObservations']:
        check_observation(observation)
    reviews = r['taskReviews']
    require(len(reviews) == 11 and len({t['taskId'] for t in reviews}) == 11
            and {t['taskId'] for t in reviews} == {t['id'] for t in source['tasks']}, 'Every source task needs one processing review')
    links = read_table(root / 'research/ledger/v1', 'template-links')[1]
    for task in source['tasks']:
        review = next(t for t in reviews if t['taskId'] == task['id'])
        require(review['decision'] == 'current-scope' and review['judgement'] and review['officialAoMarks'] == task['aoMarks'] == CURRENT_AO[task['number'] - 1]
                and review['objectiveIds'] == ['4EB1:issue4:' + k for k in task['aoMarks']], 'Task applicability or AO split changed')
        check_observation(review['reportObservation'])
        ref = review['template']
        require(ref['path'].startswith('research/templates/') and '..' not in Path(ref['path']).parts, 'Family path escaped')
        file = root / ref['path']
        require(ref['sha256'] == hashlib.sha256(file.read_bytes()).hexdigest(), 'Source family changed after task review')
        family = json.loads(file.read_text())
        require(family['id'] == ref['id'] and family['version'] == ref['version'] and family['subject'] == '4EB1'
                and family['status'] == 'provisional' and family['runtime']['implemented'] is False
                and family['customQuiz']['validatedMarks'] == [] and family['marking']['maximum'] == task['marks']
                and family['assessmentObjectives'] == list(task['aoMarks']), 'Source contract cannot invent runtime/template validation')
        require(any(t['taskId'] == task['id'] and t['paperId'] == PAPER and t['originalMarks'] == task['marks']
                    and t['questionPaper']['pdfPages'] == sorted(set(task['qpPages'] + task['stimulusPages']))
                    and t['markScheme']['pdfPages'] == task['msPages'] for t in family['sourceTasks']), 'Task/family source reference mismatch')
        require(any(l['task_id'] == task['id'] and l['template_id'] == family['id'] and l['template_version'] == family['version']
                    and int(l['original_marks']) == task['marks'] for l in links), 'Normalized family link missing')
        expected_grids = [g for g in source['grids'] if g['id'] in task['gridIds']]
        if expected_grids:
            actual = family['marking'].get('componentRubrics', [dict(objective=family['assessmentObjectives'][0], maximum=family['marking']['maximum'], levelRubric=family['marking']['levelRubric'])])
            require(len(actual) == len(expected_grids), 'Writing objective rubrics were collapsed')
            for grid, component in zip(expected_grids, actual):
                require(component['objective'] == grid['objective'] and component['maximum'] == grid['maximum']
                        and component['levelRubric'] == [dict(level=b['level'], minMarks=b['minMarks'], maxMarks=b['maxMarks'], descriptor=b['summary']) for b in grid['levels']],
                        'Source objective grid differs from linked family')
    return r
