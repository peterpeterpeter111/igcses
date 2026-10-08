"""Compose bounded detailed follow-up evidence with the immutable English pilot.

Answers stay in the private research record; only a whitelisted count summary
is imported by coverage. Source-checked records are not runnable markers.
"""
import hashlib
import json
from datetime import date
from pathlib import Path

FOLLOWUP = Path('research/pilot-followups/4EB1-2024-November-01-retrieval.json')
PUBLIC_SUMMARY = Path('research/pilot-summaries/4EB1-2024-November-01.json')


def load_followup(root, pilot):
    root = Path(root)
    path = root / FOLLOWUP
    if not path.exists():
        return None
    m = json.loads(path.read_text())
    if (m.get('schemaVersion') != 1 or m.get('paperId') != pilot['paperId']
            or m.get('qualification') != '4EB1' or m.get('status') != 'source-checked-partial'
            or m.get('humanReviewed') is not False or m.get('reviewerType') != 'agent'
            or m.get('fullyProcessedPaper') is not False or m.get('activeTemplates') != 0
            or m.get('liveMarkerImplemented') is not False or not m.get('reviewedBy')):
        raise ValueError('Unsupported English follow-up identity or promotion')
    date.fromisoformat(m['reviewDate'])
    pilot_path = root / 'research/pilot/4EB1-2024-November-01.json'
    if m['pilotSha256'] != hashlib.sha256(pilot_path.read_bytes()).hexdigest():
        raise ValueError('Immutable English pilot changed')
    documents = {d['id']: d for d in pilot['documents']}
    required_docs = {d['id']: d['sha256'] for d in pilot['documents'] if d['type'] in ['question-paper', 'mark-scheme']}
    if m['documentHashes'] != required_docs:
        raise ValueError('English follow-up source hashes differ')
    old_tasks = {t['id']: t for t in pilot['tasks']}
    tasks = m['tasks']
    if ([t['number'] for t in tasks] != [1, 2, 4]
            or m['detailedLeafTasks'] != 3 or m['detailedOriginalMarks'] != 3
            or m['combinedDetailedTasks'] != 4 or m['combinedDetailedMarks'] != 5
            or m['remainingIndexedTasks'] != 7 or len({t['id'] for t in tasks}) != 3):
        raise ValueError('English follow-up task/count mismatch')
    for t in tasks:
        old = old_tasks.get(t['id'])
        keys = ['id', 'number', 'marks', 'aoMarks', 'qpPages', 'msPages', 'stimulusPages', 'sourceLines', 'commandWord']
        if (old is None or any(t[k] != old[k] for k in keys) or type(t['marks']) is not int or t['marks'] != 1
                or type(t['number']) is not int or type(t['answerSlots']) is not int
                or type(t['maximumCredit']) is not int
                or any(type(n) is not int for n in t['aoMarks'].values())
                or t['status'] != 'source-checked' or t['answerSlots'] != 1
                or t['markingMethod'] != 'discrete-points' or t['maximumCredit'] != 1
                or t['humanReviewed'] is not False or t['templateStatus'] != 'not-created'
                or t['liveMarkerImplemented'] is not False):
            raise ValueError('English task identity, allocation or readiness changed')
        for kind, pages in [('question-paper', t['qpPages'] + t['stimulusPages']), ('mark-scheme', t['msPages'])]:
            doc = next(d for d in documents.values() if d['type'] == kind)
            if any(type(p) is not int or p not in doc['visualPagesInspected'] for p in pages):
                raise ValueError('English task lacks saved visual source-page evidence')
        groups = t['acceptableGroups']
        if (len(groups) != {1: 6, 2: 7, 4: 9}[t['number']]
                or [g['id'] for g in groups] != [t['id'] + ':group-' + str(i) for i in range(1, len(groups) + 1)]
                or any(type(g['credit']) is not int or g['credit'] != 1 or g['provenance'] != 'scheme' or not g['summary'].strip()
                       or not g['alternatives'] or any(not isinstance(a, str) or not a.strip() for a in g['alternatives']) for g in groups)
                or len({g['summary'] for g in groups}) != len(groups)):
            raise ValueError('Incomplete or duplicate English one-credit answer groups')
        if (t['allocationPolicy'] != 'any-one-group-capped-at-one'
                or t['mapping'] != {'objectiveId': '4EB1:issue4:AO1', 'referenceKind': 'official-assessment-objective',
                                   'documentId': '4EB1-spec', 'pdfPages': [10, 18], 'historicalApplicability': 'pending'}
                or not t['requiredKnowledge'] or not t['contextSummary'] or not t['solutionStructure']
                or not t['calibrationBlockers'] or not t['editorialResponseTraps']):
            raise ValueError('English demand, mapping or calibration evidence missing')
    return m


def public_summary(model):
    return dict(schemaVersion=1, paperId=model['paperId'], qualification='4EB1',
                reviewedAt=model['reviewDate'], detailedTasks=model['combinedDetailedTasks'],
                detailedOriginalMarks=model['combinedDetailedMarks'], reviewedTaskNumbers=[1, 2, 4, 5],
                printedTasks=11, remainingIndexedTasks=model['remainingIndexedTasks'],
                candidateAnsweredTasks=9, assessedMarks=100, allAlternativesMarks=160,
                fullyProcessedPapers=0, activeTemplates=0, humanReviewed=False,
                limitations=['Seven printed tasks remain indexed only; Q5 retains its partial pilot scheme summary.',
                             'Complete visual page/report audits and historical specification reconciliation are unfinished.',
                             'Recorded answer groups are private source evidence, not a calibrated free-text marker or active template.'])
