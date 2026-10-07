"""Normalize fifty-six source-checked Chemistry Q1–Q10 leaves without promoting processing.

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
            and m['detailedLeafTasks'] == 56 and m['detailedOriginalMarks'] == 110
            and m['reviewedQuestionTotals'] == {'1': 7, '2': 9, '3': 10, '4': 12, '5': 9, '6': 13, '7': 13, '8': 15, '9': 11, '10': 11}, 'Q1 identity/count drift')
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
            and m['detailedPageAudit'] == dict(questionPaper=dict(visuallyReviewedPages=[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], wholeDocumentReviewed=False),
            markScheme=dict(visuallyReviewedPages=[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], wholeDocumentReviewed=False)), 'Visual/subset page scope drift')
    tasks = m['tasks']
    require([t['questionPath'] for t in tasks] == ['1.a', '1.b', '2.a.i', '2.a.ii', '2.a.iii', '2.a.iv', '2.a.v', '2.b.i', '2.b.ii', '2.b.iii', '3.a.i', '3.a.ii', '3.a.iii', '3.b', '3.c', '3.d', '4.a.i', '4.a.ii', '4.a.iii', '4.b.i', '4.b.ii', '4.c', '5.a.i', '5.a.ii', '5.a.iii', '5.b', '6.a.i', '6.a.ii', '6.b.i', '6.b.ii', '6.c.i', '6.c.ii', '7.a', '7.b', '7.c.i', '7.c.ii', '7.d.i', '7.d.ii', '8.a.i', '8.a.ii', '8.b', '8.c.i', '8.c.ii', '8.d', '8.e.i', '8.e.ii', '9.a.i', '9.a.ii', '9.b.i', '9.b.ii', '9.c', '10.a', '10.b', '10.c.i', '10.c.ii', '10.d']
            and [t['originalMarks'] for t in tasks] == [5, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 4, 1, 1, 2, 1, 1, 2, 5, 2, 2, 2, 3, 2, 2, 2, 1, 2, 4, 1, 2, 2, 1, 1, 6, 2, 2, 1, 1, 2, 3, 2, 2, 1, 1, 4, 2, 3, 1, 2, 2, 4, 2], 'Five table positions must remain one leaf')
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
    expected_mappings = [['1.20', '2.5', '1.49', '4.44'], ['2.44'], ['2.15'], ['2.17'], ['1.25'], ['2.15'], [], ['3.1'], ['2.16'], ['2.20'], ['1.22'], ['1.22'], ['1.39', '1.38'], ['1.15', '1.27'], ['1.17', '1.16'], ['1.18'], ['1.32'], ['1.26'], ['1.32'], ['1.10'], ['1.10'], ['1.42', '1.41', '1.47'], ['1.13', '1.10'], ['1.11'], ['1.11'], ['1.12'], ['2.1'], ['2.28', '2.31'], ['2.45'], ['2.46'], ['1.38'], ['1.28', '1.31'], ['2.9'], ['1.46', '1.44'], ['1.25', '4.16'], [], ['1.39', '1.38'], ['2.47', '2.48', '2.44'], ['4.3'], ['4.5', '4.26'], ['4.6', '4.27'], ['4.45', '4.46'], ['4.47'], ['1.28', '1.25', '4.12'], ['1.25', '4.12'], ['4.13', '4.12'], ['3.15'], ['3.15'], ['3.10', '3.15'], ['3.10', '3.15'], ['3.11', '3.10', '3.15'], ['1.25'], ['3.2'], ['3.3'], ['3.4', '1.28', '3.1'], ['3.2']]
    _, points = read_table(root / 'research/ledger/v1', 'syllabus-points')
    points = {p['point_id']: p for p in points}
    qp_pages = [[3], [3], [4], [4], [4], [4], [4], [5], [5], [5], [6], [6], [6], [6], [7], [6, 7], [8], [8], [8], [8], [8], [9], [10], [10], [11], [11], [12], [12], [12], [12], [13], [13], [14], [14], [14], [14], [14], [15], [16], [16], [16], [17], [17], [18], [18], [18], [19], [19], [20], [20], [21], [22], [22], [23], [23], [23]]
    ms_pages = [[4]] * 2 + [[5]] * 8 + [[6]] * 6 + [[7]] * 6 + [[8]] * 4 + [[9]] * 5 + [[10]] + [[11]] * 5 + [[12]] + [[13]] * 4 + [[14]] * 4 + [[15]] * 5 + [[16]] * 4 + [[17]]
    for i, t in enumerate(tasks):
        tid = PAPER + '.Q' + t['questionPath']
        require(t['paperId'] == PAPER and t['taskId'] == tid and t['recordKind'] == 'leaf'
                and t['questionPaperPages'] == qp_pages[i]
                and t['markSchemePages'] == ms_pages[i]
                and t['humanReviewed'] is False and t['assessmentObjectives'] == []
                and t['templateLinkStatus'] == 'candidate-only' and t['extractionStatus'] == 'source-checked'
                and t['sourceQualification']['generatedUse'].startswith('blocked-until-')
                and t['sourceQualification']['sourceRef'] == dict(documentId=ms['id'], pdfPages=t['markSchemePages']) and t['blockers'], 'Unsupported task promotion/source drift')
        criterion_count = 6 if i in (26, 48) else 3 if i == 30 else t['originalMarks']
        additive_marks = [0] * criterion_count if i in (26, 30, 48) else [1] * criterion_count
        require([c['id'] for c in t['criteria']] == [tid + ':' + label for label in (['row-1', 'row-2', 'row-3', 'row-4', 'row-5'] if i == 0 else ['M' + str(k) for k in range(1, criterion_count + 1)])]
                and [c['marks'] for c in t['criteria']] == additive_marks, 'Source credit allocation drift')
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
    for t, policy in zip(tasks[16:22], q4_policies):
        require(t['sourceScoring'] == policy and t['scoringRule'] == dict(mode=t['markingMethod'],
            maximum=t['originalMarks'], recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=[7]))
            and t['dependencies'] == [], 'Q4 source concession/exclusion or credit drift')
    require(tasks[17]['stimulusRefs'] == [qp_ref(8), qp_ref(2)], 'Printed atomic-mass source lost')

    q5_policies = [
        dict(M1='avoid dissolution/diffusion into solvent at the bottom', M2='dyes can travel up paper',
            allowDyeForSpot=True, allowWaterForSolvent=True, explicitM2DependencyOnM1=False, recognitionStatus='not-implemented'),
        dict(pair=['E', 'H'], pairOrderIrrelevant=True, reasonAlternatives=['same spot level', 'same travelled distance', 'same Rf'],
            m2DependsOnM1=True, recognitionStatus='not-implemented'),
        dict(certainSample='G', evidence='one spot', uncertainSample='F', uncertaintyAlternatives=['insoluble', 'not moved'],
            unknownDyeCount=True, explicitM2DependencyOnM1=False, recognitionStatus='not-implemented'),
        dict(solventDistanceMm=65, dyeDistanceMm=39, dyeRangeMm=[38, 41], dyeRangeInclusive=True, ratio=0.6,
            publishedFinalRange=[0.57, 0.64], finalEndpointInclusivityExplicit=False, m3NoCreditIfIncorrectlyRounded=True,
            sourceFixedDecimalPlaces=None, explicitEcfPolicy=False, recognitionStatus='not-implemented')]
    for t, policy in zip(tasks[22:26], q5_policies):
        require(t['sourceScoring'] == policy and t['scoringRule'] == dict(mode=t['markingMethod'],
            maximum=t['originalMarks'], recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=[8]))
            and t['stimulusRefs'] == [dict(documentId=qp['id'], pdfPages=[10] if t['questionPaperPages'] == [10] else [10, 11])],
            'Q5 diagram/policy/source credit drift')
        expected_dependency = [dict(criterionId=t['taskId'] + ':M2', requiresCriterionId=t['taskId'] + ':M1')] if t['questionPath'] == '5.a.ii' else []
        require(t['dependencies'] == expected_dependency, 'Q5 explanation dependency drift')
    require(tasks[22]['sourceChromatogram'] == dict(labels=['E', 'F', 'G', 'H'], beforeAllAtBaseline=True,
        afterSpotCounts=dict(E=2, F=1, G=1, H=2), fAfterAtBaseline=True, sharedLevelPair=['E', 'H'],
        gMovedAboveBaseline=True, sourceRef=dict(documentId=qp['id'], pdfPages=[10]),
        afterSpotCentreTops=dict(E=[220.683, 264.0938], F=[356.2198], G=[244.4304], H=[220.683, 301.3988]),
        baselineTop=356.22), 'Chromatogram interpretation drift')
    measurement = tasks[25]
    require(measurement['measurementPresentation'] == dict(originalPdfGeometryChecked=True, webScaleValidated=False,
        physicalMeasurementReuse='blocked-until-scale-and-format-calibration'), 'Measurement presentation promoted')
    geometry = measurement['printedMeasurementAudit']
    require(geometry['questionPaperSha256'] == qp['sha256'] and geometry['pdfPage'] == 10
        and geometry['baselineTop'] == 356.22 and geometry['solventTop'] == 171.968
        and abs(geometry['gSpotCentreTop'] - 244.4304) < 1e-10
        and geometry['cropBox'] == [28.3465, 28.34699999999998, 623.622, 870.2365]
        and geometry['mediaBox'] == [0.0, 0.0, 651.969, 898.583] and geometry['webScaleValidated'] is False,
        'Printed geometry source drift')
    solvent_mm = (geometry['baselineTop'] - geometry['solventTop']) * 25.4 / 72
    dye_mm = (geometry['baselineTop'] - geometry['gSpotCentreTop']) * 25.4 / 72
    require(abs(solvent_mm - 65) < 0.01 and 38 <= dye_mm <= 41
        and abs(geometry['solventDistanceMm'] - solvent_mm) < 1e-10
        and abs(geometry['gDistanceMm'] - dye_mm) < 1e-10
        and abs(geometry['ratio'] - dye_mm / solvent_mm) < 1e-10, 'Original printed measurement reconciliation drift')

    q6_policies = [{'eligibleCategories': [['effervescence', 'bubbles', 'fizzing'], ['moves'], ['floats'], ['disappears', 'gets smaller', 'dissolves'], ['melts', 'forms a ball', 'forms a sphere'], ['white trail']], 'creditPerDistinctCategory': 1, 'maximum': 2, 'duplicateSynonymsAddCredit': False, 'combinedSourceConcessions': [{'response': 'moves on surface', 'categories': ['M2', 'M3']}], 'ignore': ['heat produced', 'flame'], 'recognitionStatus': 'not-implemented'}, {'M1': 'pink', 'M2': 'OH−/hydroxide ions present', 'M2Allowed': ['alkaline solution', 'alkali produced'], 'markIndependently': True, 'm2DependsOnM1': False, 'rejectedColours': ['red', 'purple'], 'ignore': ['metal oxide forms'], 'recognitionStatus': 'not-implemented'}, {'M1Alternatives': ['other ions', 'chemicals', 'impurities', 'substances', 'elements'], 'M2Alternatives': ['interfere with flame colour', 'mask flame colour', 'change flame colour'], 'explicitM2DependencyOnM1': False, 'recognitionStatus': 'not-implemented'}, {'acceptedLabel': 'C', 'acceptedContent': 'red', 'labelMustMatchPrintedChoice': True, 'writtenContentRecognitionImplemented': False, 'recognitionStatus': 'not-implemented'}, {'ions': [{'name': 'potassium', 'formula': 'K+', 'allowed': []}, {'name': 'aluminium', 'formula': 'Al3+', 'allowed': ['Al+3']}, {'name': 'sulfate', 'formula': 'SO4^2−', 'allowed': ['SO4−2']}], 'creditBands': [{'correctPositions': 3, 'marks': 2}, {'correctPositions': 2, 'marks': 1}], 'maximum': 2, 'additiveCreditPerPosition': False, 'recognitionStatus': 'not-implemented'}, {'hydratedMassG': 23.7, 'anhydrousMassG': 12.9, 'saltMr': 258, 'waterMr': 18, 'waterMassG': 10.8, 'saltMoles': 0.05, 'waterMoles': 0.6, 'result': 12, 'correctAnswerWithoutWorkingCredit': 4, 'ecfAllowedOn': 'incorrect mass of water', 'generalEcfExplicit': False, 'm4WholeNumberRequired': True, 'alternativeMethodsAccepted': True, 'explicitCriterionDependencies': False, 'recognitionStatus': 'not-implemented'}]
    q6_criteria = [[{'id': '4CH1-2024-June-1-standard.Q6.a.i:M1', 'marks': 0, 'rule': 'effervescence/bubbles/fizzing'}, {'id': '4CH1-2024-June-1-standard.Q6.a.i:M2', 'marks': 0, 'rule': 'moves'}, {'id': '4CH1-2024-June-1-standard.Q6.a.i:M3', 'marks': 0, 'rule': 'floats'}, {'id': '4CH1-2024-June-1-standard.Q6.a.i:M4', 'marks': 0, 'rule': 'disappears/gets smaller/dissolves'}, {'id': '4CH1-2024-June-1-standard.Q6.a.i:M5', 'marks': 0, 'rule': 'melts/forms a ball/forms a sphere'}, {'id': '4CH1-2024-June-1-standard.Q6.a.i:M6', 'marks': 0, 'rule': 'white trail'}], [{'id': '4CH1-2024-June-1-standard.Q6.a.ii:M1', 'marks': 1, 'rule': 'Phenolphthalein turns pink.'}, {'id': '4CH1-2024-June-1-standard.Q6.a.ii:M2', 'marks': 1, 'rule': 'OH−/hydroxide ions present; allow an alkaline solution/alkali produced.'}], [{'id': '4CH1-2024-June-1-standard.Q6.b.i:M1', 'marks': 1, 'rule': 'Remove other ions/chemicals/impurities/substances/elements from wire.'}, {'id': '4CH1-2024-June-1-standard.Q6.b.i:M2', 'marks': 1, 'rule': 'Prevent interference/masking/changing flame colour.'}], [{'id': '4CH1-2024-June-1-standard.Q6.b.ii:M1', 'marks': 1, 'rule': 'C (red).'}], [{'id': '4CH1-2024-June-1-standard.Q6.c.i:M1', 'marks': 0, 'rule': 'potassium: K+'}, {'id': '4CH1-2024-June-1-standard.Q6.c.i:M2', 'marks': 0, 'rule': 'aluminium: Al3+'}, {'id': '4CH1-2024-June-1-standard.Q6.c.i:M3', 'marks': 0, 'rule': 'sulfate: SO4^2−'}], [{'id': '4CH1-2024-June-1-standard.Q6.c.ii:M1', 'marks': 1, 'rule': 'Water mass 23.7−12.9 or 10.8.'}, {'id': '4CH1-2024-June-1-standard.Q6.c.ii:M2', 'marks': 1, 'rule': 'Salt moles 12.9/258 or 0.05.'}, {'id': '4CH1-2024-June-1-standard.Q6.c.ii:M3', 'marks': 1, 'rule': 'Water moles 10.8/18 or 0.6.'}, {'id': '4CH1-2024-June-1-standard.Q6.c.ii:M4', 'marks': 1, 'rule': 'x=0.6/0.05 or 12; whole number required.'}]]
    for t, policy, criteria in zip(tasks[26:32], q6_policies, q6_criteria):
        require(t['sourceScoring'] == policy and t['criteria'] == criteria
            and t['scoringRule'] == dict(mode=t['markingMethod'], maximum=t['originalMarks'],
                recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=t['markSchemePages']))
            and t['dependencies'] == [], 'Q6 pool/threshold/independence or narrow ECF drift')
    require(tasks[29]['sourceChoices'] == [dict(label='A', text='lilac'), dict(label='B', text='orange'),
        dict(label='C', text='red'), dict(label='D', text='yellow')], 'Q6 printed MCQ correspondence drift')
    require(tasks[31]['sourceHydrationData'] == dict(anhydrousFormula='KAl(SO4)2', hydratedFormula='KAl(SO4)2·xH2O',
        hydratedMassG=23.7, anhydrousMassG=12.9, saltMr=258, waterMr=18, allWaterRemoved=True,
        sourceRef=dict(documentId=qp['id'], pdfPages=[13])), 'Q6 given hydration data drift')
    require([x['kind'] for t in tasks[26:32] for x in t['syllabusMappings']]
        == ['supporting', 'primary', 'supporting', 'supporting', 'primary', 'primary', 'primary', 'supporting'],
        'Q6 partial practical/family mapping drift')

    q7_policies = [{'acceptedLabel': 'D', 'acceptedContent': '80%', 'labelMustMatchPrintedChoice': True, 'approximationSpecified': True, 'recognitionStatus': 'not-implemented'}, {'atomLabels': ['N', 'N'], 'sharedElectronPairs': 3, 'lonePairsPerAtom': [1, 1], 'totalOuterElectrons': 10, 'outerElectronsOnly': True, 'anyCombinationOfDotsAndCrossesAllowed': True, 'm2DependsOnM1': True, 'recognitionStatus': 'not-implemented'}, {'reactants': ['NO2', 'H2O', 'O2'], 'products': ['HNO3'], 'coefficients': [4, 2, 1, 4], 'coefficientMultiplesAllowed': True, 'coefficientFractionsAllowed': True, 'ignoreStateSymbolsEvenIfIncorrect': True, 'm2DependsOnM1': True, 'recognitionStatus': 'not-implemented'}, {'namedExamples': ['acidifies lakes', 'kills fish', 'deforestation', 'damages plants', 'corrodes marble statues', 'corrodes buildings'], 'otherEnvironmentalEffectsAccepted': True, 'reject': ['ozone layer'], 'ignore': ['climate change'], 'maximum': 1, 'recognitionStatus': 'not-implemented'}, {'acceptedLabel': 'D', 'acceptedContent': '(NH4)2CO3', 'labelMustMatchPrintedChoice': True, 'recognitionStatus': 'not-implemented'}, {'maximum': 6, 'ammonium': {'M1': 'add sodium hydroxide solution (and heat)', 'M2': 'test gas/ammonia with damp red litmus paper', 'M3': 'red litmus turns blue', 'm2CreditCondition': {'anyOf': ['M1 earned', 'heating solution and producing a gas to test']}, 'm3IndependentIf': 'ammonia gas correctly tested with correct paper colour change', 'indicatorAlternative': {'method': 'universal indicator paper', 'observations': ['blue', 'purple'], 'covers': ['M2', 'M3']}, 'noM2OrM3If': 'litmus paper added directly to solution'}, 'carbonate': {'M4': 'add hydrochloric acid only to solution', 'otherAcidsAccepted': True, 'M5': 'test gas/carbon dioxide with limewater', 'M6Alternatives': ['cloudy', 'milky', 'white precipitate'], 'm5DependsOnM4': True, 'm4AcidOnlyToSolution': True, 'm6IndependentIf': 'correct limewater test on carbon dioxide gas carried out', 'noM5OrM6If': 'limewater added directly to solution'}, 'recognitionStatus': 'not-implemented'}]
    q7_criteria = [[{'id': '4CH1-2024-June-1-standard.Q7.a:M1', 'marks': 1, 'rule': 'D (80%).'}], [{'id': '4CH1-2024-June-1-standard.Q7.b:M1', 'marks': 1, 'rule': 'Three pairs of electrons between the two nitrogen atoms.'}, {'id': '4CH1-2024-June-1-standard.Q7.b:M2', 'marks': 1, 'rule': 'Rest of molecule fully correct; M2 depends on M1.'}], [{'id': '4CH1-2024-June-1-standard.Q7.c.i:M1', 'marks': 1, 'rule': 'All formulae correct.'}, {'id': '4CH1-2024-June-1-standard.Q7.c.i:M2', 'marks': 1, 'rule': 'Balance correct formulae; M2 depends on M1.'}], [{'id': '4CH1-2024-June-1-standard.Q7.c.ii:M1', 'marks': 1, 'rule': 'Any one environmental effect of acid rain.'}], [{'id': '4CH1-2024-June-1-standard.Q7.d.i:M1', 'marks': 1, 'rule': 'D ((NH4)2CO3).'}], [{'id': '4CH1-2024-June-1-standard.Q7.d.ii:M1', 'marks': 1, 'rule': 'Add sodium hydroxide solution (and heat).'}, {'id': '4CH1-2024-June-1-standard.Q7.d.ii:M2', 'marks': 1, 'rule': 'Test the gas/ammonia with damp red litmus paper.'}, {'id': '4CH1-2024-June-1-standard.Q7.d.ii:M3', 'marks': 1, 'rule': 'Red litmus turns blue.'}, {'id': '4CH1-2024-June-1-standard.Q7.d.ii:M4', 'marks': 1, 'rule': 'Add hydrochloric acid only; other acids accepted.'}, {'id': '4CH1-2024-June-1-standard.Q7.d.ii:M5', 'marks': 1, 'rule': 'Test the gas/carbon dioxide with limewater.'}, {'id': '4CH1-2024-June-1-standard.Q7.d.ii:M6', 'marks': 1, 'rule': 'Limewater turns cloudy/milky/white precipitate.'}]]
    q7_dependencies = [[], [{'criterionId': '4CH1-2024-June-1-standard.Q7.b:M2', 'requiresCriterionId': '4CH1-2024-June-1-standard.Q7.b:M1'}], [{'criterionId': '4CH1-2024-June-1-standard.Q7.c.i:M2', 'requiresCriterionId': '4CH1-2024-June-1-standard.Q7.c.i:M1'}], [], [], [{'criterionId': '4CH1-2024-June-1-standard.Q7.d.ii:M5', 'requiresCriterionId': '4CH1-2024-June-1-standard.Q7.d.ii:M4'}]]
    for t, policy, criteria, dependencies in zip(tasks[32:38], q7_policies, q7_criteria, q7_dependencies):
        require(t['sourceScoring'] == policy and t['criteria'] == criteria and t['dependencies'] == dependencies
            and t['scoringRule'] == dict(mode=t['markingMethod'], maximum=t['originalMarks'],
                recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=t['markSchemePages'])),
            'Q7 diagram/equation/gas-test exception or source-credit drift')
    require(tasks[32]['sourceChoices'] == [dict(label='A', text='1%'), dict(label='B', text='20%'),
        dict(label='C', text='70%'), dict(label='D', text='80%')]
        and tasks[36]['sourceChoices'] == [dict(label='A', text='NH3CO3'), dict(label='B', text='(NH3)2CO3'),
        dict(label='C', text='NH4CO3'), dict(label='D', text='(NH4)2CO3')], 'Q7 printed MCQ correspondence drift')
    require(tasks[37]['conditionalDependencies'] == [dict(criterionId=PAPER+'.Q7.d.ii:M2', anyOf=[
        dict(requiresCriterionId=PAPER+'.Q7.d.ii:M1'), dict(sourceCondition='heating solution and producing a gas to test')])],
        'Q7 heating/gas alternative dependency lost')
    require([x['kind'] for t in tasks[32:38] for x in t['syllabusMappings']]
        == ['primary', 'primary', 'supporting', 'primary', 'supporting', 'primary', 'supporting', 'primary', 'primary', 'supporting']
        and tasks[35]['sourceQualification']['unmappedRationale'], 'Q7 bounded scope mapping drift')

    q8_policies = [{'M1': 'compounds with same molecular formula', 'M1Allowed': ['same number of carbons and hydrogens', 'same number of atoms of each element'], 'M1Rejected': ['elements with same molecular formula', 'chemical formula'], 'M2Allowed': ['different structural formulae', 'different displayed formulae', 'different structures', 'different arrangements of atoms'], 'm2IndependentOfM1': True, 'recognitionStatus': 'not-implemented'}, {'molecularFormula': 'C4H8', 'givenStructure': 'but-1-ene', 'acceptedConstitutionalStructures': [{'name': 'but-2-ene', 'carbonEdges': [[1, 2, 1], [2, 3, 2], [3, 4, 1]], 'hydrogensPerCarbon': [3, 1, 1, 3]}, {'name': '2-methylpropene', 'carbonEdges': [[1, 2, 2], [2, 3, 1], [2, 4, 1]], 'hydrogensPerCarbon': [2, 0, 3, 3]}], 'allBondsMustBeShown': True, 'cisAndTransIsomersAllowedForBothMarks': True, 'reject': ['cycloalkanes'], 'cisTransKnowledgeRequiredByCurrentSpecification': False, 'recognitionStatus': 'not-implemented'}, {'acceptedLabel': 'A', 'acceptedContent': 'addition', 'labelMustMatchPrintedChoice': True, 'recognitionStatus': 'not-implemented'}, {'backboneCarbonCount': 2, 'backboneBondOrder': 1, 'hydrogensPerBackboneCarbon': [2, 1], 'methylBranches': [{'backbonePosition': 2, 'formula': 'CH3'}], 'continuationBondsRequired': True, 'ignore': ['brackets', 'n'], 'recognitionStatus': 'not-implemented'}, {'landfillAccepted': ['inert', 'unreactive', 'do not biodegrade', 'decomposes very slowly', 'running out of space'], 'burningAccepted': ['toxic fumes', 'greenhouse gases'], 'ignore': ['global warming'], 'explicitM2DependencyOnM1': False, 'recognitionStatus': 'not-implemented'}, {'carbonDioxideMassG': 396, 'waterMassG': 180, 'carbonDioxideMr': 44, 'waterMr': 18, 'alkaneMoles': 1, 'y': 9, 'z': 10, 'x': 14, 'm3EcfOnIncorrectM1OrM2': True, 'ecfScope': 'oxygen coefficient from incorrect y and/or z', 'recognitionStatus': 'not-implemented'}, {'species': ['C8H18', 'O2', 'CO', 'C', 'H2O'], 'coefficients': [1, 7, 5, 3, 9], 'givenFixedCarbonCoefficient': 3, 'states': ['l', 'g', 'g', 's', 'l'], 'waterAlternativeState': 'g', 'explicitM2DependencyOnM1': False, 'coefficientMultiplesConcessionExplicit': False, 'recognitionStatus': 'not-implemented'}, {'maximum': 2, 'routes': [{'product': ['carbon monoxide', 'CO'], 'effects': ['poisonous', 'toxic', 'limits blood oxygen carrying capacity'], 'correctHaemoglobinReferencesAccepted': True}, {'product': ['carbon', 'C'], 'effects': ['soot causes respiratory problems']}], 'm2DependsOnM1': True, 'ignore': ['harmful'], 'extraMarksForMultipleRoutes': False, 'recognitionStatus': 'not-implemented'}]
    q8_criteria = [[{'id': '4CH1-2024-June-1-standard.Q8.a.i:M1', 'marks': 1, 'rule': 'Compounds have the same molecular formula.'}, {'id': '4CH1-2024-June-1-standard.Q8.a.i:M2', 'marks': 1, 'rule': 'Different structural/displayed formulae or arrangements of atoms.'}], [{'id': '4CH1-2024-June-1-standard.Q8.a.ii:M1', 'marks': 1, 'rule': 'Correct displayed but-2-ene, all bonds shown.'}, {'id': '4CH1-2024-June-1-standard.Q8.a.ii:M2', 'marks': 1, 'rule': 'Correct displayed 2-methylpropene, all bonds shown; source permits cis/trans for both marks.'}], [{'id': '4CH1-2024-June-1-standard.Q8.b:M1', 'marks': 1, 'rule': 'A (addition).'}], [{'id': '4CH1-2024-June-1-standard.Q8.c.i:M1', 'marks': 1, 'rule': 'Correct poly(propene) repeat unit.'}], [{'id': '4CH1-2024-June-1-standard.Q8.c.ii:M1', 'marks': 1, 'rule': 'Landfill: inert/unreactive/non-biodegradable/very slow decomposition/running out of space.'}, {'id': '4CH1-2024-June-1-standard.Q8.c.ii:M2', 'marks': 1, 'rule': 'Burning: toxic fumes or greenhouse gases.'}], [{'id': '4CH1-2024-June-1-standard.Q8.d:M1', 'marks': 1, 'rule': 'y=396/44=9.'}, {'id': '4CH1-2024-June-1-standard.Q8.d:M2', 'marks': 1, 'rule': 'z=180/18=10.'}, {'id': '4CH1-2024-June-1-standard.Q8.d:M3', 'marks': 1, 'rule': 'x=14; ECF on incorrect M1 and/or M2 values.'}], [{'id': '4CH1-2024-June-1-standard.Q8.e.i:M1', 'marks': 1, 'rule': 'Correct balancing.'}, {'id': '4CH1-2024-June-1-standard.Q8.e.i:M2', 'marks': 1, 'rule': 'Correct state symbols; accept(g) for water.'}], [{'id': '4CH1-2024-June-1-standard.Q8.e.ii:M1', 'marks': 1, 'rule': 'Carbon monoxide/CO; allow carbon/C.'}, {'id': '4CH1-2024-June-1-standard.Q8.e.ii:M2', 'marks': 1, 'rule': 'CO poisonous/toxic/limits blood oxygen carrying; allow soot respiratory problems.'}]]
    q8_dependencies = [[], [], [], [], [], [], [], [{'criterionId': '4CH1-2024-June-1-standard.Q8.e.ii:M2', 'requiresCriterionId': '4CH1-2024-June-1-standard.Q8.e.ii:M1'}]]
    for t, policy, criteria, dependencies in zip(tasks[38:46], q8_policies, q8_criteria, q8_dependencies):
        require(t['sourceScoring'] == policy and t['criteria'] == criteria and t['dependencies'] == dependencies
            and t['scoringRule'] == dict(mode=t['markingMethod'], maximum=t['originalMarks'],
                recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=t['markSchemePages'])),
            'Q8 structural/disposal/combustion source-credit drift')
    require(tasks[40]['sourceChoices'] == [dict(label='A', text='addition'), dict(label='B', text='combustion'),
        dict(label='C', text='decomposition'), dict(label='D', text='substitution')], 'Q8 printed MCQ correspondence drift')
    require(tasks[43]['sourceCombustionData'] == dict(alkaneMoles=1, carbonDioxideMassG=396, waterMassG=180,
        carbonDioxideMr=44, waterMr=18, givenEquation='alkane+xO2→yCO2+zH2O',
        sourceRef=dict(documentId=qp['id'], pdfPages=[18])), 'Q8 original combustion data drift')

    q9_policies = [{'accepted': ['carbon dioxide is given off', 'a gas is given off'], 'ignore': ['marble dissolving', 'gas formed'], 'recognitionStatus': 'not-implemented'}, {'accepted': 'prevent acid spray leaving flask', 'equivalentWordingAllowed': True, 'ignore': ['stop solid escaping'], 'recognitionStatus': 'not-implemented'}, {'maximum': 4, 'selection': 'any two linked pairs', 'pairs': [{'id': 'start', 'description': 'curve steepest/loss of mass fastest at start', 'explanation': 'acid concentration highest/maximum reacting particles', 'criteria': ['M1', 'M2']}, {'id': 'slowing', 'description': 'curve less steep/loss of mass slows down', 'explanation': 'acid becomes more dilute/less concentrated', 'criteria': ['M3', 'M4']}, {'id': 'plateau', 'description': 'curve levels off/flattens/loss of mass stops', 'explanation': 'acid used up', 'criteria': ['M5', 'M6']}], 'maximumSelectedPairs': 2, 'descriptionCriterionLabels': ['M1', 'M3', 'M5'], 'descriptionCreditCap': 2, 'marbleChipsInExcess': True, 'ignore': ['comments linked to rate of reaction'], 'standaloneExplanationCreditExplicit': False, 'partialPairCalibrationStatus': 'pending', 'recognitionStatus': 'not-implemented'}, {'sameAcidVolume': True, 'concentrationFactor': 0.5, 'allOtherConditionsSame': True, 'm1RequiresOriginAndBelowOriginal': True, 'plateauG': 0.27, 'tolerance': {'mode': 'half-small-square', 'fraction': 0.5, 'smallSquareG': 0.02, 'derivedToleranceG': 0.01}, 'endpointInclusivityExplicit': False, 'explicitM2DependencyOnM1': False, 'recognitionStatus': 'not-implemented'}, {'M1': 'rate increases/is faster', 'M2': 'smaller chips have greater surface area', 'M3Allowed': ['more collisions per unit time', 'more frequent collisions'], 'ignore': ['less chance of collisions'], 'maximumIfIncorrectEnergyOrSpeedReference': 1, 'contradictionTriggers': ['particles have more energy', 'particles move faster'], 'explicitCriterionDependencies': False, 'recognitionStatus': 'not-implemented'}]
    q9_criteria = [[{'id': '4CH1-2024-June-1-standard.Q9.a.i:M1', 'marks': 1, 'rule': 'Carbon dioxide/a gas is given off.'}], [{'id': '4CH1-2024-June-1-standard.Q9.a.ii:M1', 'marks': 1, 'rule': 'Prevent acid spray leaving the flask.'}], [{'id': '4CH1-2024-June-1-standard.Q9.b.i:M1', 'marks': 0, 'rule': 'curve steepest/loss of mass fastest at start'}, {'id': '4CH1-2024-June-1-standard.Q9.b.i:M2', 'marks': 0, 'rule': 'acid concentration highest/maximum reacting particles'}, {'id': '4CH1-2024-June-1-standard.Q9.b.i:M3', 'marks': 0, 'rule': 'curve less steep/loss of mass slows down'}, {'id': '4CH1-2024-June-1-standard.Q9.b.i:M4', 'marks': 0, 'rule': 'acid becomes more dilute/less concentrated'}, {'id': '4CH1-2024-June-1-standard.Q9.b.i:M5', 'marks': 0, 'rule': 'curve levels off/flattens/loss of mass stops'}, {'id': '4CH1-2024-June-1-standard.Q9.b.i:M6', 'marks': 0, 'rule': 'acid used up'}], [{'id': '4CH1-2024-June-1-standard.Q9.b.ii:M1', 'marks': 1, 'rule': 'Starts at origin and below original curve.'}, {'id': '4CH1-2024-June-1-standard.Q9.b.ii:M2', 'marks': 1, 'rule': 'Levels off at0.27g ±half a small square.'}], [{'id': '4CH1-2024-June-1-standard.Q9.c:M1', 'marks': 1, 'rule': 'Reaction rate increases.'}, {'id': '4CH1-2024-June-1-standard.Q9.c:M2', 'marks': 1, 'rule': 'Smaller chips have a greater surface area.'}, {'id': '4CH1-2024-June-1-standard.Q9.c:M3', 'marks': 1, 'rule': 'More collisions per unit time; allow more frequent collisions.'}]]
    for t, policy, criteria in zip(tasks[46:51], q9_policies, q9_criteria):
        require(t['sourceScoring'] == policy and t['criteria'] == criteria and t['dependencies'] == []
            and t['scoringRule'] == dict(mode=t['markingMethod'], maximum=t['originalMarks'],
                recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=[15])),
            'Q9 paired-credit/graph/contradiction source drift')
    require(tasks[48]['sourceGraph'] == {'xAxis': {'label': 'Time', 'unit': 'minutes', 'minimum': 0, 'maximum': 14, 'majorInterval': 2}, 'yAxis': {'label': 'Loss in mass', 'unit': 'g', 'minimum': 0, 'maximum': 0.7, 'majorInterval': 0.1, 'minorInterval': 0.02}, 'startsAtOrigin': True, 'increasing': True, 'flattens': True, 'exactEndMassStatedNumerically': False, 'sourceRef': {'documentId': '4CH1-2024-June-1-standard:questionPaper', 'pdfPages': [20]}}, 'Q9 sourceGraph evidence drift')
    require(tasks[48]['sourceApparatus'] == {'marbleChips': True, 'diluteHydrochloricAcid': True, 'cottonWoolAtNeck': True, 'balanceReadoutG': 220.25, 'givenEquation': 'CaCO3+2HCl→CaCl2+H2O+CO2', 'sourceRef': {'documentId': '4CH1-2024-June-1-standard:questionPaper', 'pdfPages': [19]}}, 'Q9 sourceApparatus evidence drift')
    require(tasks[49]['graphPresentation'] == {'originalGridMinorIntervalVisuallyChecked': True, 'webScaleValidated': False, 'drawingReuse': 'blocked-until-axis-and-tolerance-calibration'}, 'Q9 graphPresentation evidence drift')
    require(tasks[49]['originalGridAudit'] == {'questionPaperSha256': '1aec3bb887bbfaa925f35e9dd20bcb9e0890474467b43385fa37628d0efc96eb', 'pdfPage': 20, 'horizontalGridLines': 36, 'verticalIntervals': 35, 'yAxisMinimumG': 0, 'yAxisMaximumG': 0.7, 'gridTop': 117.1224, 'gridBottom': 315.5524, 'minorIntervalG': 0.02, 'halfSmallSquareG': 0.01, 'webScaleValidated': False}, 'Q9 originalGridAudit evidence drift')
    require([x['kind'] for t in tasks[46:51] for x in t['syllabusMappings']]
        == ['supporting', 'supporting', 'primary', 'supporting', 'primary', 'supporting', 'primary', 'supporting', 'supporting'],
        'Q9 practical coverage promotion')

    q10_policies = [{'givenReactants': ['Mg', 'HNO3'], 'givenReactantCoefficients': [1, 2], 'products': ['Mg(NO3)2', 'H2'], 'bothProductsRequired': True, 'ignoreStateSymbolsEvenIfIncorrect': True, 'recognitionStatus': 'not-implemented'}, {'startingTemperatureC': 16.0, 'highestTemperatureC': 32.4, 'givenRiseC': 16.4, 'decimalPlaces': 1, 'ecfFromIncorrectHighestTemperatureAllowed': True, 'ecfFromIncorrectStartingTemperatureAllowed': True, 'recognitionStatus': 'not-implemented'}, {'volumeCm3': 40, 'densityGPerCm3': 1, 'heatCapacityJPerGC': 4.2, 'temperatureRiseC': 16.4, 'massG': 40, 'exactProductJ': 2755.2, 'sourceShownProductJ': 2755, 'acceptedSignificantFigures': 'any except 1', 'explicitEcfFromIncorrectTemperature': False, 'explicitM2SubsumesM1': False, 'recognitionStatus': 'not-implemented'}, {'magnesiumMassG': 0.12, 'givenMagnesiumAr': 24, 'magnesiumMoles': 0.005, 'sourceHeatJ': 2755, 'sourceJMolar': 551000, 'sourceKJMolar': 551, 'result': -550, 'significantFigures': 2, 'requiredSign': 'negative', 'correctAnswerWithMinusSignWithoutWorkingCredit': 4, 'acceptedHeatAlternativesJ': [2760, 2800], 'alternative2800Result': -560, 'ecfM2From': ['incorrect answer to10.c.i', 'incorrect M1'], 'ecfM3From': 'incorrect M2', 'ecfM4From': 'incorrect M3', 'm4RequiresTwoSignificantFiguresAndCorrectSign': True, 'recognitionStatus': 'not-implemented'}, {'M1Allowed': ['insulator', 'poor conductor'], 'M2Allowed': ['less heat loss', 'more heat retained'], 'comparison': 'glass beaker', 'reject': ['no heat loss'], 'explicitM2DependencyOnM1': False, 'recognitionStatus': 'not-implemented'}]
    q10_criteria = [[{'id': '4CH1-2024-June-1-standard.Q10.a:M1', 'marks': 1, 'rule': 'Mg(NO3)2 + H2.'}], [{'id': '4CH1-2024-June-1-standard.Q10.b:M1', 'marks': 1, 'rule': 'Starting temperature16.0°C.'}, {'id': '4CH1-2024-June-1-standard.Q10.b:M2', 'marks': 1, 'rule': 'Highest temperature32.4°C.'}], [{'id': '4CH1-2024-June-1-standard.Q10.c.i:M1', 'marks': 1, 'rule': 'Q=40×4.2×16.4.'}, {'id': '4CH1-2024-June-1-standard.Q10.c.i:M2', 'marks': 1, 'rule': '2755(J), with source significant-figure allowance.'}], [{'id': '4CH1-2024-June-1-standard.Q10.c.ii:M1', 'marks': 1, 'rule': 'n(Mg)=0.12/24 or0.005.'}, {'id': '4CH1-2024-June-1-standard.Q10.c.ii:M2', 'marks': 1, 'rule': 'Q/n or2755/0.005 or551000J/mol.'}, {'id': '4CH1-2024-June-1-standard.Q10.c.ii:M3', 'marks': 1, 'rule': '551000/1000 or551kJ/mol.'}, {'id': '4CH1-2024-June-1-standard.Q10.c.ii:M4', 'marks': 1, 'rule': '−550kJ/mol, correct sign and2sf.'}], [{'id': '4CH1-2024-June-1-standard.Q10.d:M1', 'marks': 1, 'rule': 'Polystyrene is an insulator/poor conductor.'}, {'id': '4CH1-2024-June-1-standard.Q10.d:M2', 'marks': 1, 'rule': 'Less heat loss/more heat retained compared with glass.'}]]
    for t, policy, criteria in zip(tasks[51:56], q10_policies, q10_criteria):
        require(t['sourceScoring'] == policy and t['criteria'] == criteria and t['dependencies'] == []
            and t['scoringRule'] == dict(mode=t['markingMethod'], maximum=t['originalMarks'],
                recognitionStatus='not-implemented', sourceRef=dict(documentId=ms['id'], pdfPages=t['markSchemePages'])),
            'Q10 equation/temperature/precision/enthalpy source drift')
    require(tasks[52]['sourceThermometer'] == {'scaleMinimumLabelC': 30, 'scaleMaximumLabelC': 35, 'readingC': 32.4, 'requestedDecimalPlaces': 1, 'sourceRef': {'documentId': '4CH1-2024-June-1-standard:questionPaper', 'pdfPages': [22]}}, 'Q10 sourceThermometer evidence drift')
    require(tasks[54]['sourceEnthalpyData'] == {'magnesiumMassG': 0.12, 'magnesiumAr': 24, 'requestedUnit': 'kJ/mol', 'requestedSignificantFigures': 2, 'signRequested': True, 'sourceRefs': [{'documentId': '4CH1-2024-June-1-standard:questionPaper', 'pdfPages': [23]}, {'documentId': '4CH1-2024-June-1-standard:questionPaper', 'pdfPages': [2]}]}, 'Q10 sourceEnthalpyData evidence drift')
    require(tasks[51]['sourceQualification']['scopeCaution'] and
        [x['kind'] for t in tasks[51:56] for x in t['syllabusMappings']]
        == ['primary', 'supporting', 'primary', 'primary', 'supporting', 'supporting', 'supporting'],
        'Q10 acid scope or practical promotion')

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
            identity_status='agent-reviewed-whole-structure-detailed-subset', identity_notes='Q1–Q10 fifty-six parts/one-hundred-ten marks matched; Whole structural inventory matched56parts/110marks; detailed/source/scope/template gates remain. Printed/filename discrepancy and legacy variant retained.',
            batch_id=common['batch_id'], updated_at=date))
    papers = [dict(paper_id=PAPER, qualification='4CH1', year=2024, series='June', component='1C', variant='unresolved',
        qp_document_id=qp['id'], ms_document_id=ms['id'], insert_document_ids_json='[]', examiner_report_ids_json='[]',
        report_status=m['examinerReportStatus'], target_specification_id='4CH1-spec', applicability_status='partial-current-scope-review',
        stage='indexed', last_successful_stage='indexed', expected_leaf_tasks=56, indexed_leaf_tasks=56, extracted_leaf_tasks=56,
        assessed_marks=110, all_alternatives_marks='', option_rules_json=compact(dict(mode='answer-all', sourcePages=[1], wholeAllocationReviewed=False)),
        reconciled_marks='false', scheme_match_status='matched-Q1-Q10-detailed-records-processing-pending', complete_page_audit='true', template_links_complete='false',
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
    return dict(detailedTasks=56, detailedMarks=110, numberedMappings=83, fullyProcessedPapers=0, activeTemplates=0)


if __name__ == '__main__':
    print(compact(export()))
