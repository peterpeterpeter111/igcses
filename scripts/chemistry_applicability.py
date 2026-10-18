"""Check a current-demand review without replacing the historical source mappings."""
import hashlib
import json
from collections import Counter
from datetime import date
from pathlib import Path
from ledger_io import read_table

REF = 'research/reviews/2026-10-19-CHEMISTRY-TASK-APPLICABILITY.json'
SUMMARY = 'research/paper-report-summaries/4CH1-current-task-applicability.json'
PAPER = '4CH1-2024-June-1-standard'


def load_applicability(root, extraction):
    root = Path(root)
    r = json.loads((root / REF).read_text())
    def require(value, message):
        if not value:
            raise ValueError(message)
    date.fromisoformat(r['date'])
    require(r['schemaVersion'] == 1 and r['paperId'] == extraction['paperId'] == PAPER
            and r['reviewerType'] == 'agent' and r['humanReviewed'] is False
            and r['finalBlockers'] == [] and r['trackedRecordsOtherThanThisReportChanged'] is False,
            'Current-demand review identity or scope changed')
    require(r['specification']['sha256'] == extraction['currentSpecification']['sha256']
            and r['specification']['auditedIdentitiesLoaded'] == 182, 'Current-demand specification mismatch')
    paths = [f'research/extractions/{PAPER}/Q{i}.json' for i in range(1, 11)]
    require(r['sourcePartitions'] == [dict(path=p, sha256=hashlib.sha256((root / p).read_bytes()).hexdigest()) for p in paths],
            'Current-demand source partitions changed')
    source = {t['taskId']: t for t in extraction['tasks']}
    reviewed = {t['taskId']: t for t in r['tasks']}
    require(len(source) == len(reviewed) == len(r['tasks']) == 56 and source.keys() == reviewed.keys(),
            'Current-demand review omitted or duplicated a source task')
    points = {p['point_id']: p for p in read_table(root / 'research/ledger/v1', 'syllabus-points')[1]}
    expected = {'current-partial-point-demand':53, 'current-skill-only':1,
                'contextual-extension-not-explicit-numbered-demand':1, 'contextual-source-exception-partial-skill-overlap':1}
    require(dict(Counter(t['applicabilityDecision'] for t in r['tasks'])) == expected
            and r['counts'] == dict(leafTasks=56, marks=110, decisions=expected), 'Current-demand counts changed')
    for key, t in reviewed.items():
        s = source[key]
        require(t['questionPath'] == s['questionPath'] and t['originalMarks'] == s['originalMarks']
                and t['sourcePartitionRef'] == paths[int(s['questionPath'].split('.')[0])-1]
                and t['sourcePolicyPreserved'] is True and t['independentReasoning'] and t['evidenceRefs']
                and t['currentApplicabilityReviewComplete'] is True and t['historicalAmendmentCertification'] is False
                and t['officialPerLeafAO'] is None and t['officialPerLeafAOStatus'],
                'Current-demand review invents source, AO or historical certification')
        for m in t['verifiedCurrentPointMappings']:
            p = points.get(m['pointId'])
            require(p and p['qualification'] == '4CH1' and p['pdf_page'] == str(m['pdfPage'])
                    and p['printed_page'] == str(m['printedPage']) and '1C' in m['components']
                    and not p['official_reference'].endswith('C') and m['verifiedRequirementSummaries'],
                    'Current-demand point identity or component mismatch')
        require(all(p in points for p in t['contextualOnlyPointIds']), 'Unknown contextual point')
    hazard = reviewed[PAPER + '.Q2.a.v']
    effects = reviewed[PAPER + '.Q7.c.ii']
    nitric = reviewed[PAPER + '.Q10.a']
    require(hazard['applicabilityDecision'] == 'current-skill-only' and hazard['verifiedCurrentPointMappings'] == []
            and hazard['unnumberedSkillReference']['pdfPage'] == 34,
            'Hazard demand cannot invent a numbered content point')
    require(effects['applicabilityDecision'] == 'contextual-extension-not-explicit-numbered-demand'
            and effects['verifiedCurrentPointMappings'] == [] and effects['contextualOnlyPointIds'] == ['4CH1:issue3:4.16'],
            'Acid-rain formation cannot silently certify an effects-recall list')
    require(nitric['applicabilityDecision'] == 'contextual-source-exception-partial-skill-overlap'
            and [(m['pointId'],m['role']) for m in nitric['verifiedCurrentPointMappings']] == [('4CH1:issue3:1.25','partial-skill-overlap-only')],
            'Nitric-acid source exception cannot become ordinary acid-metal coverage')
    return r


def public_summary(r):
    return dict(paperId=r['paperId'], reviewedAt=r['date'], reviewedTasks=56, originalMarks=110,
                numberedPartialDemands=53, skillOnlyDemands=1, contextualExceptions=2,
                historicalAmendmentCertification=False, officialPerLeafAoVerified=False,
                fullyProcessed=False, humanReviewed=False,
                remainingProcessingGaps=[
                    'Historical amendments are not exhaustively reconciled. The printed/filename date conflict and legacy unresolved variant remain documented; the exact paper/scheme log matches.',
                    'Complete source-processing review and versioned template-family links for all 56 tasks remain unfinished. Source-specific exceptions must stay explicit.',
                    'Official per-part AO marks are unverified and must not be inferred from qualification weightings.',
                    'Exam-practice readiness is separate: diagrams, physical measurements, response recognition, source concessions and generated variants still require calibration. No active exam templates.'
                ])
