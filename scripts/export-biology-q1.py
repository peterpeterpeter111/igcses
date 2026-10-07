"""Normalize the checked Biology Q1–Q6 subset (twenty-nine parts / 65 marks).

Validation and table preparation precede every write. The whole visual index
is separate from detailed rubric coverage; raw history and source gates remain.
This validates source records, not free-text or drawing responses.
"""
import csv
import hashlib
import io
import json
from pathlib import Path
from ledger_io import read_table, table_outputs

ROOT = Path(__file__).resolve().parents[1]
PAPER = '4BI1-2024-June-1-standard'
OVERLAY = 'research/extractions/' + PAPER + '.json'
SKILLS = 'research/syllabus-skills/4BI1-issue3-q1-selected.json'
INDEX = 'research/paper-indexes/4BI1-2024-summer-1b.json'
EXPECTED = {
    '1.a.i': (1, [3], [4], [('4.6', 'primary')]),
    '1.a.ii': (2, [3], [4], [('4.7', 'primary'), ('4.6', 'supporting')]),
    '1.a.iii': (1, [3], [4], [('4.6', 'primary'), ('4.7', 'supporting')]),
    '1.b.i': (2, [4], [4], []),
    '1.b.ii': (4, [5], [5], [('2.25', 'supporting')]),
    '1.b.iii': (2, [5], [6], [('1.4', 'supporting')]),
    '2.a.i': (1, [6], [7], [('3.3', 'primary')]),
    '2.a.ii': (1, [6], [7], [('3.3', 'primary')]),
    '2.a.iii': (1, [6], [7], [('3.3', 'primary')]),
    '2.b': (3, [7], [8], [('3.3', 'primary')]),
    '2.c.i': (1, [7], [8], [('3.7', 'primary')]),
    '2.c.ii': (1, [7], [8], [('3.7', 'primary')]),
    '2.d': (3, [7], [9], [('3.1', 'primary'), ('3.2', 'supporting')]),
    '2.e': (3, [8], [9], [('5.10', 'primary')]),
    '3': (7, [9], [10], [('5.7', 'primary')]),
    '4.a': (2, [10], [10], [('2.37', 'primary')]),
    '4.b.i': (2, [10], [10], [('2.37', 'supporting')]),
    '4.b.ii': (1, [11], [11], []),
    '4.c.i': (2, [11], [11], []),
    '4.c.ii': (3, [11], [11], [('2.11', 'primary'), ('2.37', 'supporting')]),
    '5.a.i': (1, [13], [12], [('4.13', 'primary')]),
    '5.a.ii': (2, [13], [12], [('4.15', 'supporting')]),
    '5.b.i': (3, [14], [12], []),
    '5.b.ii': (5, [15], [13], [('4.14', 'primary')]),
    '6.a.i': (1, [17], [14], [('2.19', 'primary')]),
    '6.a.ii': (1, [17], [14], [('2.3', 'primary')]),
    '6.a.iii': (1, [17], [14], [('2.23', 'supporting')]),
    '6.b.i': (5, [18], [15], [('2.23', 'supporting')]),
    '6.b.ii': (3, [19], [15], [('2.20', 'primary')]),
}
INDEX_REMAINING = {
    '7.a': (3, [21], [16]), '7.b.i': (3, [22], [16]),
    '7.b.ii': (2, [22], [16]), '7.b.iii': (5, [23], [17]),
    '8.a': (1, [24], [18]), '8.b.i': (3, [24], [18]),
    '8.b.ii': (3, [25], [18]), '8.c.i': (3, [25], [19]), '8.c.ii': (2, [25], [19]),
    '9.a.i': (2, [26], [20]), '9.a.ii': (2, [27], [20]),
    '9.a.iii': (2, [27], [21]), '9.a.iv': (1, [27], [21]),
    '9.b.i': (1, [28], [21]), '9.b.ii': (6, [29], [22]), '10': (6, [30], [23]),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def prepare(root=ROOT, overlay=None, index_overlay=None):
    root = Path(root)
    def read(path):
        return json.loads((root / path).read_text())
    m = read(OVERLAY) if overlay is None else overlay
    require(m['paperId'] == PAPER and m['qualification'] == '4BI1', 'Wrong bounded paper')
    require(m['paperStage'] == 'indexed' and m['status'] == 'partial-detailed-extraction'
            and m['fullyProcessed'] is False and m['humanReviewed'] is False
            and m['marksReconciled'] is False and m['wholePaperLeafCount'] == 45,
            'Partial subset must not promote full processing or human review, or alter the checked denominator')
    require(m['wholePaperMarks'] == 110 and m['detailedLeafTasks'] == 29
            and m['detailedOriginalMarks'] == 65 and m['reviewedQuestionTotals'] == {'1': 12, '2': 14, '3': 7, '4': 10, '5': 11, '6': 11}
            and m['reviewedSubsetMarksReconciled'] is True, 'Subset totals mismatch')
    require(m['rawManifestRef'] == 'research/batches/2026-09-08-cross-subject-lower-01.manifest.json'
            and m['coverReviewRef'] == 'research/reviews/2026-09-09-cover-review.json', 'Unexpected source authority')
    for key in ['rawManifest', 'coverReview']:
        require(hashlib.sha256((root / m[key + 'Ref']).read_bytes()).hexdigest() == m[key + 'Sha256'], 'Historical source bytes changed')
    raw = next(r for r in read(m['rawManifestRef'])['records'] if r['paperId'] == PAPER)
    cover = next(r for r in read(m['coverReviewRef'])['records'] if r['paperId'] == PAPER)
    require(raw['processingStatus'] == 'indexed-only' and raw['extractedTaskCount'] == 0
            and raw['fullyProcessed'] is False and cover['filenameDateConflict'] is True, 'Raw history promotion')
    require(m['canonicalIdentity'] == dict(year=2024, series='June', component='1B', variant='unresolved', printedDate='2024-05-10', filenameDate='2024-05-11', legacyPaperIdPreserved=True)
            and cover['maximumMarks'] == 110 and cover['observedComponent'] == '1B'
            and cover['printedDate'] == '2024-05-10' and cover['canonicalSeries'] == 'June', 'Cover/date/variant drift')
    docs = {d['type']: d for d in m['documents']}
    require(set(docs) == {'question-paper', 'mark-scheme'} and len(m['documents']) == 2, 'Expected one pair')
    qp, ms = docs['question-paper'], docs['mark-scheme']
    for key, doc, count, pages in [('questionPaper', qp, 32, list(range(1, 33))), ('markScheme', ms, 24, list(range(1, 25)))]:
        r, a = raw[key], m['pageAudit'][key]
        require(doc['id'] == PAPER + ':' + key and doc['sha256'] == r['sha256'] == cover[key + 'Sha256']
                and doc['url'] == r['url'] and doc['pageCount'] == r['pageCount'] == count, 'Document/hash mismatch')
        require(a == dict(visuallyReviewedPages=pages, wholeDocumentReviewed=True), 'Whole visual page audit drift')
    require(m['wholePaperIndexRef'] == INDEX, 'Unexpected structural index')
    index = read(INDEX) if index_overlay is None else index_overlay
    require(index['paperId'] == PAPER and index['qualification'] == '4BI1'
            and index['indexedLeafCount'] == 45 and index['indexedOriginalMarks'] == 110
            and index['questionCount'] == 10 and index['allCompulsory'] is True
            and index['fullyProcessed'] is False and index['humanReviewed'] is False
            and index['questionPaperSha256'] == qp['sha256'] and index['markSchemeSha256'] == ms['sha256']
            and index['visualPageAuditComplete'] is True
            and index['questionPaperVisualPages'] == list(range(1, 33))
            and index['markSchemeVisualPages'] == list(range(1, 25)), 'Unbound or promoted structural index')
    indexed = index['tasks']
    require(len(indexed) == len({t['taskId'] for t in indexed}) == 45
            and [t['questionPath'] for t in indexed] == list(EXPECTED) + list(INDEX_REMAINING)
            and sum(t['originalMarks'] for t in indexed) == 110
            and [r['parts'] for r in index['questionTotals']] == [6, 8, 1, 5, 4, 5, 4, 5, 6, 1]
            and [r['marks'] for r in index['questionTotals']] == [12, 14, 7, 10, 11, 11, 13, 12, 14, 6], 'Structural allocation mismatch')
    for q in index['questionTotals']:
        subset = [t for t in indexed if t['questionPath'].split('.')[0] == str(q['question'])]
        require(len(subset) == q['parts'] and sum(t['originalMarks'] for t in subset) == q['marks'], 'Indexed question total mismatch')
    for t in indexed:
        require(t['taskId'] == PAPER + '.Q' + t['questionPath'] and t['paperId'] == PAPER
                and t['recordKind'] == 'leaf' and type(t['originalMarks']) is int
                and t['inventoryStatus'] == 'visual-structure-checked'
                and not any(k in t for k in ['criteria', 'syllabusMappings', 'solutionStructure', 'numericScoring']), 'Index ownership or rubric disclosure')
        if t['questionPath'] in EXPECTED:
            marks, pages, scheme_pages, _ = EXPECTED[t['questionPath']]
            require((t['originalMarks'], t['questionPaperPages'], t['markSchemePages']) == (marks, pages, scheme_pages)
                    and t['detailedExtractionStatus'] == 'source-checked-subset', 'Detailed/indexed subset drift')
        else:
            require(t['detailedExtractionStatus'] == 'pending'
                    and (t['originalMarks'], t['questionPaperPages'], t['markSchemePages']) == INDEX_REMAINING[t['questionPath']],
                    'Remaining task promoted or source allocation altered')
    require(index['paperMatch'] == dict(questionPaperLog='P75813A', schemePaperLog='P75813A',
            schemePublicationCode='4BI1_1B_2406_MS', questionPaperEvidencePages=[1], schemeEvidencePages=[1, 2],
            printedDate='2024-05-10', filenameDate='2024-05-11', dateConflictPreserved=True, variant='unresolved')
            and index['blankQuestionPaperPages'] == [12, 16, 20, 31, 32]
            and index['nonTaskSchemePages'] == [1, 2, 3, 24], 'Whole-paper identity or non-task allocation drift')
    source = next(s for s in read('research/sources.json') if s['id'] == '4BI1-spec')
    spec = m['currentSpecification']
    require(spec == dict(documentId=source['id'], sha256=source['sha256'], issue='3', reviewedPages=[18, 19, 20, 21, 22, 26, 29, 30, 31, 49], wholeHistoricalAmendmentReconciliation='pending'), 'Specification scope drift')
    skills = read(SKILLS)
    require(skills['specificationDocumentId'] == spec['documentId'] and skills['specificationSha256'] == spec['sha256']
            and skills['humanReviewed'] is False and skills['reviewedPages'] == [49]
            and [(s['id'], s['pdfPage'], s['appliesToBiology']) for s in skills['skills']]
            == [('4BI1:issue3:mathematical:' + i, 49, True) for i in ['1A', '1C', '3C', '2A', '2B', '4A', '4C']], 'Selected mathematical skill scope drift')
    points = {p['point_id']: p for p in read_table(root / 'research/ledger/v1', 'syllabus-points')[1]}
    tasks = m['tasks']
    require(len(tasks) == len(EXPECTED) and len({t['taskId'] for t in tasks}) == 29
            and [t['questionPath'] for t in tasks] == list(EXPECTED), 'Missing, duplicate or unexpected tasks')
    for t in tasks:
        marks, pages, scheme_pages, mappings = EXPECTED[t['questionPath']]
        tid = PAPER + '.Q' + t['questionPath']
        require(t['paperId'] == PAPER and t['taskId'] == tid and t['recordKind'] == 'leaf'
                and type(t['originalMarks']) is int and t['originalMarks'] == marks
                and t['questionPaperPages'] == pages and t['markSchemePages'] == scheme_pages
                and t['generalSchemePages'] == [3], 'Task allocation/page mismatch')
        require(t['extractionStatus'] == 'source-checked' and t['humanReviewed'] is False
                and t['reviewerType'] == 'agent' and t['reviewDate'] == m['reviewDate']
                and t['templateLinkStatus'] == 'candidate-only' and t['assessmentObjectives'] == []
                and t['blockers'], 'Task must retain pending recognition/AO/activation gates')
        require(t['commandWord'] and t['requiredKnowledge'] and t['contextSummary'] and t['solutionStructure'], 'Missing detailed fields')
        stimulus_pages = [2, 3] if t['questionPath'].startswith('1.a.') else [4, 5] if t['questionPath'] in ['1.b.ii', '1.b.iii'] else pages
        if t['questionPath'] == '2.b':
            stimulus_pages = [6, 7]
        if t['questionPath'] in ['4.b.ii', '4.c.ii']:
            stimulus_pages = [10, 11]
        if t['questionPath'] == '5.b.ii':
            stimulus_pages = [14, 15]
        if t['questionPath'] == '6.b.ii':
            stimulus_pages = [17, 18, 19]
        require(t['stimulusRefs'] == [dict(documentId=qp['id'], pdfPages=stimulus_pages)], 'Stimulus page mismatch')
        ids = [c['id'] for c in t['criteria']]
        rule = t['scoringRule']
        require(ids == [tid + ':point-' + str(i + 1) for i in range(len(ids))]
                and all(c['rule'] and type(c['marks']) is int for c in t['criteria'])
                and rule['eligibleCriterionIds'] == ids and rule['maximum'] == marks
                and rule['recognitionStatus'] == 'not-implemented'
                and rule['sourceRef'] == dict(documentId=ms['id'], pdfPages=scheme_pages), 'Rubric identity/cap/authority mismatch')
        require([(r['pointId'], r['kind']) for r in t['syllabusMappings']] == [('4BI1:issue3:' + p, k) for p, k in mappings], 'Mapping scope drift')
        for mapping in t['syllabusMappings']:
            point = points[mapping['pointId']]
            require(point['qualification'] == '4BI1' and point['specification_document_id'] == spec['documentId']
                    and '1B' in json.loads(point['applicable_components_json'])
                    and mapping['evidenceRefs'] == [dict(documentId=spec['documentId'], pdfPages=[int(point['pdf_page'])]), dict(documentId=qp['id'], pdfPages=pages), dict(documentId=ms['id'], pdfPages=scheme_pages)]
                    and mapping['rationale'] and mapping['reviewStatus'] == 'agent-reviewed'
                    and mapping['currentApplicability'] == 'current-specification', 'Ungrounded current-scope mapping')
    by_path = {t['questionPath']: t for t in tasks}
    for path, answer, options in [('1.a.i', 'C', ['beetle', 'deer', 'oak tree', 'tick']), ('1.a.iii', 'D', ['ant', 'blue jay', 'caterpillar', 'mouse'])]:
        t = by_path[path]
        require(t['scoringRule']['mode'] == t['markingMethod'] == 'single-choice'
                and t['scoringRule']['answerLabel'] == answer and [c['marks'] for c in t['criteria']] == [1]
                and t['sourceChoices'] == [dict(label=a, organism=b) for a, b in zip('ABCD', options)], 'MCQ source choices/answer drift')
    t = by_path['1.a.ii']; c = t['sourceChain']
    require(c == dict(nodes=['oak tree', 'caterpillar', 'mouse', 'tick'], arrows='food-to-consumer', correctWholeChainMarks=2, correctOrderOnlyMarks=1, pyramidMarks=0, sourceRef=dict(documentId=ms['id'], pdfPages=[4]))
            and [r['marks'] for r in t['criteria']] == [1, 1]
            and t['criteria'][1]['requiresCriterionIds'] == [t['criteria'][0]['id']]
            and t['scoringRule']['mode'] == t['markingMethod'] == 'ordered-chain', 'Chain order/direction dependency drift')
    edges = [['oak tree', 'deer'], ['oak tree', 'squirrel'], ['oak tree', 'mouse'], ['oak tree', 'caterpillar'], ['deer', 'tick'], ['squirrel', 'tick'], ['mouse', 'tick'], ['caterpillar', 'mouse'], ['caterpillar', 'beetle'], ['caterpillar', 'ant'], ['beetle', 'blue jay'], ['ant', 'blue jay']]
    web = m['sourceFoodWeb']
    require(web['edges'] == edges and len(set(web['nodes'])) == len(web['nodes']) == 9
            and {x for e in edges for x in e} == set(web['nodes'])
            and web['sourceRef'] == dict(documentId=qp['id'], pdfPages=[2]), 'Food-web topology/source drift')
    t = by_path['1.b.i']; n = t['numericScoring']; q = t['sourceQualification']
    require(n == dict(actualLengthMm=3.5, sourceImageLengthMm=104, finalRange=[29.0, 30.0], correctFinalAnswerAloneMaximum=2, partialMaximum=1, measurementAlternatives=[dict(unit='cm', range=[10.3, 10.5]), dict(unit='mm', range=[103, 105])], measurementRequiresUnits=True, publishedPartialDivisors=[3.5, 35], partialBranchesAreAlternatives=True, recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=[4]))
            and [c['marks'] for c in t['criteria']] == [0, 0]
            and t['scoringRule']['mode'] == t['markingMethod'] == 'final-answer-or-one-partial', 'Magnification source allocation drift')
    require(q['publishedDivisor'] == 35 and q['status'] == 'published-partial-credit-concession-not-a-correct-ratio'
            and q['generatedUse'] == 'blocked-until-partial-method-and-presentation-calibration'
            and q['sourceRef'] == dict(documentId=ms['id'], pdfPages=[4])
            and t['measurementPresentation']['webScaleValidated'] is False
            and t['measurementPresentation']['publicOriginalImage'] is False, 'No silent divisor or display-scale repair')
    require(t['mathematicalSkillIds'] == [s['id'] for s in skills['skills'][:3]], 'Magnification skills must remain separate from numbered mappings')
    t = by_path['1.b.ii']; p = t['pairScoring']
    require(p['maximumPairs'] == 2 and p['nameMarksPerPair'] == p['functionMarksPerPair'] == 1
            and p['functionRequiresMatchingCreditedName'] is True and p['functionAloneMarks'] == 0
            and p['twoCorrectNamesAloneMarks'] == 2 and p['duplicateNamesCreateNewPair'] is False
            and p['categoryNamingCaps'] == dict(vitamins=1, minerals=1)
            and p['ignoredEvidence'] == ['blood cells', 'platelets', 'oxygen', 'hormones', 'antibodies', 'enzymes']
            and p['recognitionStatus'] == 'not-implemented'
            and [c['marks'] for c in t['criteria']] == [1] * 4
            and t['scoringRule']['mode'] == t['markingMethod'] == 'two-matched-pairs', 'Dependent-pair/source-category rule drift')
    for child, parent in [(1, 0), (3, 2)]:
        require(t['criteria'][child]['requiresCriterionIds'] == [t['criteria'][parent]['id']], 'Function cannot earn independent marks')
    require(t['sourceQualification']['generatedUse'] == 'blocked-until-physiological-scope-review'
            and t['sourceQualification']['sourceRef'] == dict(documentId=ms['id'], pdfPages=[5])
            and p['sourceRef'] == dict(documentId=ms['id'], pdfPages=[5])
            and p['publishedExamples'] == [dict(substances=s, functions=f) for s, f in [
                (['glucose'], ['energy', 'respiration']),
                (['iron'], ['haemoglobin', 'red blood cells']),
                (['amino acids'], ['protein synthesis']),
                (['protein', 'named protein'], ['growth']),
                (['cholesterol', 'fatty acids', 'lipoproteins'], ['energy', 'insulation']),
                (['water'], ['hydration', 'transport', 'solvent']),
                (['vitamin C'], ['prevention of scurvy'])]], 'Published physiological qualifications lost')
    t = by_path['1.b.iii']; r = t['scoringRule']
    require(t['markingMethod'] == r['mode'] == 'any-distinct' and len(t['criteria']) == 3
            and [c['marks'] for c in t['criteria']] == [1] * 3 and r['maximum'] == r['selectionLimit'] == 2
            and r['creditPerCriterion'] == 1 and t['sourceConcession'] == dict(transferNeedsBitingReference=True, sourceRef=dict(documentId=ms['id'], pdfPages=[6])), 'Any-two cap/concession drift')
    flower = m['sourceFlower']
    require(flower['labels'] == dict(P='stigma', Q='style', R='petal', S='ovary', T='filament', U='anther')
            and flower['sourceRef'] == dict(documentId=qp['id'], pdfPages=[6]), 'Flower label/source drift')
    for path, answer, structure, options in [('2.a.i', 'B', 'Q', ['P', 'Q', 'S', 'T']), ('2.a.ii', 'D', 'U', ['P', 'R', 'T', 'U']), ('2.a.iii', 'A', 'P', ['P', 'R', 'S', 'U'])]:
        t = by_path[path]
        require(t['scoringRule']['mode'] == t['markingMethod'] == 'single-choice'
                and t['scoringRule']['answerLabel'] == answer and t['scoringRule']['structureLabel'] == structure
                and [c['marks'] for c in t['criteria']] == [1]
                and t['sourceChoices'] == [dict(label=a, structureLabel=b) for a, b in zip('ABCD', options)], 'Flower choice/answer drift')
    t = by_path['2.b']; p = t['labelledScoring']
    require(p == dict(labels=['P', 'R', 'T'], oneMarkPerLabel=True, maximum=3, publishedAlternatives=[
                dict(label='P', alternatives=['feathery', 'large surface area', 'outside flower', 'exposed']),
                dict(label='R', alternatives=['absent', 'smaller', 'not coloured', 'green']),
                dict(label='T', alternatives=['longer', 'hinged', 'outside flower', 'exposed'])], sourceRef=dict(documentId=ms['id'], pdfPages=[8]))
            and t['markingMethod'] == t['scoringRule']['mode'] == 'all-distinct'
            and [c['marks'] for c in t['criteria']] == [1] * 3
            and t['scoringRule']['selectionLimit'] == 3 and t['scoringRule']['creditPerCriterion'] == 1, 'One-mark-per-labelled-structure rule drift')
    for path, natural, methods in [('2.c.i', True, ['runners', 'bulbs', 'corms', 'tubers', 'rhizomes']), ('2.c.ii', False, ['cuttings', 'grafting', 'layering', 'tissue culture', 'micropropagation'])]:
        t = by_path[path]
        require(t['sourceMethodPolicy'] == dict(natural=natural, publishedAcceptedMethods=methods, rejectedBareTerms=[] if natural else ['cloning'], sourceRef=dict(documentId=ms['id'], pdfPages=[8]), recognitionStatus='not-implemented')
                and t['acceptableAlternatives'] == methods and [c['marks'] for c in t['criteria']] == [1]
                and t['markingMethod'] == t['scoringRule']['mode'] == 'one-of-alternatives', 'Plant-method source alternatives/rejection drift')
    for path in ['2.d', '2.e']:
        t = by_path[path]; r = t['scoringRule']
        require(t['markingMethod'] == r['mode'] == 'any-distinct' and r['maximum'] == r['selectionLimit'] == 3
                and r['creditPerCriterion'] == 1 and [c['marks'] for c in t['criteria']] == [1] * 4, 'Three-of-four source cap drift')
    t = by_path['2.d']
    require(t['sourceComparisonPolicy'] == dict(allowMultiplePointsInOneLine=True, ignoredEvidence=['number of parents'], publishedCellAlternative='one parent cell', publishedGameteFusionConcession=dict(description='Sexual reproduction involves fusion of gametes.', creditsCriterionIds=[t['criteria'][0]['id'], t['criteria'][1]['id']], distinctMarks=2), sourceRef=dict(documentId=ms['id'], pdfPages=[9]), recognitionStatus='not-implemented')
            and t['sourceQualification']['generatedUse'] == 'blocked-until-biological-scope-and-response-policy-review'
            and t['sourceQualification']['sourceRef'] == dict(documentId=ms['id'], pdfPages=[9]), 'Comparison coupled credit/context qualification drift')
    t = by_path['2.e']
    require(t['sourceTraitData'] == dict(varieties=[dict(flowerColour='red', scent=False), dict(flowerColour='white', scent=True)], desired=dict(flowerColour='red', scent=True), genotypesProvided=False, dominanceProvided=False, probabilityClaim=None, sourceRef=dict(documentId=qp['id'], pdfPages=[8]))
            and t['sourceBreedingPolicy'] == dict(ignoreGeneticModificationReferences=True, desiredCharacteristicsAloneCredit=False, unqualifiedCrossVarietiesAccepted=True, sourceRef=dict(documentId=ms['id'], pdfPages=[9]), recognitionStatus='not-implemented'), 'Do not invent traits, dominance, probabilities or trait-only credit')
    t = by_path['3']; gaps = t['gapScoring']
    require(gaps == dict(positions=list(range(1, 8)), acceptedByPosition=[['milk'], ['pasteurisation', 'sterilisation'], ['killed', 'dead', 'destroyed'], ['Lactobacillus', 'Streptococcus'], ['lactose'], ['anaerobic'], ['lactic acid', 'lactate']], marksPerPosition=[1] * 7, maximum=7, recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=[10]))
            and t['markingMethod'] == t['scoringRule']['mode'] == 'ordered-gaps'
            and [c['marks'] for c in t['criteria']] == [1] * 7
            and t['sourceData']['coolingRangeC'] == [40, 46]
            and t['sourceQualification']['generatedUse'] == 'blocked-until-process-scope-and-gap-calibration', 'Yoghurt ordered-position/source-process drift')
    t = by_path['4.a']
    require(t['equationScoring'] == dict(reactants=['C6H12O6', 'O2'], products=['CO2', 'H2O'], coefficients=[1, 6, 6, 6], balancedMarks=2, correctSymbolsUnbalancedMarks=1, wordEquationMarks=0, recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=[10]))
            and t['markingMethod'] == t['scoringRule']['mode'] == 'symbol-equation'
            and [c['marks'] for c in t['criteria']] == [1, 1]
            and t['criteria'][1]['requiresCriterionIds'] == [t['criteria'][0]['id']], 'Symbol equation partial credit drift')
    t = by_path['4.b.i']; rule = t['scoringRule']
    require(rule['mode'] == t['markingMethod'] == 'any-distinct' and len(t['criteria']) == 3
            and [c['marks'] for c in t['criteria']] == [1] * 3 and rule['maximum'] == rule['selectionLimit'] == 2
            and rule['creditPerCriterion'] == 1 and t['sourceRejectedEvidence'] == ['CO2 is merely present without production/release.']
            and t['sourceQualification']['generatedUse'] == 'blocked-until-apparatus-and-gas-balance-policy-review', 'CO2 production/measurement rule drift')
    t = by_path['4.b.ii']
    require(t['markingMethod'] == t['scoringRule']['mode'] == 'one-of-alternatives'
            and [c['marks'] for c in t['criteria']] == [1]
            and t['acceptableAlternatives'] == ['Water bath', 'Water-filled beaker with Bunsen heating described']
            and t['sourceRejectedEvidence'] == ['Bunsen alone']
            and t['practicalDemand']['officialNumberedMapping'] is None, 'Temperature technique cannot invent a numbered practical mapping')
    t = by_path['4.c.i']; n = t['meanScoring']
    require(n == dict(readingsMm=[22, 25, 24], sumMm=71, divisor=3, exactMean='71/3', fullCreditValue=24, fullCreditMarks=2, partialMaximum=1, partialBranches=['sum 71', 'division by 3', '23.7', '23.67', '23.6 recurring'], partialBranchesAreAlternatives=True, recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=[11]))
            and t['markingMethod'] == t['scoringRule']['mode'] == 'mean-final-or-one-partial'
            and [c['marks'] for c in t['criteria']] == [0, 0]
            and t['sourceQualification']['generatedUse'] == 'blocked-until-precision-policy-and-response-calibration', 'Mean precision/alternative partial credit drift')
    require(t['mathematicalSkillIds'] == ['4BI1:issue3:mathematical:2B', '4BI1:issue3:mathematical:2A']
            and skills['taskMappings'] == [dict(taskId=by_path[path]['taskId'], skillIds=by_path[path]['mathematicalSkillIds'], scope='required-operations-only', humanReviewed=False) for path in ['1.b.i', '4.c.i', '5.b.i', '6.b.i']], 'Selected mean/magnification skill mappings drift')
    t = by_path['4.c.ii']; rule = t['scoringRule']
    require(rule['mode'] == t['markingMethod'] == 'any-distinct' and [c['marks'] for c in t['criteria']] == [1] * 5
            and rule['maximum'] == rule['selectionLimit'] == 3 and rule['creditPerCriterion'] == 1
            and t['sourceRejectedEvidence'] == ['Energy of the bubble rather than molecules', 'Increased bubble movement alone']
            and t['sourceQualification']['generatedUse'] == 'blocked-until-observed-range-and-practical-calibration', 'Observed temperature explanation cap/rejections drift')
    experiment = dict(temperaturesC=[20, 30], seedMassG=10, repeatsPerTemperature=3, intervalMinutes=1, readingsMm=[[14, 12, 14], [22, 25, 24]], printedMeanAt20=13, sourceRef=dict(documentId=qp['id'], pdfPages=[10, 11]))
    require(all(t['sourceExperimentData'] == experiment for t in tasks if t['questionPath'].startswith('4.'))
            and m['sourceRespirometer']['sourceRef'] == dict(documentId=qp['id'], pdfPages=[10])
            and m['sourceRespirometer']['diagramCalibration'], 'Respirometer source data/calibration drift')

    t = by_path['5.a.i']
    require(t['sourceGasEntries'] == [dict(number=i, gas=g) for i, g in enumerate(['CFCs', 'methane', 'oxygen', 'water vapour'], 1)]
            and t['sourceChoices'] == [dict(label=a, entryNumbers=n) for a, n in zip('ABCD', [[1, 2], [1, 2, 3], [1, 2, 4], [1, 2, 3, 4]])]
            and t['markingMethod'] == t['scoringRule']['mode'] == 'single-choice'
            and t['scoringRule']['answerLabel'] == 'C' and [c['marks'] for c in t['criteria']] == [1], 'Greenhouse choice/entry drift')
    t = by_path['5.a.ii']
    require(t['markingMethod'] == t['scoringRule']['mode'] == 'all-distinct'
            and [c['marks'] for c in t['criteria']] == [1, 1] and t['scoringRule']['selectionLimit'] == 2
            and t['sourceQualification']['generatedUse'] == 'blocked-until-natural-enhanced-scope-and-response-calibration', 'Natural/enhanced scope or explanation allocation drift')
    graph = dict(country='United Kingdom', promptYearRange=[1990, 2020], verticalAxisUnit='million tonnes of greenhouse gas', sources=['agriculture', 'energy production', 'business', 'transport (including international)'], sourceReadingsAt2020=dict(agriculture=50, energy=110, business=118, transport=175), readingsAuthority='Published mark-scheme calculation; graph visually checked, no full numerical series digitised.', rightHandTailBeyond2020=True, tailEndYearVerified=None, sourceRef=dict(documentId=qp['id'], pdfPages=[14]))
    require(m['sourceEmissionsGraph'] == graph and by_path['5.b.i']['sourceGraphData'] == graph
            and by_path['5.b.ii']['sourceGraphData'] == graph, 'Graph data, unit or unverified date drift')
    t = by_path['5.b.i']; p = t['percentageScoring']
    require(p == dict(readings=dict(agriculture=50, energy=110, business=118, transport=175), allReadingsTolerance=1, unlabelledReadingsAccepted=True, sourceTotal=453, exactPercentage='11000/453', fullCreditRange=[23.9, 24.9], fullCreditMarks=3, correctFinalAnswerWithoutWorkingMarks=3, correctFinalAnswerWithWrongWorkingMarks=3, partialMaximum=2, partialRules=[dict(id='all-four-readings', marks=1, rule='All four correct readings, even if unlabelled, within ±1.'), dict(id='divide-by-their-total', marks=1, numeratorRange=[109, 111], rule='Divide energy 110 (109–111) by the candidate total.')], partialRulesDistinct=True, independentMultiplyBy100Mark=False, calculationLinesAreMarkingPoints=False, recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=[12]))
            and t['markingMethod'] == t['scoringRule']['mode'] == 'percentage-final-or-two-partials'
            and [c['marks'] for c in t['criteria']] == [0, 0]
            and t['mathematicalSkillIds'] == ['4BI1:issue3:mathematical:' + i for i in ['1A', '1C', '4A']]
            and t['sourceQualification']['generatedUse'] == 'blocked-until-graph-tolerance-and-follow-through-calibration', 'Percentage source final/partial rule drift')
    t = by_path['5.b.ii']; r = t['scoringRule']
    require(r['mode'] == t['markingMethod'] == 'any-distinct' and [c['marks'] for c in t['criteria']] == [1] * 8
            and r['maximum'] == r['selectionLimit'] == 5 and r['creditPerCriterion'] == 1
            and t['sourceTemporalConcessions'] == dict(promptYearRange=[1990, 2020], publishedGuidance=[dict(criterionId=t['criteria'][i]['id'], wording=w) for i, w in [(0, 'allow all fall after 2020'), (3, 'allow transport drops after 2020'), (7, 'allow drops after 2020')]], renewableEnergyAlternativeAccepted=True, sourceRef=dict(documentId=ms['id'], pdfPages=[13]), recognitionStatus='not-implemented')
            and t['sourceQualification']['generatedUse'] == 'blocked-until-temporal-scope-causal-and-response-calibration', 'Commentary cap/time-range concessions drift')

    experiment = dict(distanceCm=[2, 4, 6, 8, 10, 12], countsPerMinute=[[20, 18, 20], [16, 15, 15], [12, 14, 13], [10, 9, 8], [8, 7, 8], [5, 6, 4]], printedMeansPerMinute=[19, 15, 13, 9, 8, 5], repeatsPerDistance=3, countIntervalMinutes=1, plotSeries='printed-mean', join='straight-line-segments', sourceRef=dict(documentId=qp['id'], pdfPages=[17, 18]))
    require(m['sourcePondweedExperiment'] == experiment and all(t['sourceExperimentData'] == experiment for t in tasks if t['questionPath'].startswith('6.')), 'Pondweed cell/mean/series/source drift')
    for path, answer, options in [('6.a.i', 'B', ['carbon dioxide', 'oxygen', 'methane', 'nitrogen']), ('6.a.ii', 'A', ['chloroplast', 'mitochondrion', 'nucleus', 'ribosome'])]:
        t = by_path[path]
        require(t['scoringRule']['mode'] == t['markingMethod'] == 'single-choice' and t['scoringRule']['answerLabel'] == answer
                and [c['marks'] for c in t['criteria']] == [1] and t['sourceChoices'] == [dict(label=a, term=b) for a, b in zip('ABCD', options)], 'Photosynthesis choice/answer drift')
    t = by_path['6.a.iii']
    controls = ['temperature', 'carbon dioxide concentration', 'pH', 'background light', 'same bulb/lamp', 'time period']
    require(t['markingMethod'] == t['scoringRule']['mode'] == 'one-of-alternatives' and [c['marks'] for c in t['criteria']] == [1]
            and t['acceptableAlternatives'] == controls
            and t['sourceControlPolicy'] == dict(publishedAlternatives=controls, maximum=1, equivalentAnswersAccepted=True, sourceRef=dict(documentId=ms['id'], pdfPages=[14]), recognitionStatus='not-implemented'), 'Abiotic control alternatives/cap drift')
    t = by_path['6.b.i']
    require(t['markingMethod'] == t['scoringRule']['mode'] == 'graph-five-criteria' and [c['marks'] for c in t['criteria']] == [1] * 5
            and t['graphScoring'] == dict(maximum=5, creditPerCriterion=1, yMinimumLargeSquares=2.5, distanceAxis='x', meanBubblesAxis='y', requireBothUnits=True, plottingCredit=dict(noCreditIfAllThreeCountSeriesPlotted=True, noCreditIfExtrapolatedRateToZero=True), barChart=dict(maximum=4, lineCredit=0), printedMeansAreSupplied=True, meanRecalculationIsSeparateTask=False, sourceRef=dict(documentId=ms['id'], pdfPages=[15]), recognitionStatus='not-implemented')
            and t['mathematicalSkillIds'] == ['4BI1:issue3:mathematical:4A', '4BI1:issue3:mathematical:4C']
            and t['sourceQualification']['generatedUse'] == 'blocked-until-grid-drawing-and-response-calibration', 'Graph scale/plotting restrictions/units/source drift')
    t = by_path['6.b.ii']; r = t['scoringRule']
    require(t['markingMethod'] == r['mode'] == 'any-distinct' and [c['marks'] for c in t['criteria']] == [1] * 4
            and r['maximum'] == r['selectionLimit'] == 3 and r['creditPerCriterion'] == 1
            and t['directionScoring'] == dict(converseAcceptedCriterionIds=[t['criteria'][i]['id'] for i in [1, 2]], converseRejectedCriterionIds=[t['criteria'][i]['id'] for i in [0, 3]], lessLightAloneCredit=False, oxygenRequiredForGasPoint=True, sourceRef=dict(documentId=ms['id'], pdfPages=[15]), recognitionStatus='not-implemented')
            and t['sourceQualification']['generatedUse'] == 'blocked-until-direction-and-practical-response-calibration', 'Explanation cap/direction/oxygen policy drift')

    require(sum(t['originalMarks'] for t in tasks) == 65
            and sum(t['originalMarks'] for t in tasks if t['questionPath'].startswith('2.')) == 14
            and sum(t['originalMarks'] for t in tasks if t['questionPath'].startswith('4.')) == 10
            and sum(t['originalMarks'] for t in tasks if t['questionPath'].startswith('5.')) == 11
            and sum(t['originalMarks'] for t in tasks if t['questionPath'].startswith('6.')) == 11
            and m['blockers'] and m['processingNotes'], 'Subset reconciliation/gaps missing')

    date = m['reviewDate']
    common = dict(reviewed_by=m['reviewer'], reviewer_type='agent', human_reviewed='false', batch_id='biology-detailed-' + date, updated_at=date)
    documents = []
    for key, doc in [('questionPaper', qp), ('markScheme', ms)]:
        reviews = [dict(page=1, mode='visual-cover', reviewer='Codex cover visual review', date='2026-09-09')]
        reviews += [dict(page=p, mode='visual-whole-structural-index', reviewer=m['reviewer'], date=date) for p in m['pageAudit'][key]['visuallyReviewedPages'] if p != 1]
        documents.append(dict(document_id=doc['id'], qualification='4BI1', document_type=doc['type'], canonical_url=doc['url'], title='4BI1/1B Summer 2024 ' + doc['type'], publisher='Pearson', year=2024, series='June', component='1B', variant='unresolved', printed_exam_date='2024-05-10' if key == 'questionPaper' else '', filename_date='2024-05-11' if key == 'questionPaper' else '', sha256=doc['sha256'], page_count=doc['pageCount'], access_status='obtained', local_evidence_path=OVERLAY, reviewed_pages_json=compact(reviews), identity_status='agent-reviewed-whole-visual-pair', identity_notes='Whole visual structural pair match,45 indexed parts /110 allocation marks; detailed rubric review remains Q1–Q6 only. Legacy standard variant unresolved; printed/filename date conflict retained.', batch_id=common['batch_id'], updated_at=date))
    papers = [dict(paper_id=PAPER, qualification='4BI1', year=2024, series='June', component='1B', variant='unresolved', qp_document_id=qp['id'], ms_document_id=ms['id'], insert_document_ids_json='[]', examiner_report_ids_json='[]', report_status=m['examinerReportStatus'], target_specification_id=spec['documentId'], applicability_status='partial-current-scope-review', stage='indexed', last_successful_stage='indexed', expected_leaf_tasks=45, indexed_leaf_tasks=45, extracted_leaf_tasks=29, assessed_marks=110, all_alternatives_marks='', option_rules_json=compact(dict(mode='answer-all', sourcePages=[1], wholeAllocationReviewed=True)), reconciled_marks='false', scheme_match_status='whole-visual-structural-pair-match-detailed-subset', complete_page_audit='true', template_links_complete='false', blocking_issues_json=compact(m['blockers']), reviewed_at=date, **common)]
    task_rows, mappings = [], []
    for t in tasks:
        status = 'agent-reviewed-partial-current-scope' if t['syllabusMappings'] else 'selected-mathematical-skills-only' if t.get('mathematicalSkillIds') else 'experimental-demand-numbered-scope-unresolved'
        task_rows.append(dict(task_id=t['taskId'], paper_id=PAPER, question_path=t['questionPath'], record_kind='leaf', qp_pages_json=compact(t['questionPaperPages']), stimulus_refs_json=compact(t['stimulusRefs']), scheme_pages_json=compact(t['markSchemePages']), command_word=t['commandWord'], original_marks=t['originalMarks'], assessment_objectives_json='[]', required_knowledge='; '.join(t['requiredKnowledge']), context_summary=t['contextSummary'], stimulus_types_json=compact(t['stimulusTypes']), solution_structure_json=compact(t['solutionStructure']), marking_method=t['markingMethod'], rubric_ref=OVERLAY + '#' + t['taskId'], acceptable_alternatives_json=compact(t['acceptableAlternatives']), dependencies_json=compact(t['dependencies']), common_errors_json=compact(t['commonErrors']), report_refs_json='[]', extraction_status='source-checked', mapping_status=status, review_status='agent-reviewed', blocker='; '.join(t['blockers']), **common))
        for mapping in t['syllabusMappings']:
            mappings.append(dict(mapping_id=t['taskId'] + ':' + mapping['pointId'], task_id=t['taskId'], point_id=mapping['pointId'], mapping_kind=mapping['kind'], current_applicability=mapping['currentApplicability'], evidence_refs_json=compact(mapping['evidenceRefs']), rationale=mapping['rationale'], review_status='agent-reviewed', reviewed_by=m['reviewer'], reviewer_type='agent', updated_at=date))
    outputs = {}
    for name, key, incoming in [('documents', 'document_id', documents), ('papers', 'paper_id', papers), ('tasks', 'task_id', task_rows), ('task-mappings', 'mapping_id', mappings)]:
        path = root / 'research/ledger/v1' / (name + '.csv')
        fields, rows = read_table(path.parent, name)
        require(len({r[key] for r in rows}) == len(rows), 'Duplicate existing table IDs')
        saved = {r[key]: r for r in rows}
        owned = {r[key] for r in rows if r.get('paper_id') == PAPER or r.get('task_id', '').startswith(PAPER + '.Q') or r.get('document_id', '').startswith(PAPER + ':')}
        require(owned <= {r[key] for r in incoming}, 'Refusing stale owned rows')
        for record in incoming:
            require(not set(record) - set(fields), 'Unknown output columns')
            saved[record[key]] = {field: record.get(field, '') for field in fields}
        outputs.update(table_outputs(path.parent, name, fields, saved.values(), m['qualification']))
    return outputs


def export(root=ROOT):
    outputs = prepare(root)
    for path, content in outputs.items():
        path.write_text(content)
    return dict(detailedTasks=29, detailedMarks=65, numberedMappings=29, fullyProcessedPapers=0, activeTemplates=0)


if __name__ == '__main__':
    print(compact(export()))
