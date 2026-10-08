"""Validate one source-reviewed English sitting; no processing/activation promotion."""
import json
from datetime import date
from pathlib import Path
from english_levels import GRID_RANGES

PAPER = '4EB1-2024-May-01-standard'
EVIDENCE = Path('research/english-extractions/' + PAPER + '.json')
SUMMARY = Path('research/pilot-summaries/' + PAPER + '.json')
SOURCES = [('question-paper', 'questionPaper', 36, 'e6942bac9d1b08d61a60e500410dff2be7300f6ea27dd55305189126ff637cce'),
           ('mark-scheme', 'markScheme', 21, '583690c8f13acb4af1d75e155e4418a24178d481fe1159f26ae420900d018443')]
TASKS = [(1, 'Give', 1, {'AO1': 1}, [2], [31], [5]),
         (2, 'Identify', 1, {'AO1': 1}, [2], [31], [5]),
         (3, 'Explain', 10, {'AO2': 10}, [3], [30, 31, 32], [6, 7]),
         (4, 'State', 1, {'AO1': 1}, [6], [33], [8]),
         (5, 'Identify', 2, {'AO1': 2}, [6], [34], [8]),
         (6, 'How', 10, {'AO2': 10}, [7], [33, 34], [9, 10]),
         (7, 'Compare', 15, {'AO3': 15}, [10], [30, 31, 32, 33, 34], [11, 12, 13]),
         (8, 'Write', 30, {'AO1': 10, 'AO4': 12, 'AO5': 8}, [15], [30, 31, 32, 33, 34], [14, 15, 16, 17]),
         (9, 'To what extent', 30, {'AO4': 20, 'AO5': 10}, [21], [], [18, 19, 20]),
         (10, 'Write', 30, {'AO4': 20, 'AO5': 10}, [21], [], [18, 19, 20]),
         (11, 'Describe', 30, {'AO4': 20, 'AO5': 10}, [21], [], [18, 19, 20])]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def load_paper(root):
    root = Path(root)
    m = json.loads((root / EVIDENCE).read_text())
    require(m['schemaVersion'] == 1 and m['paperId'] == PAPER and m['qualification'] == '4EB1'
            and m['reviewerType'] == 'agent' and m['reviewer'] and m['humanReviewed'] is False
            and m['wholePageAudit'] is False and m['fullyProcessedPaper'] is False
            and type(m['activeTemplates']) is int and m['activeTemplates'] == 0
            and m['liveMarkerImplemented'] is False and m['historicalApplicability'] == 'pending',
            'English paper identity or readiness changed')
    date.fromisoformat(m['reviewDate'])
    require(m['printedExamDate'] == '2024-05-23' and m['filenameDate'] == '2024-05-24'
            and m['publisherSeries'] == 'June' and m['legacySeries'] == 'May'
            and m['reportStatus'] == 'not-obtained-for-this-pair' and m['identityNotes'] and m['limitations'],
            'English sitting identity/report history changed')
    require(m['generalSchemeRules'] == [dict(rule='positive-source-evidence', pdfPages=[3]),
            dict(rule='whole-response-best-fit-then-quality-within-level', pdfPages=[3, 4]),
            dict(rule='indicative-content-non-exhaustive', pdfPages=[3]),
            dict(rule='crossed-out-work-unless-replaced', pdfPages=[3]),
            dict(rule='plans-only-if-no-other-response', pdfPages=[3])], 'English general source policy changed')
    batch = json.loads((root / 'research/batches/2026-09-08-cross-subject-lower-01.manifest.json').read_text())
    original = next(r for r in batch['records'] if r['paperId'] == PAPER)
    docs = m['documents']
    require(len(docs) == 2, 'English paper needs its exact two documents')
    for d, (kind, key, count, digest) in zip(docs, SOURCES):
        require(d['id'] == PAPER + ':' + key and d['type'] == kind and d['pageCount'] == count
                and d['sha256'] == digest == original[key]['sha256'] and d['url'] == original[key]['url'],
                'English paper source differs from obtained batch')
        for field in ['visualPages', 'textPages']:
            require(d[field] and d[field] == sorted(set(d[field]))
                    and all(type(p) is int and 1 <= p <= count for p in d[field]), 'English reviewed page range invalid')
    require(m['detailedTasks'] == 11 and m['allAlternativesMarks'] == 160
            and m['candidateAnsweredTasks'] == 9 and m['candidateAssessedMarks'] == 100
            and m['optionRules'] == [{'group': 'A', 'choose': 7, 'taskNumbers': list(range(1, 8)), 'marks': 40},
                                    {'group': 'B', 'choose': 1, 'taskNumbers': [8], 'marks': 30},
                                    {'group': 'C', 'choose': 1, 'taskNumbers': [9, 10, 11], 'marks': 30}],
            'English option/count arithmetic changed')
    prefix = PAPER + ':grid:'
    grids = {g['id']: g for g in m['grids']}
    require(len(m['grids']) == len(grids) == 7 and set(grids) == {prefix + k for k in GRID_RANGES}, 'English grid identities invalid')
    for name, (ao, pages, ranges) in GRID_RANGES.items():
        g = grids[prefix + name]
        require(g['objective'] == ao and g['sourcePdfPages'] == ([7, 10] if name == 'analysis' else pages)
                and g['maximum'] == ranges[-1][1] and g['method'] == 'whole-response-level-judgement'
                and g['descriptorOrigin'] == 'original-semantic-summary-of-official-grid'
                and [(b['minMarks'], b['maxMarks']) for b in g['levels']] == [(0, 0)] + ranges
                and [b['level'] for b in g['levels']] == list(range(len(ranges) + 1))
                and all(type(b[k]) is int for b in g['levels'] for k in ['level', 'minMarks', 'maxMarks'])
                and all(b['summary'].strip() for b in g['levels']), 'English source grid mismatch')
    tasks = m['tasks']
    require(len(tasks) == 11 and len({t['id'] for t in tasks}) == 11, 'English task identities incomplete')
    for t, (n, command, marks, aos, qp, stimulus, ms) in zip(tasks, TASKS):
        require(t['id'] == PAPER + '.Q' + str(n) and type(t['number']) is int and t['number'] == n
                and type(t['marks']) is int and t['marks'] == marks and t['aoMarks'] == aos
                and t['commandWord'] == command and t['qpPages'] == qp and t['stimulusPages'] == stimulus and t['msPages'] == ms
                and t['section'] == ('A' if n <= 7 else 'B' if n == 8 else 'C')
                and t['status'] == 'source-checked' and t['humanReviewed'] is False and t['liveMarkerImplemented'] is False
                and all(type(v) is int for v in t['aoMarks'].values())
                and t['contextSummary'] and t['requiredKnowledge'] and t['solutionStructure'] and t['calibrationBlockers']
                and t['reportRefs'] == [], 'English source task mismatch')
        require(all(p in docs[0]['visualPages'] for p in qp + stimulus)
                and all(p in docs[1]['visualPages'] for p in ms), 'English task lacks recorded visual source review')
        refs = [dict(objectiveId='4EB1:issue4:' + ao, documentId='4EB1-spec', pdfPages=[10, 18],
                     referenceKind='official-assessment-objective', historicalApplicability='pending') for ao in aos]
        require(t['assessmentReferences'] == refs, 'English current AO references changed')
        groups = t['acceptableGroups']
        if n in [1, 2, 4, 5]:
            require(len(groups) == {1: 5, 2: 6, 4: 7, 5: 10}[n]
                    and [g['id'] for g in groups] == [t['id'] + ':group-' + str(i) for i in range(1, len(groups) + 1)]
                    and len({g['summary'] for g in groups}) == len(groups)
                    and all(type(g['credit']) is int and g['credit'] == 1 and g['summary'] and g['provenance'] == 'scheme' for g in groups)
                    and t['maximumCredit'] == t['answerSlots'] == marks and not t['gridIds']
                    and t['markingMethod'] == 'discrete-points' and t['sourceLines'] == {
                        1: 'Text One: Recycle More Often', 2: 'Text One: Buy Sustainable Products',
                        4: 'Text Two: lines 9–15', 5: 'Text Two: lines 24–34'}[n], 'English source eligibility/line range changed')
        else:
            require(not groups and t['markingMethod'] == 'levels' and t['indicativeContentSummary']
                    and len(set(t['gridIds'])) == len(t['gridIds']) and all(g in grids for g in t['gridIds'])
                    and {grids[g]['objective']: grids[g]['maximum'] for g in t['gridIds']} == aos
                    and len(t['gridIds']) == len(aos), 'English task separate grids invalid')
        rules = t['sourceCreditRules']
        if n == 7:
            require(rules == [dict(rule='single-text-maximum', maximum=6, condition='Only one required text considered.', provenance='scheme', pdfPages=[13])], 'English single-text cap changed')
        elif n == 8:
            require(rules == [dict(rule='separate-AO-grids', allocations=aos, provenance='scheme', pdfPages=[15, 16, 17])], 'English directed-writing split changed')
            require(t['writingContext'] == dict(form='letter', audience='a friend', topic='protecting the planet and preventing climate change',
                    requiredFocus=['damage', 'action', 'reluctance-to-act']), 'English directed-writing task demand changed')
        elif n >= 9:
            require(rules == [dict(rule='section-choice', choose=1, taskNumbers=[9, 10, 11], provenance='question-paper', pdfPages=[21]),
                              dict(rule='writing-guidance', approximateWords=400, suggestedMinutes=60, retellSourceEvents=False,
                                   automaticWordPenalty=False, provenance='question-paper', pdfPages=[21])], 'English writing choice/guidance changed')
        else:
            require(not rules, 'Unexpected English source credit rule')
        require(all(e['origin'] == 'editorial-inference' and e['automaticPenalty'] is False for e in t['editorialCommonErrors']), 'English editorial trap mislabeled as publisher rule')
    return m


def public_summary(m):
    return dict(schemaVersion=1, paperId=PAPER, qualification='4EB1', reviewedAt=m['reviewDate'],
                detailedTasks=11, detailedOriginalMarks=160, printedTasks=11, remainingIndexedTasks=0,
                candidateAnsweredTasks=9, assessedMarks=100, allAlternativesMarks=160,
                questionPaperPagesReviewed=len(m['documents'][0]['visualPages']), markSchemePagesReviewed=len(m['documents'][1]['visualPages']),
                wholePageAudit=False, fullyProcessedPapers=0, activeTemplates=0, humanReviewed=False,
                legacySeries='May', publisherSeries='June', reportStatus=m['reportStatus'], limitations=m['limitations'])
