"""Validate and project selected report evidence without promoting paper readiness."""
import hashlib
import json
from datetime import date
from pathlib import Path

PAPER = '4CH1-2024-June-1-standard'
REF = 'research/examiner-reports/' + PAPER + '.json'
SUMMARY = 'research/paper-report-summaries/' + PAPER + '.json'
REPORT_HASH = '921da18056ed5b629bd0c9f173d34cdcfd85fad369862585a8753d3256a0042c'
REPORT_URL = 'https://qualifications.pearson.com/content/dam/pdf/International-GCSE/Chemistry/2017/Exam-materials/4ch1-1c-pef-20240822.pdf'


def require(value, message):
    if not value:
        raise ValueError(message)


def load_report(root, extraction):
    root = Path(root)
    path = root / REF
    if not path.exists():
        return None
    r = json.loads(path.read_text())
    date.fromisoformat(r['reviewDate'])
    require(r['schemaVersion'] == 1 and r['paperId'] == extraction['paperId'] == PAPER
            and r['reviewerType'] == 'agent' and r['reviewer'] and r['humanReviewed'] is False
            and r['fullyProcessed'] is False and r['activeTemplates'] == 0
            and r['calibrationImplemented'] is False and r['status'] == 'selected-report-observations-reviewed',
            'Report review cannot promote processing, calibration or human review')
    require(r['document'] == dict(documentId=PAPER + ':examinerReport', qualification='4CH1', type='examiner-report',
            url=REPORT_URL, sha256=REPORT_HASH, pageCount=83, publicationCode='4CH1_1C_2406_ER',
            series='June', year=2024, component='1C', identityStatus='agent-reviewed'), 'Report identity mismatch')
    paths = ['research/extractions/' + PAPER + '.json'] + [f'research/extractions/{PAPER}/Q{i}.json' for i in range(1, 11)]
    require(r['sourceEvidence'] == [dict(path=p, sha256=hashlib.sha256((root / p).read_bytes()).hexdigest()) for p in paths],
            'Report review has stale extraction evidence')
    method = r['method']
    require(method['embeddedTextReadable'] is False and method['ocrIndexedPages'] == list(range(1, 84))
            and method['wholeVisualAudit'] is False and method['wholeReportTextReview'] is False
            and method['sourcePdfRetainedPrivately'] is True and method['ocrEngine'], 'Report review scope changed')
    for key in ['ocrTextReviewedPages', 'visuallyReviewedPages']:
        pages = method[key]
        require(pages and pages == sorted(set(pages)) and all(type(p) is int and 1 <= p <= 83 for p in pages),
                'Invalid report page review inventory')
    tasks = {t['taskId'] for t in extraction['tasks']}
    seen = set()
    for o in r['observations'] + r['generalObservations']:
        require(o['origin'] == 'examiner-report' and o['documentId'] == r['document']['documentId']
                and o['summary'] and o['automaticPenalty'] is False and o['markSchemeOverride'] is False
                and o['pdfPages'] and o['pdfPages'] == sorted(set(o['pdfPages']))
                and all(p in method['ocrTextReviewedPages'] for p in o['pdfPages']),
                'Report observation lacks reviewed pages or invents a marking rule')
        if 'taskId' in o:
            require(o['taskId'] in tasks and o['taskId'] not in seen, 'Unknown or duplicate report task')
            seen.add(o['taskId'])
    require(len(tasks) == 56 and len(seen) == 46 and len(r['generalObservations']) == 1
            and set(r['tasksWithoutDirectReportObservation']) == tasks - seen
            and len(r['tasksWithoutDirectReportObservation']) == 10, 'Report task coverage mismatch')
    require(r['counts'] == dict(paperTasks=56, taskObservations=46, tasksWithoutDirectObservation=10,
            ocrIndexedPages=83, ocrTextReviewedPages=len(method['ocrTextReviewedPages']),
            visuallyReviewedPages=len(method['visuallyReviewedPages'])), 'Report count mismatch')
    require({c['id'] for c in r['sourceCautions']} == {'report-ocr-labels','report-q9-inset','report-nitrate-typo','report-not-scheme'}
            and len(r['sourceCautions']) == 4 and r['limitations'], 'Report interpretation cautions missing')
    for caution in r['sourceCautions']:
        require(caution['finding'] and caution['resolution'] and caution['pdfPages']
                and all(p in method['ocrTextReviewedPages'] for p in caution['pdfPages']), 'Report caution lacks reviewed evidence')
    return r


def public_summary(r):
    """Allowlist only bibliographic/count metadata; never expose marking observations."""
    d = r['document']
    return dict(paperId=r['paperId'], reviewedAt=r['reviewDate'], documentId=d['documentId'], url=d['url'],
                pageCount=d['pageCount'], taskObservations=r['counts']['taskObservations'],
                tasksWithoutDirectObservation=r['counts']['tasksWithoutDirectObservation'],
                ocrTextReviewedPages=r['counts']['ocrTextReviewedPages'],
                visuallyReviewedPages=r['counts']['visuallyReviewedPages'], wholeVisualAudit=False,
                fullyProcessed=False, calibrationImplemented=False, humanReviewed=False)
