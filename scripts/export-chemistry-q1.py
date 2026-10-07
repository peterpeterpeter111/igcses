"""Normalize twenty-two source-checked Chemistry Q1–Q4 leaves without promoting processing.

All validation and table preparation happen before writes. This is an evidence
exporter, not a semantic marker or a question generator.
"""
import hashlib
import json
from pathlib import Path
from extraction_io import read_extraction
from ledger_io import read_table, table_outputs

ROOT = Path(__file__).resolve().parents[1]
PAPER = '4CH1-2024-June-1-standard'
OVERLAY = 'research/extractions/' + PAPER + '.json'
INDEX = 'research/paper-indexes/4CH1-2024-summer-1c.json'
INDEX_REMAINING = {
    '5.a.i': (2, [10], [8]), '5.a.ii': (2, [10], [8]), '5.a.iii': (2, [11], [8]), '5.b': (3, [11], [8]),
    '6.a.i': (2, [12], [9]), '6.a.ii': (2, [12], [9]), '6.b.i': (2, [12], [9]), '6.b.ii': (1, [12], [9]), '6.c.i': (2, [13], [9]), '6.c.ii': (4, [13], [10]),
    '7.a': (1, [14], [11]), '7.b': (2, [14], [11]), '7.c.i': (2, [14], [11]), '7.c.ii': (1, [14], [11]), '7.d.i': (1, [14], [11]), '7.d.ii': (6, [15], [12]),
    '8.a.i': (2, [16], [13]), '8.a.ii': (2, [16], [13]), '8.b': (1, [16], [13]), '8.c.i': (1, [17], [13]), '8.c.ii': (2, [17], [14]), '8.d': (3, [18], [14]), '8.e.i': (2, [18], [14]), '8.e.ii': (2, [18], [14]),
    '9.a.i': (1, [19], [15]), '9.a.ii': (1, [19], [15]), '9.b.i': (4, [20], [15]), '9.b.ii': (2, [20], [15]), '9.c': (3, [21], [15]),
    '10.a': (1, [22], [16]), '10.b': (2, [22], [16]), '10.c.i': (2, [23], [16]), '10.c.ii': (4, [23], [16]), '10.d': (2, [23], [17]),
}


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def prepare(root=ROOT, overlay=None, index_overlay=None):
    root = Path(root)
    m = overlay if overlay is not None else read_extraction(root / OVERLAY)
    require(m['paperId'] == PAPER and m['qualification'] == '4CH1'
            and m['detailedLeafTasks'] == 22 and m['detailedOriginalMarks'] == 38
            and m['reviewedQuestionTotals'] == {'1': 7, '2': 9, '3': 10, '4': 12}, 'Q1 identity/count drift')
    require(m['fullyProcessed'] is False and m['humanReviewed'] is False
            and m['marksReconciled'] is False and m['paperStage'] == 'indexed'
            and m['wholePaperLeafCount'] == 56 and m['wholePaperMarks'] == 110
            and m['currentSpecification']['wholeHistoricalAmendmentReconciliation'] == 'pending'
            and m['blockers'], 'Refusing unsupported processing or historical promotion')
    require(m['canonicalIdentity'] == dict(year=2024, series='June', component='1C',
            variant='unresolved', printedDate='2024-05-17', filenameDate='2024-05-18',
            legacyPaperIdPreserved=True), 'Source identity discrepancy lost')
    for ref, sha in [('rawManifestRef', 'rawManifestSha256'), ('coverReviewRef', 'coverReviewSha256')]:
        require(hashlib.sha256((root / m[ref]).read_bytes()).hexdigest() == m[sha], 'Raw source history changed')
    qp, ms = m['documents']
    require(qp['id'] == PAPER + ':questionPaper' and qp['pageCount'] == 24
            and qp['sha256'] == '1aec3bb887bbfaa925f35e9dd20bcb9e0890474467b43385fa37628d0efc96eb'
            and ms['id'] == PAPER + ':markScheme' and ms['pageCount'] == 18
            and ms['sha256'] == '204e6528094f3cd69b0eb8e06943fe5c73f7dd581943d62c57be7383d5c4a10b', 'Document evidence drift')
    require(m['pageAudit'] == dict(questionPaper=dict(visuallyReviewedPages=list(range(1, 25)), wholeDocumentReviewed=True),
            markScheme=dict(visuallyReviewedPages=list(range(1, 19)), wholeDocumentReviewed=True))
            and m['detailedPageAudit'] == dict(questionPaper=dict(visuallyReviewedPages=[2, 3, 4, 5, 6, 7, 8, 9, 24], wholeDocumentReviewed=False),
            markScheme=dict(visuallyReviewedPages=[3, 4, 5, 6, 7], wholeDocumentReviewed=False)), 'Visual/subset page scope drift')
    tasks = m['tasks']
    require([t['questionPath'] for t in tasks] == ['1.a', '1.b', '2.a.i', '2.a.ii', '2.a.iii', '2.a.iv', '2.a.v', '2.b.i', '2.b.ii', '2.b.iii', '3.a.i', '3.a.ii', '3.a.iii', '3.b', '3.c', '3.d', '4.a.i', '4.a.ii', '4.a.iii', '4.b.i', '4.b.ii', '4.c']
            and [t['originalMarks'] for t in tasks] == [5, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 4, 1, 1, 2, 1, 1, 2, 5], 'Five table positions must remain one leaf')
    source = dict(documentId=ms['id'], pdfPages=[4])
    a, b = tasks[:2]
    require(a['sourceTable']['choices'] == ['bromine', 'chlorine', 'diamond', 'ethene', 'iodine', 'lithium', 'methane', 'water']
            and a['sourceTable']['repeatChoicesAllowed'] is True
            and [(x['position'], x['answer'], x['allowedSymbols'], x['rejected']) for x in a['sourceTable']['positions']]
            == [(1, 'lithium', ['Li'], []), (2, 'bromine', ['Br', 'Br2'], ['Br−']),
                (3, 'ethene', ['C2H4'], []), (4, 'lithium', ['Li'], []), (5, 'diamond', [], [])]
            and a['sourceTable']['sourceRef'] == source
            and a['scoringRule'] == dict(mode='independent-table-positions', maximum=5, positionCount=5,
                creditPerPosition=1, distinctSubstancesRequired=False, recognitionStatus='not-implemented', sourceRef=source),
            'Source choice/symbol/position policy drift')
    expected_test = dict(maximum=2, m2DependsOnM1=True, branches=[
        dict(id='indicator-paper', method=['damp blue litmus paper', 'litmus paper', 'universal indicator paper'],
             observation=['paper bleaches', 'paper turns white', 'blue paper turns red then is bleached']),
        dict(id='bromide-solution', method=['bromide solution'], observation=['solution turns brown'])],
        ignore=['gas versus solution wording'], rejectMethods=['iodide solution'],
        maximumOneConcessions=[dict(response='red litmus paper turns blue then bleaches/turns white', credit=['M1'], maximum=1)],
        combineBranchesForExtraMarks=False, recognitionStatus='not-implemented', sourceRef=source)
    require(b['chlorineTestScoring'] == expected_test
            and b['scoringRule'] == dict(mode='alternative-dependent-paths', maximum=2,
                recognitionStatus='not-implemented', sourceRef=source)
            and b['dependencies'] == [dict(criterionId=PAPER + '.Q1.b:M2', requiresCriterionId=PAPER + '.Q1.b:M1')]
            and b['sourceQualification']['nonGeneralConcessions'], 'Chlorine paths/dependency/concession drift')
    expected_mappings = [['1.20', '2.5', '1.49', '4.44'], ['2.44'], ['2.15'], ['2.17'], ['1.25'], ['2.15'], [], ['3.1'], ['2.16'], ['2.20'], ['1.22'], ['1.22'], ['1.39', '1.38'], ['1.15', '1.27'], ['1.17', '1.16'], ['1.18'], ['1.32'], ['1.26'], ['1.32'], ['1.10'], ['1.10'], ['1.42', '1.41', '1.47']]
    _, points = read_table(root / 'research/ledger/v1', 'syllabus-points')
    points = {p['point_id']: p for p in points}
    qp_pages = [[3], [3], [4], [4], [4], [4], [4], [5], [5], [5], [6], [6], [6], [6], [7], [6, 7], [8], [8], [8], [8], [8], [9]]
    ms_pages = [[4]] * 2 + [[5]] * 8 + [[6]] * 6 + [[7]] * 6
    for i, t in enumerate(tasks):
        tid = PAPER + '.Q' + t['questionPath']
        require(t['paperId'] == PAPER and t['taskId'] == tid and t['recordKind'] == 'leaf'
                and t['questionPaperPages'] == qp_pages[i]
                and t['markSchemePages'] == ms_pages[i]
                and t['humanReviewed'] is False and t['assessmentObjectives'] == []
                and t['templateLinkStatus'] == 'candidate-only' and t['extractionStatus'] == 'source-checked'
                and t['sourceQualification']['generatedUse'].startswith('blocked-until-')
                and t['sourceQualification']['sourceRef'] == dict(documentId=ms['id'], pdfPages=t['markSchemePages']) and t['blockers'], 'Unsupported task promotion/source drift')
        require([c['id'] for c in t['criteria']] == [tid + ':' + label for label in (['row-1', 'row-2', 'row-3', 'row-4', 'row-5'] if i == 0 else ['M1', 'M2', 'M3', 'M4', 'M5'] if i == 21 else ['M1', 'M2', 'M3', 'M4'] if i == 14 else ['M1', 'M2'] if i in [1, 9, 13, 17, 20] else ['M1'])]
                and [c['marks'] for c in t['criteria']] == [1] * t['originalMarks'], 'Source credit allocation drift')
        require([x['pointId'] for x in t['syllabusMappings']] == ['4CH1:issue3:' + x for x in expected_mappings[i]], 'Bounded numbered mapping drift')
        for x in t['syllabusMappings']:
            p = points[x['pointId']]
            require('1C' in json.loads(p['applicable_components_json'])
                    and x['currentApplicability'] == 'partial-current-scope'
                    and x['evidenceRefs'][0] == dict(documentId='4CH1-spec', pdfPages=[int(p['pdf_page'])]),
                    'Current component/page/mapping scope drift')

    expected_table = dict(rows=[dict(metal='P', water='no reaction', diluteHCl='no reaction'),
        dict(metal='Q', water='very fast reaction', diluteHCl='not done'),
        dict(metal='R', water='no reaction', diluteHCl='slow reaction'),
        dict(metal='S', water='slow reaction', diluteHCl='fast reaction')],
        labelsAreElementSymbols=False, sourceRef=dict(documentId=qp['id'], pdfPages=[4]))
    require(m['sourceReactivityTable'] == expected_table and tasks[2]['sourceTable'] == expected_table,
            'Reactivity stimulus drift')
    require(m['sourceDisplacementEquation'] == dict(reactants=[dict(formula='Fe2O3', coefficient=1), dict(formula='Al', coefficient=2)],
        products=[dict(formula='Fe', coefficient=2), dict(formula='Al2O3', coefficient=1)],
        sourceRef=dict(documentId=qp['id'], pdfPages=[5])), 'Given equation drift')
    policies = [
        dict(order=['Q', 'S', 'R', 'P'], completeOrderRequired=True, creditPerLetter=False),
        dict(accepted=['R']),
        dict(wordReactants=['aluminium', 'hydrochloric acid'], wordProducts=['aluminium chloride', 'hydrogen'],
            symbolReactants=['Al', 'HCl'], symbolProducts=['AlCl3', 'H2'], symbolCoefficients=[2, 6, 2, 3],
            coefficientMultiplesAllowed=True, coefficientFractionsAllowed=True, unbalancedSymbolsExplicitlyAllowed=False),
        dict(namedExamples=['copper', 'silver', 'gold', 'platinum'], correctSymbolsAllowed=True,
            otherMetalsAllowedIfNoHClReaction=True, recognitionStatus='not-implemented'),
        dict(accepted=['explosive', 'dangerous', 'violent', 'unsafe'], ignore=['volatile', 'vigorous']),
        dict(acceptedEnergyForms=['heat', 'thermal energy'], direction='given out/released',
            surroundingsExplicitlyRequired=False, ignore=['energy alone']),
        dict(main='aluminium more reactive/higher than iron', reverseComparisonAllowed=True,
            alternative='aluminium better/stronger reducing agent', allowAlSymbol=True),
        dict(maximum=2, routes=[
            dict(id='combined-changes-and-labels', M1=['aluminium gains oxygen', 'iron(III) oxide loses oxygen'],
                M2=['aluminium oxidised', 'iron(III) oxide reduced']),
            dict(id='oxygen-entity-pairs', M1=['aluminium gains oxygen', 'aluminium oxidised'],
                M2=['iron(III) oxide loses oxygen', 'iron(III) oxide reduced']),
            dict(id='electron-entity-pairs', M1=['aluminium loses electrons', 'aluminium oxidised'],
                M2=['iron(III) ions gain electrons', 'iron(III) ions reduced'])],
            combinedChangeElectronAlternative=['aluminium loses electrons', 'iron(III) ions gain electrons'],
            correctOxidationNumberChangesAllowed=True, sourceRejectedM2=['iron loses oxygen'],
            extraMarksForMultipleRoutes=False, explicitM2DependencyOnM1=False, recognitionStatus='not-implemented')]
    for t, policy in zip(tasks[2:10], policies):
        require(t['sourceScoring'] == policy and t['scoringRule']['maximum'] == t['originalMarks']
                and t['scoringRule']['recognitionStatus'] == 'not-implemented', 'Q2 source concession/credit drift')

    atom = dict(label='Z', labelIsElementSymbol=False, electronsPerShell=[2, 8, 2], totalElectrons=12,
        occupiedShells=3, outerElectrons=2, atomsPerMole=dict(coefficient=6.0, exponent=23),
        sourceRef=dict(documentId=qp['id'], pdfPages=[6]))
    isotopes = dict(rows=[dict(isotope=1, protons=12, neutrons=12, percentageAbundance=79.0),
        dict(isotope=2, protons=12, neutrons=13, percentageAbundance=10.0),
        dict(isotope=3, protons=12, neutrons=14, percentageAbundance=11.0)],
        massNumbersAreGiven=False, requestedDecimalPlaces=1, sourceRef=dict(documentId=qp['id'], pdfPages=[7]))
    require(m['sourceAtomDiagram'] == atom and m['sourceIsotopeTable'] == isotopes
            and tasks[14]['sourceIsotopeTable'] == isotopes, 'Q3 diagram/table source drift')
    q3_policies = [dict(accepted=[2, 'two']), dict(accepted=[3, 'three']),
        dict(main='ZF2', allowed=['MgF2', 'F2Mg', 'F2Z'], rejected=['MgFl2'], penaliseIncorrectCase=True,
            penaliseSuperscripts=True, placeholderIsElementSymbol=False, recognitionStatus='not-implemented'),
        dict(electronsPerAtom=12, atomsPerMole=dict(coefficient=6.0, exponent=23),
            mainMethod='multiply-electrons-per-atom-by-atoms-per-mole', result=dict(coefficient=7.2, exponent=24),
            standardFormRequired=True, ecfWrongElectronCountMultiplied=True,
            divisionOnlyConcession=dict(divisor=12, result=dict(coefficient=5.0, exponent=22), restrictedToSpecifiedDivision=True),
            explicitM2SubsumesM1=False, recognitionStatus='not-implemented'),
        dict(massNumbers=[24, 25, 26], abundances=[79.0, 10.0, 11.0], weightedNumerator=2432, denominator=100,
            unrounded=24.32, rounded=24.3, decimalPlaces=1, m2SubsumesM1=True, subsumptionAppliesToCorrectNumerator=True,
            ecfIncorrectMassNumbersAllowed=True, workedSourceExamples=[dict(answer=12.3, credit=3, workingRequired=True)],
            noWorkingSourceExamples=[dict(answer=24.3, credit=4), dict(answer=24.32, credit=3)],
            m4RequiresNumbersFromTable=True, recognitionStatus='not-implemented'), dict(main='magnesium', allowed=['Mg'])]
    for t, policy in zip(tasks[10:16], q3_policies):
        require(t['sourceScoring'] == policy and t['scoringRule'] == dict(mode=t['markingMethod'],
            maximum=t['originalMarks'], recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=[6]))
            and t['dependencies'] == [], 'Q3 notation/ECF/subsumption or source-credit drift')

    qp_ref = lambda page: dict(documentId=qp['id'], pdfPages=[page])
    require(m['sourceCaffeineFormula'] == dict(formula='C8H10N4O2', atomCounts=dict(C=8, H=10, N=4, O=2), sourceRef=qp_ref(8))
        and m['sourceRelativeAtomicMasses'] == dict(values=dict(C=12, H=1, N=14, O=16), sourceRef=qp_ref(2))
        and m['sourceDistillationApparatus'] == dict(label='X', mixture='caffeine in ethanol', heatedFlask=True,
            waterIn='lower outlet end', waterOut='upper flask end', sourceRef=qp_ref(8))
        and m['sourceMeltingPointTable'] == dict(rows=[dict(name='caffeine', formula='C8H10N4O2', meltingPointC=235),
            dict(name='calcium bromide', formula='CaBr2', meltingPointC=730)], calciumBromideStatedIonic=True,
            relativeFormulaMassesStatedSimilar=True, sourceRef=qp_ref(9)), 'Q4 formula/apparatus/table source drift')
    q4_policies = [dict(answer=24),
        dict(atomCounts=dict(C=8, H=10, N=4, O=2), relativeAtomicMasses=dict(C=12, H=1, N=14, O=16), result=194,
            correctAnswerCredit=2, correctAnswerWorkingRequired=False, ecfAllowed=False, recognitionStatus='not-implemented'),
        dict(formula='C4H5N2O', atomCounts=dict(C=4, H=5, N=2, O=1), atomsInAnyOrderAllowed=True, recognitionStatus='not-implemented'),
        dict(accepted=['distillation', 'simple distillation'], rejected=['fractional distillation']),
        dict(M1='cooling of ethanol vapour', M2Alternatives=['condensation', 'formation of liquid ethanol'], maximum=2,
            explicitM2DependencyOnM1=False, recognitionStatus='not-implemented'),
        dict(maximum=5, M1='giant ionic lattice/structure in calcium bromide',
            M2='many/strong electrostatic attractions between oppositely charged ions', M2Allowed=['many/strong ionic bonds'],
            M2NoCreditIf=['covalent bonds', 'intermolecular forces'], M3='simple molecular structure in caffeine',
            M3Allowed=['simple covalent structure'], M4='weak intermolecular forces/weak forces between molecules',
            M4Rejected=['weak forces between bonds'],
            M5='more energy to break ionic electrostatic attractions than overcome caffeine intermolecular forces',
            M5NoCreditIf=['breaking covalent bonds', 'incorrect bonds'], explicitCriterionDependencies=False,
            recognitionStatus='not-implemented')]
    for t, policy in zip(tasks[16:], q4_policies):
        require(t['sourceScoring'] == policy and t['scoringRule'] == dict(mode=t['markingMethod'],
            maximum=t['originalMarks'], recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=[7]))
            and t['dependencies'] == [], 'Q4 source concession/exclusion or credit drift')
    require(tasks[17]['stimulusRefs'] == [qp_ref(8), qp_ref(2)], 'Printed atomic-mass source lost')

    require(m['wholePaperIndexRef'] == INDEX, 'Unexpected structural index')
    index = json.loads((root / INDEX).read_text()) if index_overlay is None else index_overlay
    require(index['paperId'] == PAPER and index['qualification'] == '4CH1'
        and index['indexedLeafCount'] == 56 and index['indexedOriginalMarks'] == 110
        and index['questionCount'] == 10 and index['allCompulsory'] is True
        and index['fullyProcessed'] is False and index['humanReviewed'] is False
        and index['visualPageAuditComplete'] is True
        and index['questionPaperSha256'] == qp['sha256'] and index['markSchemeSha256'] == ms['sha256']
        and index['questionPaperVisualPages'] == list(range(1, 25))
        and index['markSchemeVisualPages'] == list(range(1, 19)), 'Structural index identity/promotion/page drift')
    expected = {t['questionPath']: (t['originalMarks'], t['questionPaperPages'], t['markSchemePages']) for t in tasks}
    expected.update(INDEX_REMAINING)
    require(len(index['tasks']) == len({t['taskId'] for t in index['tasks']}) == 56
        and [t['questionPath'] for t in index['tasks']] == list(expected)
        and [q['question'] for q in index['questionTotals']] == list(range(1, 11))
        and [q['parts'] for q in index['questionTotals']] == [2, 8, 6, 6, 4, 6, 6, 8, 5, 5]
        and [q['marks'] for q in index['questionTotals']] == [7, 9, 10, 12, 9, 13, 13, 15, 11, 11], 'Whole structural allocation mismatch')
    expected_stimuli = {'3.d': [2, 6, 7], '4.a.ii': [2, 8], '5.a.iii': [10, 11], '5.b': [10, 11],
        '9.b.i': [19, 20], '9.b.ii': [19, 20], '9.c': [19, 21], '10.c.i': [22, 23], '10.c.ii': [2, 22, 23]}
    require([q['questionPaperTotalPage'] for q in index['questionTotals']] == [3, 5, 7, 9, 11, 13, 15, 18, 21, 23]
        and [q['markSchemeTotalPage'] for q in index['questionTotals']] == [4, 5, 6, 7, 8, 10, 12, 14, 15, 17], 'Question total-page drift')
    allowed_fields = {'taskId', 'paperId', 'recordKind', 'questionPath', 'originalMarks', 'questionPaperPages',
        'markSchemePages', 'stimulusPages', 'inventoryStatus', 'detailedExtractionStatus'}
    for t in index['tasks']:
        require(set(t) == allowed_fields and t['paperId'] == PAPER and t['taskId'] == PAPER + '.Q' + t['questionPath']
            and t['recordKind'] == 'leaf' and type(t['originalMarks']) is int
            and (t['originalMarks'], t['questionPaperPages'], t['markSchemePages']) == expected[t['questionPath']]
            and t['inventoryStatus'] == 'visual-structure-checked'
            and t['detailedExtractionStatus'] == ('pending' if t['questionPath'] in INDEX_REMAINING else 'source-checked-subset')
            and t['stimulusPages'] == expected_stimuli.get(t['questionPath'], t['questionPaperPages'])
            and t['stimulusPages'] == sorted(set(t['stimulusPages']))
            and all(type(page) is int and 1 <= page <= 24 for page in t['stimulusPages']),
            'Structural task allocation or rubric/processing promotion')
    for q in index['questionTotals']:
        subset = [t for t in index['tasks'] if t['questionPath'].split('.')[0] == str(q['question'])]
        require(len(subset) == q['parts'] and sum(t['originalMarks'] for t in subset) == q['marks'], 'Question inventory sum mismatch')
    require(index['paperMatch'] == dict(questionPaperLog='P75820A', schemePaperLog='P75820A',
        schemePublicationCode='4CH1_1C_2406_MS', questionPaperEvidencePages=[1], schemeEvidencePages=[1, 2],
        printedDate='2024-05-17', filenameDate='2024-05-18', dateConflictPreserved=True, variant='unresolved')
        and index['blankQuestionPaperPages'] == [24] and index['nonTaskQuestionPaperPages'] == [1, 2, 24]
        and index['nonTaskSchemePages'] == [1, 2, 3, 18]
        and index['rawManifestRef'] == m['rawManifestRef'] and index['rawManifestSha256'] == m['rawManifestSha256']
        and index['coverReviewRef'] == m['coverReviewRef'] and index['coverReviewSha256'] == m['coverReviewSha256'],
        'Index paper pairing or source history drift')

    date = m['reviewDate']
    common = dict(reviewed_by=m['reviewer'], reviewer_type='agent', human_reviewed='false',
                  batch_id='chemistry-detailed-' + date, updated_at=date)
    documents = []
    for key, doc in [('questionPaper', qp), ('markScheme', ms)]:
        pages = [dict(page=1, mode='visual-cover', reviewer='Codex cover review', date='2026-09-09')]
        pages += [dict(page=p, mode='visual-detailed-subset' if p in m['detailedPageAudit'][key]['visuallyReviewedPages'] else 'visual-structure-only', reviewer=m['reviewer'], date=date)
                  for p in m['pageAudit'][key]['visuallyReviewedPages'] if p != 1]
        documents.append(dict(document_id=doc['id'], qualification='4CH1', document_type=doc['type'], canonical_url=doc['url'],
            title='4CH1/1C Summer 2024 ' + doc['type'], publisher='Pearson', year=2024, series='June', component='1C',
            variant='unresolved', printed_exam_date='2024-05-17' if key == 'questionPaper' else '',
            filename_date='2024-05-18' if key == 'questionPaper' else '', sha256=doc['sha256'], page_count=doc['pageCount'],
            access_status='obtained', local_evidence_path=OVERLAY, reviewed_pages_json=compact(pages),
            identity_status='agent-reviewed-whole-structure-detailed-subset', identity_notes='Q1–Q4 twenty-two parts/thirty-eight marks matched; Whole structural inventory matched56parts/110marks; detailed/source/scope/template gates remain. Printed/filename discrepancy and legacy variant retained.',
            batch_id=common['batch_id'], updated_at=date))
    papers = [dict(paper_id=PAPER, qualification='4CH1', year=2024, series='June', component='1C', variant='unresolved',
        qp_document_id=qp['id'], ms_document_id=ms['id'], insert_document_ids_json='[]', examiner_report_ids_json='[]',
        report_status=m['examinerReportStatus'], target_specification_id='4CH1-spec', applicability_status='partial-current-scope-review',
        stage='indexed', last_successful_stage='indexed', expected_leaf_tasks=56, indexed_leaf_tasks=56, extracted_leaf_tasks=22,
        assessed_marks=110, all_alternatives_marks='', option_rules_json=compact(dict(mode='answer-all', sourcePages=[1], wholeAllocationReviewed=False)),
        reconciled_marks='false', scheme_match_status='matched-Q1-Q4-detailed-subset', complete_page_audit='true', template_links_complete='false',
        blocking_issues_json=compact(m['blockers']), reviewed_at=date, **common)]
    task_rows, mappings = [], []
    for t in tasks:
        task_rows.append(dict(task_id=t['taskId'], paper_id=PAPER, question_path=t['questionPath'], record_kind='leaf',
            qp_pages_json=compact(t['questionPaperPages']), stimulus_refs_json=compact(t['stimulusRefs']), scheme_pages_json=compact(t['markSchemePages']),
            command_word=t['commandWord'], original_marks=t['originalMarks'], assessment_objectives_json='[]',
            required_knowledge='; '.join(t['requiredKnowledge']), context_summary=t['contextSummary'], stimulus_types_json=compact(t['stimulusTypes']),
            solution_structure_json=compact(t['solutionStructure']), marking_method=t['markingMethod'], rubric_ref=OVERLAY + '#' + t['taskId'],
            acceptable_alternatives_json=compact(t['acceptableAlternatives']), dependencies_json=compact(t['dependencies']), common_errors_json=compact(t['commonErrors']),
            report_refs_json='[]', extraction_status='source-checked', mapping_status='agent-reviewed-partial-current-scope', review_status='agent-reviewed',
            blocker='; '.join(t['blockers']), **common))
        for x in t['syllabusMappings']:
            mappings.append(dict(mapping_id=t['taskId'] + ':' + x['pointId'], task_id=t['taskId'], point_id=x['pointId'], mapping_kind=x['kind'],
                current_applicability=x['currentApplicability'], evidence_refs_json=compact(x['evidenceRefs']), rationale=x['rationale'], review_status='agent-reviewed',
                reviewed_by=m['reviewer'], reviewer_type='agent', updated_at=date))
    outputs = {}
    for name, key, incoming in [('documents', 'document_id', documents), ('papers', 'paper_id', papers), ('tasks', 'task_id', task_rows), ('task-mappings', 'mapping_id', mappings)]:
        folder = root / 'research/ledger/v1'
        fields, rows = read_table(folder, name)
        saved = {row[key]: row for row in rows}
        require(len(saved) == len(rows), 'Duplicate existing normalized IDs')
        owned = {row[key] for row in rows if row.get('paper_id') == PAPER
                 or row.get('task_id', '').startswith(PAPER + '.Q') or row.get('document_id', '').startswith(PAPER + ':')}
        require(owned <= {row[key] for row in incoming}, 'Refusing lost owned rows')
        for row in incoming:
            require(not set(row) - set(fields), 'Unknown output columns')
            saved[row[key]] = {field: row.get(field, '') for field in fields}
        outputs.update(table_outputs(folder, name, fields, saved.values(), '4CH1'))
    return outputs


def export(root=ROOT):
    outputs = prepare(root)
    for path, content in outputs.items():
        path.write_text(content)
    return dict(detailedTasks=22, detailedMarks=38, numberedMappings=29, fullyProcessedPapers=0, activeTemplates=0)


if __name__ == '__main__':
    print(compact(export()))
