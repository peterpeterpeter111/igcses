"""Validate private real-paper English grids without inventing automatic marks."""
import hashlib
import json
from datetime import date
from pathlib import Path

LEVELS = Path('research/pilot-levels/4EB1-2024-November-01.json')
GRID_RANGES = {
    'analysis': ('AO2', [7, 11], [(1, 2), (3, 4), (5, 6), (7, 8), (9, 10)]),
    'comparison': ('AO3', [13], [(1, 3), (4, 6), (7, 9), (10, 12), (13, 15)]),
    'directed-reading': ('AO1', [15], [(1, 2), (3, 4), (5, 6), (7, 8), (9, 10)]),
    'directed-communication': ('AO4', [16], [(1, 2), (3, 4), (5, 7), (8, 10), (11, 12)]),
    'directed-accuracy': ('AO5', [17], [(1, 2), (3, 4), (5, 6), (7, 8)]),
    'extended-communication': ('AO4', [19], [(1, 4), (5, 8), (9, 12), (13, 16), (17, 20)]),
    'extended-accuracy': ('AO5', [20], [(1, 2), (3, 4), (5, 6), (7, 8), (9, 10)]),
}


def load_levels(root, pilot, retrieval):
    root = Path(root)
    p = root / LEVELS
    if not p.exists():
        return None
    m = json.loads(p.read_text())
    if (m['schemaVersion'] != 1 or m['paperId'] != pilot['paperId'] or m['qualification'] != '4EB1'
            or m['status'] != 'source-checked-partial' or m['reviewerType'] != 'agent'
            or m['humanReviewed'] is not False or m['fullyProcessedPaper'] is not False
            or m['activeTemplates'] != 0 or m['liveMarkerImplemented'] is not False
            or m['wholePageAudit'] is not False or m['wholeReportReview'] is not False
            or m['historicalApplicability'] != 'pending' or retrieval is None):
        raise ValueError('Unsupported English levels identity or readiness')
    date.fromisoformat(m['reviewDate'])
    if m['pilotSha256'] != hashlib.sha256((root/'research/pilot/4EB1-2024-November-01.json').read_bytes()).hexdigest():
        raise ValueError('English levels pilot source changed')
    if m['documentHashes'] != retrieval['documentHashes']:
        raise ValueError('English levels source hashes differ')
    for key, count in [('questionPagesReviewed', 36), ('schemePagesReviewed', 20)]:
        pages = m[key]
        if (not isinstance(pages, list) or not pages or pages != sorted(set(pages))
                or any(type(p) is not int or p < 1 or p > count for p in pages)):
            raise ValueError('English levels review pages invalid')
    if (m['detailedLeafTasks'] != 8 or m['detailedOriginalMarks'] != 157
            or m['combinedDetailedTasks'] != 11 or m['combinedPrintedMarks'] != 160
            or m['candidateAnsweredTasks'] != 9 or m['candidateAssessedMarks'] != 100
            or m['remainingIndexedTasks'] != 0):
        raise ValueError('English levels option/count arithmetic changed')
    grids = {g['id']: g for g in m['grids']}
    prefix = pilot['paperId'] + ':grid:'
    if len(grids) != 7 or set(grids) != {prefix + k for k in GRID_RANGES} or len(m['grids']) != 7:
        raise ValueError('English grids incomplete or duplicated')
    for name, (ao, pages, ranges) in GRID_RANGES.items():
        g = grids[prefix + name]
        if (g['objective'] != ao or g['sourcePdfPages'] != pages or g['maximum'] != ranges[-1][1]
                or g['method'] != 'whole-response-level-judgement'
                or g['descriptorOrigin'] != 'original-semantic-summary-of-official-grid'
                or [(b['minMarks'], b['maxMarks']) for b in g['levels']] != [(0, 0)] + ranges
                or [b['level'] for b in g['levels']] != list(range(len(ranges) + 1))
                or any(type(b[k]) is not int for b in g['levels'] for k in ['level', 'minMarks', 'maxMarks'])
                or any(not b['summary'].strip() for b in g['levels'])):
            raise ValueError('English grid source range or descriptor mismatch')
    tasks = m['tasks']
    if ([t['number'] for t in tasks] != [3, 5, 6, 7, 8, 9, 10, 11]
            or len({t['id'] for t in tasks}) != 8 or sum(t['marks'] for t in tasks) != 157):
        raise ValueError('English levels task scope changed')
    old = {t['id']: t for t in pilot['tasks']}
    for t in tasks:
        original = old.get(t['id'])
        fields = ['number', 'section', 'marks', 'aoMarks', 'qpPages', 'msPages', 'stimulusPages', 'commandWord', 'markingMethod', 'sourceLines']
        if (original is None or any(t.get(k) != original.get(k) for k in fields)
                or type(t['marks']) is not int or type(t['number']) is not int
                or t['status'] != 'source-checked' or t['humanReviewed'] is not False
                or t['liveMarkerImplemented'] is not False or t['templateStatus'] != 'not-implemented-for-this-task'
                or not t['contextSummary'] or not t['solutionStructure'] or not t['calibrationBlockers']
                or any(p not in m['questionPagesReviewed'] for p in t['qpPages'] + t['stimulusPages'])
                or any(p not in m['schemePagesReviewed'] for p in t['msPages'])):
            raise ValueError('English task source/demand or readiness mismatch')
        expected_refs = [dict(objectiveId='4EB1:issue4:'+ao, documentId='4EB1-spec', pdfPages=[10, 18],
                              referenceKind='official-assessment-objective', historicalApplicability='pending') for ao in original['aoMarks']]
        if t['assessmentReferences'] != expected_refs:
            raise ValueError('English objective reference changed')
        if t['number'] == 5:
            groups = t['acceptableGroups']
            if (t['gridIds'] or t['marks'] != 2 or t['maximumCredit'] != 2 or t['answerSlots'] != 2
                    or len(groups) != 8 or [g['id'] for g in groups] != [t['id']+':group-'+str(i) for i in range(1, 9)]
                    or len({g['summary'] for g in groups}) != 8
                    or any(type(g['credit']) is not int or g['credit'] != 1 or not g['summary'] or g['provenance'] != 'scheme' for g in groups)):
                raise ValueError('English Q5 distinct-pool allocation changed')
        else:
            if len(t['gridIds']) != len(set(t['gridIds'])) or any(g not in grids for g in t['gridIds']):
                raise ValueError('English grid references duplicated or missing')
            allocations = {grids[g]['objective']: grids[g]['maximum'] for g in t['gridIds']}
            if allocations != t['aoMarks'] or len(allocations) != len(t['gridIds']) or not t['indicativeContentSummary']:
                raise ValueError('English grids do not reproduce separate AO maxima')
        if t['number'] == 7 and t['sourceCreditRules'] != [dict(rule='single-text-maximum', maximum=6,
                condition='Only one of the two required texts is considered.', provenance='scheme', pdfPages=[13])]:
            raise ValueError('English comparison single-text cap changed')
        if t['number'] == 8 and t['sourceCreditRules'] != [dict(rule='separate-AO-grids', allocations={'AO1': 10, 'AO4': 12, 'AO5': 8},
                provenance='scheme', pdfPages=[15, 16, 17])]:
            raise ValueError('English directed-writing grid split changed')
        if t['number'] >= 9:
            rules = t['sourceCreditRules']
            if rules != [dict(rule='section-choice', choose=1, taskNumbers=[9, 10, 11], provenance='question-paper', pdfPages=[21]),
                    dict(rule='writing-guidance', approximateWords=400, suggestedMinutes=60, retellSourceEvents=False,
                         automaticWordPenalty=False, provenance='question-paper', pdfPages=[21])]:
                raise ValueError('English writing choice/guidance changed')
    return m


def levels_public_summary(m):
    return dict(schemaVersion=1, paperId=m['paperId'], qualification='4EB1', reviewedAt=m['reviewDate'],
                detailedTasks=11, detailedOriginalMarks=160, reviewedTaskNumbers=list(range(1, 12)),
                printedTasks=11, remainingIndexedTasks=0, candidateAnsweredTasks=9, assessedMarks=100,
                allAlternativesMarks=160, fullyProcessedPapers=0, activeTemplates=0, humanReviewed=False,
                limitations=['All printed tasks have structured source records; whole-paper processing checks remain unfinished.',
                             'Complete visual page/report audits and historical specification reconciliation remain unfinished.',
                             'Real-paper level grids and source alternatives are private evidence, not calibrated automatic marking or active templates.'])
