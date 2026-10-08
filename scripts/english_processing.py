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


def _load_processing(root, source, *, paper, ref, evidence, report_identity, allow_runtime=False):
    root = Path(root)
    if not (root / ref).exists():
        return None
    r = json.loads((root / ref).read_text())
    date.fromisoformat(r['reviewDate'])
    require(r['schemaVersion'] == 1 and r['paperId'] == source['paperId'] == paper
            and r['status'] == 'processed' and r['reviewerType'] == 'agent' and r['reviewer']
            and r['humanReviewed'] is False and r['activeTemplates'] == 0 and r['liveMarkerImplemented'] is False
            and r['blockingIssues'] == [], 'Processing review scope or readiness claim changed')
    if paper == PAPER:
        require(r['sourceEvidenceSha256'] == hashlib.sha256((root / evidence[0]).read_bytes()).hexdigest(),
                'Detailed source extraction changed after the processing review')
    else:
        require(r['sourceEvidence'] == [dict(path=p, sha256=hashlib.sha256((root / p).read_bytes()).hexdigest()) for p in evidence],
                'Composed source evidence changed after the processing review')
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
    require(all(report[k] == v for k, v in report_identity.items())
            and report['identityStatus'] == 'agent-reviewed' and report['observationsReviewed'] is True
            and report['wholeVisualAudit'] is False and report['calibrationStatus'] == 'not-implemented',
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
                and family['status'] == 'provisional' and (family['runtime']['implemented'] is False or (allow_runtime and family['id'] == '4EB1.retrieve-two-causes' and task['number'] == 5 and family['version'] == '0.1.0'))
                and family['customQuiz']['validatedMarks'] == [] and family['marking']['maximum'] == task['marks']
                and family['assessmentObjectives'] == list(task['aoMarks']), 'Source contract cannot invent runtime/template validation')
        require(any(t['taskId'] == task['id'] and t['paperId'] == paper and t['originalMarks'] == task['marks']
                    and t['questionPaper']['pdfPages'] == sorted(set(task['qpPages'] + task['stimulusPages']))
                    and t['markScheme']['pdfPages'] == task['msPages'] for t in family['sourceTasks']), 'Task/family source reference mismatch')
        require(any(l['task_id'] == task['id'] and l['template_id'] == family['id'] and l['template_version'] == family['version']
                    and int(l['original_marks']) == task['marks'] for l in links), 'Normalized family link missing')
        expected_grids = [g for g in source['grids'] if g['id'] in task.get('gridIds', [])]
        if expected_grids:
            actual = family['marking'].get('componentRubrics', [dict(objective=family['assessmentObjectives'][0], maximum=family['marking']['maximum'], levelRubric=family['marking']['levelRubric'])])
            require(len(actual) == len(expected_grids), 'Writing objective rubrics were collapsed')
            for grid, component in zip(expected_grids, actual):
                require(component['objective'] == grid['objective'] and component['maximum'] == grid['maximum']
                        and component['levelRubric'] == [dict(level=b['level'], minMarks=b['minMarks'], maxMarks=b['maxMarks'], descriptor=b['summary']) for b in grid['levels']],
                        'Source objective grid differs from linked family')
    return r


def load_processing(root, source):
    return _load_processing(root, source, paper=PAPER, ref=REF,
        evidence=['research/english-extractions/' + PAPER + '.json'],
        report_identity=dict(documentId=PAPER + ':examinerReport', sha256='7e3aafb84a541aeafcd3cf370db4c1a085f4478c5f529962595e8f6fdac180d2',
            pageCount=66, publicationCode='4EB1_01_2406_ER',
            url='https://qualifications.pearson.com/content/dam/pdf/International-GCSE/English-Language-B/2016/Exam-materials/4eb1-01-pef-20240822.pdf'))


def load_november_processing(root, pilot, followup, levels):
    paper = '4EB1-2024-November-01'
    ref = 'research/processing/' + paper + '.json'
    if not (Path(root) / ref).exists():
        return None
    require(followup is not None and levels is not None, 'November processing requires both detailed overlays')
    tasks = sorted(followup['tasks'] + levels['tasks'], key=lambda t: t['number'])
    source = dict(paperId=paper, documents=pilot['documents'][:2], tasks=tasks, grids=levels['grids'])
    return _load_processing(root, source, paper=paper, ref=ref, allow_runtime=True,
        evidence=['research/pilot/' + paper + '.json', 'research/pilot-followups/' + paper + '-retrieval.json', 'research/pilot-levels/' + paper + '.json'],
        report_identity=dict(documentId='pilot-' + paper + '-er', sha256='2757e1c77c8c201a9ab734cc673b0a73b979cfe29cff6a661a2f290f0090e315',
            pageCount=16, publicationCode='4EB1_01_2411_ER',
            url='https://qualifications.pearson.com/content/dam/pdf/International-GCSE/English-Language-B/2016/Exam-materials/4eb1-01-pef-20250123.pdf'))


def november_public_summary(levels, processing):
    from english_levels import levels_public_summary
    summary = levels_public_summary(levels)
    if processing:
        summary.update(reviewedAt=processing['reviewDate'], questionPaperPagesReviewed=36,
            markSchemePagesReviewed=20, wholePageAudit=True, fullyProcessedPapers=1,
            reportStatus='observations-reviewed', limitations=processing['limitations'])
    return summary
