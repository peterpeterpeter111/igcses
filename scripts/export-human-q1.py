"""Normalize the full visual 4HB1 inventory and detailed Q1–Q5 subset.

Structural inventory is42parts/90marks; only24parts/51marks are detailed. The
paper stays indexed, and an any-two-of-three rubric retains its distinct cap.
All evidence/table validation happens before any write. Raw manifests are read.
"""
import csv
import hashlib
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAPER = '4HB1-2024-May-01-standard'
OVERLAY = 'research/extractions/' + PAPER + '.json'
INVENTORY = 'research/syllabus/4HB1-selected-q1-demands.json'
Q2_INVENTORY = 'research/syllabus/4HB1-selected-q2-demands.json'
Q3_INVENTORY = 'research/syllabus/4HB1-selected-q3-demands.json'
CELLS = 'research/syllabus/4HB1-cells-foundations.json'
Q4_INVENTORY = 'research/syllabus/4HB1-selected-q4-demands.json'
MOLECULES = 'research/syllabus/4HB1-biological-molecules.json'
SKILLS = 'research/syllabus-skills/4HB1-issue2-selected.json'
INDEX = 'research/paper-indexes/4HB1-2024-summer-01.json'
# Independent reviewed leaf allocations; index records must not supply their own denominator.
INDEX_ALLOCATIONS = '1.a.i:1:2:4 1.a.ii:1:2:4 1.b.i:2:3:4 1.b.ii:2:3:4 1.b.iii:2:4:4 1.c.i:1:5:4 1.c.ii:2:5:4 1.c.iii:1:5:4 2.a.i:4:6:5 2.a.ii:1:7:5 2.b:6:7:5 3.a.i:1:8:6 3.a.ii:1:8:6 3.a.iii:1:8:6 3.b.i:1:8:6 3.b.ii:1:9:6 3.c:4:9:6 4.a.i:3:10:7 4.a.ii:1:11:7 4.b.i:1:11:7 4.b.ii:4:11:7 5.a.i:5:12:8 5.a.ii:1:13:8 5.b:4:13:8 6.a.i:2:15:9 6.a.ii:2:15:9 6.a.iii:2:15:9 6.b:5:16:9 6.c:2:17:9 7.a:4:18:10 7.b:2:18:10 7.c.i:1:19:10 7.c.ii:1:19:10 7.c.iii:1:19:10 8.a.i:2:20:11 8.a.ii:2:21:11 8.a.iii:1:21:11 8.b:2:21:11 9.a.i:2:22:11 9.a.ii:5:22:11 9.b.i:2:23:11 9.b.ii:1:23:11'
INDEX_EXPECTED = {path: (int(marks), [int(qp)], [int(ms)]) for path, marks, qp, ms in (item.split(':') for item in INDEX_ALLOCATIONS.split())}
EXPECTED = {
    '1.a.i': (1, [2]), '1.a.ii': (1, [2]),
    '1.b.i': (2, [3]), '1.b.ii': (2, [3]), '1.b.iii': (2, [4]),
    '1.c.i': (1, [5]), '1.c.ii': (2, [5]), '1.c.iii': (1, [5]),
    '2.a.i': (4, [6]), '2.a.ii': (1, [7]), '2.b': (6, [7]),
    '3.a.i': (1, [8]), '3.a.ii': (1, [8]), '3.a.iii': (1, [8]),
    '3.b.i': (1, [8]), '3.b.ii': (1, [9]), '3.c': (4, [9]),
    '4.a.i': (3, [10]), '4.a.ii': (1, [11]), '4.b.i': (1, [11]), '4.b.ii': (4, [11]),
    '5.a.i': (5, [12]), '5.a.ii': (1, [13]), '5.b': (4, [13]),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def pages_valid(pages, maximum):
    return (isinstance(pages, list) and bool(pages)
            and all(type(p) is int and 1 <= p <= maximum for p in pages)
            and len(set(pages)) == len(pages))


def rubric_maximum(task):
    """Validate distinct point capacity; not a semantic response marker."""
    criteria, rule = task['criteria'], task['scoringRule']
    ids = [c['id'] for c in criteria]
    require(criteria and len(ids) == len(set(ids)) and all(c['marks'] == 1 and type(c['marks']) is int and c['rule'] for c in criteria), 'Invalid one-mark criteria')
    require(rule['eligibleCriterionIds'] == ids and rule['creditPerCriterion'] == 1, 'Rubric eligibility mismatch')
    require(type(rule['maximum']) is int and type(rule['selectionLimit']) is int and rule['maximum'] == rule['selectionLimit'] == task['originalMarks'], 'Rubric cap mismatch')
    require(rule['mode'] in ['all-distinct', 'any-distinct'], 'Unknown selection policy')
    require(rule['maximum'] <= len(criteria), 'Insufficient criteria capacity')
    if rule['mode'] == 'all-distinct':
        require(len(criteria) == rule['maximum'], 'All-distinct maximum mismatch')
    return rule['maximum']


def prepare(root=ROOT):
    root = Path(root)
    def read(path):
        return json.loads((root / path).read_text())
    m = read(OVERLAY)
    require(m['paperId'] == PAPER and m['qualification'] == '4HB1', 'Wrong bounded paper')
    require(m['paperStage'] == 'indexed' and m['fullyProcessed'] is False and m['humanReviewed'] is False and m['marksReconciled'] is False, 'No whole-paper or human promotion')
    require(m['wholePaperLeafCount'] == 42 and m['wholePaperMarks'] == 90 and m['reviewedSubsetMarksReconciled'] is True and m['inventoryMarksReconciled'] is True and m['visualInventoryRef'] == INDEX, 'Structural and detailed scopes must stay separate')
    require(m['detailedLeafTasks'] == 24 and m['detailedOriginalMarks'] == 51 and m['reviewedQuestionTotals'] == {'1': 12, '2': 11, '3': 9, '4': 9, '5': 10}, 'Wrong Q1–Q5 subset counts')
    require(m['rawManifestRef'] == 'research/batches/2026-09-08-cross-subject-lower-01.manifest.json'
            and m['coverReviewRef'] == 'research/reviews/2026-09-09-cover-review.json', 'Unexpected evidence authority')
    for field in ['rawManifest', 'coverReview']:
        require(hashlib.sha256((root / m[field + 'Ref']).read_bytes()).hexdigest() == m[field + 'Sha256'], 'Historical evidence bytes changed')
    batch = read(m['rawManifestRef'])
    raw = next(r for r in batch['records'] if r['paperId'] == PAPER)
    cover = next(r for r in read(m['coverReviewRef'])['records'] if r['paperId'] == PAPER)
    require(raw['processingStatus'] == 'indexed-only' and raw['extractedTaskCount'] == 0 and raw['fullyProcessed'] is False, 'Raw index must be preserved')
    identity = m['canonicalIdentity']
    require(identity == dict(year=2024, series=cover['canonicalSeries'], component=cover['observedComponent'], variant='unresolved', printedDate=cover['printedDate'], filenameDate='2024-05-15', legacyPaperIdPreserved=True), 'Cover/date identity mismatch')
    require(cover['maximumMarks'] == m['wholePaperMarks'] and cover['filenameDateConflict'] is True, 'Cover marks/date-conflict mismatch')
    docs = {d['type']: d for d in m['documents']}
    require(set(docs) == {'question-paper', 'mark-scheme'} and len(m['documents']) == 2, 'Expected two distinct documents')
    qp, ms = docs['question-paper'], docs['mark-scheme']
    for key, doc, expected_pages in [('questionPaper', qp, list(range(2, 14))), ('markScheme', ms, list(range(3, 9)))]:
        source, audit = raw[key], m['pageAudit'][key]
        require(doc['id'] == PAPER + ':' + key and doc['sha256'] == source['sha256'] == cover[key + 'Sha256'] and doc['url'] == source['url'] and doc['pageCount'] == source['pageCount'], 'Document identity/hash metadata mismatch')
        require(audit['visuallyReviewedPages'] == expected_pages and audit['wholeDocumentReviewed'] is False, 'Bounded visual audit drift')
        require(pages_valid(expected_pages, doc['pageCount']), 'Invalid audit pages')
    index = read(INDEX)
    require(index['paperId'] == PAPER and index['qualification'] == '4HB1' and index['questionPaperSha256'] == qp['sha256'] and index['markSchemeSha256'] == ms['sha256'], 'Visual index source mismatch')
    require(index['indexedLeafCount'] == 42 and index['indexedOriginalMarks'] == 90 and index['questionCount'] == 9 and index['allCompulsory'] is True and index['fullyProcessed'] is False and index['humanReviewed'] is False and index['visualPageAuditComplete'] is True, 'Index status/count drift')
    require(index['questionPaperVisualPages'] == list(range(1, 25)) and index['markSchemeVisualPages'] == list(range(1, 13)) and index['blankQuestionPaperPages'] == [14, 24] and index['nonTaskSchemePages'] == [1, 2, 3, 12], 'Incomplete structural page audit')
    match = index['paperMatch']
    require(match == dict(questionPaperLog='P74626RA', schemePaperLog='P74626RA', schemePublicationCode='4HB1_01_2406_MS', questionPaperEvidencePages=[1], schemeEvidencePages=[1, 2], printedDate='2024-05-14', filenameDate='2024-05-15', dateConflictPreserved=True, variant='unresolved'), 'Paper log/date match drift')
    for field in ['rawManifestRef', 'rawManifestSha256', 'coverReviewRef', 'coverReviewSha256']:
        require(index[field] == m[field], 'Historical index reference drift')
    leaves = index['tasks']
    require(len(leaves) == 42 and len({t['taskId'] for t in leaves}) == 42 and {t['questionPath'] for t in leaves} == set(INDEX_EXPECTED), 'Missing/duplicate indexed leaves')
    for leaf in leaves:
        path = leaf['questionPath']; marks, pages, scheme_pages = INDEX_EXPECTED[path]
        require(leaf['taskId'] == PAPER + '.Q' + path and leaf['paperId'] == PAPER and leaf['recordKind'] == 'leaf' and type(leaf['originalMarks']) is int and leaf['originalMarks'] == marks and leaf['questionPaperPages'] == pages and leaf['markSchemePages'] == scheme_pages, 'Indexed allocation/page mismatch')
        stimulus = {'1.b.iii': [3, 4], '2.a.ii': [6, 7], '3.b.ii': [8, 9], '4.a.ii': [10, 11], '5.a.ii': [12, 13], '6.b': [15, 16], '8.a.ii': [20, 21], '8.a.iii': [20, 21]}.get(path, pages)
        require(leaf['stimulusRefs'] == [dict(documentId=qp['id'], pdfPages=stimulus)] and leaf['commandWord'] and leaf['contextSummary'], 'Indexed stimulus/label mismatch')
        require(leaf['commandWordStatus'] == ('source-checked' if path in EXPECTED else 'editorial-short-label-not-verbatim-command'), 'Indexed labels must not claim verbatim command review')
        require(leaf['extractionStatus'] == ('source-checked' if path in EXPECTED else 'indexed-only'), 'Structural index cannot promote detailed extraction')
        require(not any(key in leaf for key in ['criteria', 'solutionStructure', 'syllabusMappings', 'assessmentObjectives']), 'Index must not invent detailed fields')
    expected_totals = [(8, 12, 5, 4), (3, 11, 7, 5), (6, 9, 9, 6), (4, 9, 11, 7), (3, 10, 13, 8), (5, 13, 17, 9), (5, 9, 19, 10), (4, 7, 21, 11), (4, 10, 23, 11)]
    require(index['questionTotals'] == [dict(question=q, parts=n, marks=marks, questionPaperTotalPage=page, markSchemeTotalPage=ms_page) for q, (n, marks, page, ms_page) in enumerate(expected_totals, 1)], 'Question total source drift')
    for total in index['questionTotals']:
        subset = [t for t in leaves if t['questionPath'].split('.')[0] == str(total['question'])]
        require(len(subset) == total['parts'] and sum(t['originalMarks'] for t in subset) == total['marks'], 'Question allocation reconciliation failed')
    require(sum(t['originalMarks'] for t in leaves) == 90 and len(index['sourceDiscrepancies']) == 2 and len(index['reuseQualifications']) == 4 and index['blockers'], 'Inventory gates/sum mismatch')
    spec = m['currentSpecification']
    inv = read(INVENTORY)
    source = next(s for s in read('research/sources.json') if s['id'] == '4HB1-spec')
    require(spec['documentId'] == inv['specificationDocumentId'] == source['id'] and spec['sha256'] == inv['specificationSha256'] == source['sha256'], 'Current specification identity mismatch')
    require(spec['issue'] == '2' and spec['reviewedPages'] == [17, 18, 19, 20, 21, 22, 24, 25, 26, 43] and inv['reviewedPages'] == [20, 24] and spec['wholeHistoricalAmendmentReconciliation'] == 'pending', 'Specification scope drift')
    points = {p['id']: p for p in inv['points']}
    require(set(points) == {'4HB1:issue2:' + ref for ref in ['5.1', '5.5', '5.7', '10.1']} and len(inv['points']) == 4, 'Selected identity scope changed')
    q2_inventory = read(Q2_INVENTORY)
    require(q2_inventory['specificationDocumentId'] == spec['documentId'] and q2_inventory['specificationSha256'] == spec['sha256'] and q2_inventory['reviewedPages'] == [21, 26], 'Q2 specification source drift')
    require([p['id'] for p in q2_inventory['points']] == ['4HB1:issue2:6.12', '4HB1:issue2:12.5'], 'Q2 identity scope changed')
    points.update({p['id']: p for p in q2_inventory['points']})
    q3_inventory = read(Q3_INVENTORY)
    cells = read(CELLS)
    require(q3_inventory['specificationDocumentId'] == spec['documentId'] and q3_inventory['specificationSha256'] == spec['sha256'] and q3_inventory['reviewedPages'] == [25], 'Q3 specification source drift')
    require([p['id'] for p in q3_inventory['points']] == ['4HB1:issue2:' + r for r in ['11.13', '11.14', '11.20', '11.21']], 'Q3 identity scope changed')
    require(cells['specificationDocumentId'] == spec['documentId'] and cells['specificationSha256'] == spec['sha256'], 'Existing cell inventory source mismatch')
    points.update({p['id']: p for p in q3_inventory['points']})
    points.update({p['id']: p for p in cells['points'] if p['reference'] in ['1.2', '1.3']})
    q4_inventory = read(Q4_INVENTORY)
    molecules = read(MOLECULES)
    require(q4_inventory['specificationDocumentId'] == spec['documentId'] and q4_inventory['specificationSha256'] == spec['sha256'] and q4_inventory['reviewedPages'] == [22] and [p['reference'] for p in q4_inventory['points']] == ['7.1', '7.2', '7.5', '7.6', '8.5', '8.12'], 'Q4 own source/identity drift')
    require(molecules['specificationDocumentId'] == spec['documentId'] and molecules['specificationSha256'] == spec['sha256'], 'Existing enzyme inventory source mismatch')
    points.update({p['id']: p for p in q4_inventory['points']})
    points.update({p['id']: p for p in molecules['points'] if p['reference'] in ['2.7', '2.8']})
    skills = read(SKILLS)
    require(skills['qualification'] == '4HB1' and skills['specificationDocumentId'] == spec['documentId'] and skills['specificationSha256'] == spec['sha256'] and skills['reviewedPages'] == [43] and skills['humanReviewed'] is False, 'Selected skills source mismatch')
    require([s['id'] for s in skills['skills']] == ['4HB1:issue2:mathematical:2C', '4HB1:issue2:mathematical:4A'] and all(s['pdfPage'] == 43 and s['appliesToHumanBiology'] is True for s in skills['skills']), 'Selected skills identity/scope mismatch')
    tasks = m['tasks']
    require(len(tasks) == 24 and {t['questionPath'] for t in tasks} == set(EXPECTED) and len({t['taskId'] for t in tasks}) == 24, 'Missing/duplicate Q1–Q5 parts')
    require(sum(t['originalMarks'] for t in tasks) == 51, 'Subset mark sum mismatch')
    for t in tasks:
        marks, pages = EXPECTED[t['questionPath']]
        scheme_page = {'1': 4, '2': 5, '3': 6, '4': 7, '5': 8}[t['questionPath'].split('.')[0]]
        require(t['taskId'] == PAPER + '.Q' + t['questionPath'] and t['paperId'] == PAPER and t['recordKind'] == 'leaf', 'Task identity mismatch')
        require(type(t['originalMarks']) is int and t['originalMarks'] == marks and t['questionPaperPages'] == pages and t['markSchemePages'] == [scheme_page] and t['generalSchemePages'] == [3], 'Task marks/page drift')
        require(t['assessmentObjectives'] == [] and t['templateLinkStatus'] == 'candidate-only' and t['extractionStatus'] == 'source-checked' and t['humanReviewed'] is False and t['reviewerType'] == 'agent', 'Unreviewed AO/template/human promotion')
        require(t['requiredKnowledge'] and t['contextSummary'] and t['solutionStructure'] and t['blockers'], 'Missing detailed review content/gates')
        require(rubric_maximum(t) == marks and t['scoringRule']['sourceRef'] == dict(documentId=ms['id'], pdfPages=[scheme_page]), 'Rubric capacity/source mismatch')
        capped = t['questionPath'] in ['1.b.ii', '3.c', '4.b.ii', '5.a.i']
        method = {'1.b.ii': 'capped-discrete-points', '3.c': 'capped-discrete-points', '4.b.ii': 'capped-discrete-points', '5.a.i': 'capped-discrete-points', '4.a.i': 'drawing-discrete-points', '2.a.i': 'drawing-discrete-points', '2.b': 'ordered-gap-points'}.get(t['questionPath'], 'discrete-points')
        require(t['scoringRule']['mode'] == ('any-distinct' if capped else 'all-distinct') and t['markingMethod'] == method and len(t['criteria']) == ({'1.b.ii': 3, '3.c': 5, '4.b.ii': 6, '5.a.i': 6}.get(t['questionPath'], marks)), 'Distinct point/method policy drift')
        expected_stimulus = {'1.b.iii': [3, 4], '2.a.ii': [6, 7], '3.b.ii': [8, 9], '4.a.ii': [10, 11], '5.a.ii': [12, 13]}.get(t['questionPath'], pages)
        require(t['stimulusRefs'] == [dict(documentId=qp['id'], pdfPages=expected_stimulus)] and t['stimulusTypes'], 'Missing shared diagram/method evidence')
        require(t['syllabusMappings'], 'Missing mapping evidence')
        for mapping in t['syllabusMappings']:
            p = points.get(mapping['pointId'])
            require(p and p['statementVerified'] is True and p['humanReviewed'] is False, 'Missing verified own identity')
            if p['reference'] not in ['1.2', '1.3', '2.7', '2.8', '11.13', '11.14', '11.20', '11.21']:
                require(p['teachingCoverage'] == 'not-started' and p['noteSectionIds'] == [], 'Selected identities must not invent teaching')
            require(mapping['currentApplicability'] == 'current-specification' and mapping['reviewStatus'] == 'agent-reviewed', 'Unreviewed mapping status')
            require(mapping['evidenceRefs'] == [dict(documentId=spec['documentId'], pdfPages=[p['pdfPage']]), dict(documentId=ms['id'], pdfPages=[scheme_page]), dict(documentId=qp['id'], pdfPages=pages)], 'Exact mapping source mismatch')
            if t['questionPath'] in ['1.c.i', '1.c.ii']:
                require(mapping['pointId'] == '4HB1:issue2:5.7' and mapping['kind'] == 'supporting', 'Do not claim full prescribed practical coverage')
        if t['questionPath'] == '2.a.i':
            require(t['sourceData']['categories'] == ['refrigeration', 'freezing', 'pasteurisation', 'vacuum-packed food'] and t['sourceData']['values'] == [5, 90, 35, 14] and t['sourceData']['units'] == 'days', 'Source chart data drift')
            graph = t['graphScoring']; concession = graph['sourceConcession']
            require(graph['requestedGraphType'] == 'bar-chart' and graph['calibrationStatus'] == 'drawing-recognition-and-tolerances-pending', 'No graph recognition promotion')
            require(concession == dict(responseType='line-graph', eligibleCriterionIds=[c['id'] for c in t['criteria'][:3]], maximum=3, excludedCriterionIds=[t['criteria'][3]['id']], sourceRef=dict(documentId=ms['id'], pdfPages=[5])), 'Source line-graph concession drift')
            require([r['skillId'] for r in t['skillMappings']] == [s['id'] for s in skills['skills']], 'Skill mapping mismatch')
            require(skills['taskMappings'] == [dict(taskId=t['taskId'], skillIds=[s['id'] for s in skills['skills']], scope='required-operations-only', humanReviewed=False)], 'Selected skill task evidence mismatch')
            for mapping in t['skillMappings']:
                require(mapping['applicability'] == 'required' and mapping['evidenceRefs'] == [dict(documentId=spec['documentId'], pdfPages=[43]), dict(documentId=qp['id'], pdfPages=[6]), dict(documentId=ms['id'], pdfPages=[5])], 'Exact skill evidence mismatch')
            require(t['syllabusMappings'][0]['pointId'] == '4HB1:issue2:6.12' and t['syllabusMappings'][0]['kind'] == 'supporting', 'Chart context cannot become primary content mapping')
        if t['questionPath'] == '2.b':
            gap = t['orderedGapRubric']
            require(gap['answers'] == ['lag', 'exponential', 'equal to', 'death', 'less than', 'dying'] and gap['positions'] == list(range(1, 7)) and gap['marksPerPosition'] == [1] * 6 and gap['sourceRef'] == dict(documentId=ms['id'], pdfPages=[5]), 'Source gap order/marks drift')
            require(len(gap['wordBank']) == len(set(gap['wordBank'])) == 10 and set(gap['answers']) <= set(gap['wordBank']), 'Invalid source word bank')
        if t['questionPath'].startswith('3.'):
            own = {'3.a.i': ('1.2', 'supporting'), '3.a.ii': ('11.13', 'primary'), '3.a.iii': ('11.21', 'primary'), '3.b.i': ('11.14', 'primary'), '3.b.ii': ('11.20', 'primary'), '3.c': ('1.3', 'primary')}[t['questionPath']]
            require([(r['pointId'], r['kind']) for r in t['syllabusMappings']] == [('4HB1:issue2:' + own[0], own[1])], 'Q3 demand mapping drift')
        if t['questionPath'] == '3.b.i':
            q = t['sourceQualification']
            require(q['publishedAlternative'] == 'carrier' and q['generatedUse'] == 'blocked-until-source-concession-policy-reviewed' and q['sourceRef'] == dict(documentId=ms['id'], pdfPages=[6]) and q['scientificQualification'], 'Dominant carrier concession drift')
        if t['questionPath'] == '3.b.ii':
            model = t['sourcePedigreeModel']
            require(model['parents'] == [dict(label='R', sex='female', genotype='Pp', affected=True), dict(label='S', sex='male', genotype='pp', affected=False)] and model['choices'] == [dict(label='W', motherAffected=True, fatherAffected=True, daughterAffected=True), dict(label='X', motherAffected=False, fatherAffected=True, daughterAffected=True), dict(label='Y', motherAffected=True, fatherAffected=False, daughterAffected=False)] and model['answer'] == 'Y' and model['daughterProbabilityClaim'] == 'none-the-question-only-selects-a-source-diagram', 'Source pedigree model drift')
        if t['questionPath'] == '3.c':
            discrepancy = t['sourceDiscrepancy']
            require(discrepancy['id'] == index['sourceDiscrepancies'][0]['id'] and discrepancy['publishedAmbiguousAlternative'] == 'each strand held together by hydrogen bonds' and discrepancy['publishedUnambiguousAlternative'] == 'bases linked by hydrogen bonds' and discrepancy['generatedUse'] == 'blocked-until-authoritative-clarification' and discrepancy['authoritativeCurrentSpecRef'] == dict(documentId=spec['documentId'], pdfPages=[17]), 'DNA ambiguity/activation drift')
            require(t['criteria'][3]['sourceWordingStatus'] == 'ambiguous-alternative-retained-no-generated-use', 'DNA criterion scope drift')
        if t['questionPath'].split('.')[0] in ['4', '5']:
            expected = {'4.a.i': [('7.2', 'primary')], '4.a.ii': [('7.2', 'supporting')], '4.b.i': [('8.5', 'supporting')], '4.b.ii': [('7.1', 'primary'), ('7.5', 'supporting'), ('7.6', 'supporting'), ('8.12', 'supporting')], '5.a.i': [('2.8', 'primary')], '5.a.ii': [('2.8', 'supporting')], '5.b': [('2.7', 'primary')]}[t['questionPath']]
            require([(r['pointId'], r['kind']) for r in t['syllabusMappings']] == [('4HB1:issue2:' + ref, kind) for ref, kind in expected], 'Q4/Q5 demand mapping drift')
        if t['questionPath'] == '4.a.i':
            topology = t['apparatusTopology']
            require(topology['leftVessel'] == dict(externalTube='long-submerged', mouthpieceTube='short-above-indicator') and topology['rightVessel'] == dict(mouthpieceTube='long-submerged', externalTube='short-above-indicator') and topology['recognitionStatus'] == 'not-implemented' and topology['safetyStatus'] == 'historical-exam-drawing-not-a-runnable-practical-protocol' and topology['sourceRef'] == dict(documentId=ms['id'], pdfPages=[7]), 'Apparatus topology/readiness drift')
        if t['questionPath'].startswith('4.b.'):
            require(t['sourceData'] == dict(conditions=['at rest', 'after gentle exercise', 'after vigorous exercise'], meanBreathingRates=[14, 19, 50], units='breaths per minute', repeatsPerExercise=3), 'Exercise source data drift')
        if t['questionPath'] == '4.b.i':
            require(t['controlScope']['pace'] == 'Same pace for repeats within each given condition, not the same intensity across gentle and vigorous conditions.' and t['controlScope']['sourceRef'] == dict(documentId=ms['id'], pdfPages=[7]), 'Within-condition control drift')
        if t['questionPath'] == '4.b.ii':
            require(t['sourceIgnoredEvidence'] == ['References to carbon dioxide'], 'Ignored source evidence drift')
        if t['questionPath'].startswith('5.a.'):
            graph = t['sourceGraph']
            require(graph['axes'] == ['Temperature', 'Enzyme activity'] and graph['numericScaleProvided'] is False and graph['optimumTemperatureValue'] is None and graph['sourceRef'] == dict(documentId=qp['id'], pdfPages=[12]) and graph['attributionAccessStatus'] == 'not-accessed-not-used-as-independent-authority', 'Do not invent numeric graph values or third-party access')
        if t['questionPath'] == '5.a.i':
            require(t['sourceRejectedEvidence'] == ['Unqualified amount for the volume/concentration control point'] and t['methodScope']['criteriaCount'] == 6 and t['methodScope']['distinctCap'] == 5 and t['methodScope']['endpointCalibration'].startswith('Pending:') and t['methodScope']['sourceRef'] == dict(documentId=ms['id'], pdfPages=[8]), 'Method source cap/rejection/calibration drift')
    require(m['blockers'] and m['processingNotes'], 'Missing paper processing gaps')

    date = m['reviewDate']
    common = dict(reviewed_by=m['reviewer'], reviewer_type='agent', human_reviewed='false', batch_id='human-detailed-' + date, updated_at=date)
    documents = []
    for key, doc in [('questionPaper', qp), ('markScheme', ms)]:
        pages = index[key + 'VisualPages']
        documents.append(dict(document_id=doc['id'], qualification='4HB1', document_type=doc['type'], canonical_url=doc['url'], title='4HB1/01 Summer 2024 ' + doc['type'], publisher='Pearson', year=2024, series=identity['series'], component='01', variant='unresolved', printed_exam_date=identity['printedDate'] if key == 'questionPaper' else '', filename_date=identity['filenameDate'] if key == 'questionPaper' else '', sha256=doc['sha256'], page_count=doc['pageCount'], access_status='obtained', local_evidence_path=OVERLAY, reviewed_pages_json=compact([dict(page=p, mode='visual', reviewer=m['reviewer'] if p != 1 else 'Codex cover visual review', date=date if p != 1 else '2026-09-09') for p in pages]), identity_status='agent-reviewed', identity_notes='Original legacy ID retained; printed date differs from filename. Variant remains unresolved. Full structural inventory matched by paper log; only Q1–Q5 detailed.', batch_id=common['batch_id'], updated_at=date))
    papers = [dict(paper_id=PAPER, qualification='4HB1', year=2024, series=identity['series'], component='01', variant='unresolved', qp_document_id=qp['id'], ms_document_id=ms['id'], insert_document_ids_json='[]', examiner_report_ids_json='[]', report_status=m['examinerReportStatus'], target_specification_id=spec['documentId'], applicability_status='partial-current-scope-review', stage='indexed', last_successful_stage='indexed', expected_leaf_tasks=42, indexed_leaf_tasks=42, extracted_leaf_tasks=24, assessed_marks=90, all_alternatives_marks=90, option_rules_json=compact(dict(mode='all-compulsory', sourcePages=[1])), reconciled_marks='true', scheme_match_status='matched-visual-inventory-Q1-Q5-detailed', complete_page_audit='true', template_links_complete='false', blocking_issues_json=compact(m['blockers']), reviewed_at=date, **common)]
    task_rows, mappings = [], []
    for t in tasks:
        task_rows.append(dict(task_id=t['taskId'], paper_id=PAPER, question_path=t['questionPath'], record_kind='leaf', qp_pages_json=compact(t['questionPaperPages']), stimulus_refs_json=compact(t['stimulusRefs']), scheme_pages_json=compact(t['markSchemePages']), command_word=t['commandWord'], original_marks=t['originalMarks'], assessment_objectives_json='[]', required_knowledge='; '.join(t['requiredKnowledge']), context_summary=t['contextSummary'], stimulus_types_json=compact(t['stimulusTypes']), solution_structure_json=compact(t['solutionStructure']), marking_method=t['markingMethod'], rubric_ref=OVERLAY + '#' + t['taskId'], acceptable_alternatives_json=compact(t['acceptableAlternatives']), dependencies_json=compact(t['dependencies']), common_errors_json=compact(t['commonErrors']), report_refs_json='[]', extraction_status='source-checked', mapping_status='agent-reviewed-partial-current-scope', review_status='agent-reviewed', blocker='; '.join(t['blockers']), **common))
        for mapping in t['syllabusMappings']:
            mappings.append(dict(mapping_id=t['taskId'] + ':' + mapping['pointId'], task_id=t['taskId'], point_id=mapping['pointId'], mapping_kind=mapping['kind'], current_applicability=mapping['currentApplicability'], evidence_refs_json=compact(mapping['evidenceRefs']), rationale=mapping['rationale'], review_status='agent-reviewed', reviewed_by=m['reviewer'], reviewer_type='agent', updated_at=date))
    detailed_ids = {t['taskId'] for t in tasks}
    for leaf in leaves:
        if leaf['taskId'] in detailed_ids:
            detailed = next(t for t in tasks if t['taskId'] == leaf['taskId'])
            require(all(leaf[k] == detailed[k] for k in ['originalMarks', 'questionPaperPages', 'markSchemePages', 'stimulusRefs', 'commandWord', 'contextSummary']), 'Detailed/index record disagreement')
            continue
        task_rows.append(dict(task_id=leaf['taskId'], paper_id=PAPER, question_path=leaf['questionPath'], record_kind='leaf', qp_pages_json=compact(leaf['questionPaperPages']), stimulus_refs_json=compact(leaf['stimulusRefs']), scheme_pages_json=compact(leaf['markSchemePages']), command_word=leaf['commandWord'], original_marks=leaf['originalMarks'], assessment_objectives_json='[]', required_knowledge='', context_summary=leaf['contextSummary'], stimulus_types_json='[]', solution_structure_json='[]', marking_method='', rubric_ref='', acceptable_alternatives_json='[]', dependencies_json='[]', common_errors_json='[]', report_refs_json='[]', extraction_status='indexed-only', mapping_status='not-started', review_status='agent-reviewed-structural-only', blocker='Detailed extraction, rubric and syllabus/skill/AO mapping pending; not a processed task.', **common))
    outputs = {}
    for name, key, incoming in [('documents', 'document_id', documents), ('papers', 'paper_id', papers), ('tasks', 'task_id', task_rows), ('task-mappings', 'mapping_id', mappings)]:
        path = root / 'research/ledger/v1' / (name + '.csv')
        with path.open(newline='') as stream:
            reader = csv.DictReader(stream)
            fields, rows = reader.fieldnames, list(reader)
        require(fields and len({r[key] for r in rows}) == len(rows), 'Duplicate existing table IDs')
        saved = {r[key]: r for r in rows}
        owned = {r[key] for r in rows if r.get('paper_id') == PAPER or r.get('task_id', '').startswith(PAPER + '.Q') or r.get('document_id', '').startswith(PAPER + ':')}
        require(owned <= {r[key] for r in incoming}, 'Refusing stale owned rows')
        for record in incoming:
            require(not set(record) - set(fields), 'Unknown output columns')
            saved[record[key]] = {field: record.get(field, '') for field in fields}
        stream = io.StringIO(newline='')
        writer = csv.DictWriter(stream, fields, lineterminator='\n')
        writer.writeheader()
        writer.writerows(saved.values())
        outputs[path] = stream.getvalue()
    return outputs


def export(root=ROOT):
    outputs = prepare(root)
    for path, content in outputs.items():
        path.write_text(content)
    return dict(indexedTasks=42, indexedMarks=90, detailedTasks=24, detailedMarks=51, fullyProcessedPapers=0, activeTemplates=0)


if __name__ == '__main__':
    print(compact(export()))
