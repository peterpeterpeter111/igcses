"""Normalize ten source-checked Chemistry Q1–Q2 leaves without promoting processing.

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


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def prepare(root=ROOT, overlay=None):
    root = Path(root)
    m = overlay if overlay is not None else read_extraction(root / OVERLAY)
    require(m['paperId'] == PAPER and m['qualification'] == '4CH1'
            and m['detailedLeafTasks'] == 10 and m['detailedOriginalMarks'] == 16
            and m['reviewedQuestionTotals'] == {'1': 7, '2': 9}, 'Q1 identity/count drift')
    require(m['fullyProcessed'] is False and m['humanReviewed'] is False
            and m['marksReconciled'] is False and m['paperStage'] == 'indexed'
            and m['wholePaperLeafCount'] is None and m['wholePaperMarks'] == 110
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
    require(m['pageAudit'] == dict(questionPaper=dict(visuallyReviewedPages=[3, 4, 5], wholeDocumentReviewed=False),
            markScheme=dict(visuallyReviewedPages=[4, 5], wholeDocumentReviewed=False)), 'Bounded page scope drift')
    tasks = m['tasks']
    require([t['questionPath'] for t in tasks] == ['1.a', '1.b', '2.a.i', '2.a.ii', '2.a.iii', '2.a.iv', '2.a.v', '2.b.i', '2.b.ii', '2.b.iii']
            and [t['originalMarks'] for t in tasks] == [5, 2, 1, 1, 1, 1, 1, 1, 1, 2], 'Five table positions must remain one leaf')
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
    expected_mappings = [['1.20', '2.5', '1.49', '4.44'], ['2.44'], ['2.15'], ['2.17'], ['1.25'], ['2.15'], [], ['3.1'], ['2.16'], ['2.20']]
    _, points = read_table(root / 'research/ledger/v1', 'syllabus-points')
    points = {p['point_id']: p for p in points}
    for i, t in enumerate(tasks):
        tid = PAPER + '.Q' + t['questionPath']
        require(t['paperId'] == PAPER and t['taskId'] == tid and t['recordKind'] == 'leaf'
                and t['questionPaperPages'] == ([3] if i < 2 else [4] if i < 7 else [5])
                and t['markSchemePages'] == ([4] if i < 2 else [5])
                and t['humanReviewed'] is False and t['assessmentObjectives'] == []
                and t['templateLinkStatus'] == 'candidate-only' and t['extractionStatus'] == 'source-checked'
                and t['sourceQualification']['generatedUse'].startswith('blocked-until-')
                and t['sourceQualification']['sourceRef'] == dict(documentId=ms['id'], pdfPages=t['markSchemePages']) and t['blockers'], 'Unsupported task promotion/source drift')
        require([c['id'] for c in t['criteria']] == [tid + ':' + label for label in (['row-1', 'row-2', 'row-3', 'row-4', 'row-5'] if i == 0 else ['M1', 'M2'] if i in [1, 9] else ['M1'])]
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
    for t, policy in zip(tasks[2:], policies):
        require(t['sourceScoring'] == policy and t['scoringRule']['maximum'] == t['originalMarks']
                and t['scoringRule']['recognitionStatus'] == 'not-implemented', 'Q2 source concession/credit drift')

    date = m['reviewDate']
    common = dict(reviewed_by=m['reviewer'], reviewer_type='agent', human_reviewed='false',
                  batch_id='chemistry-detailed-' + date, updated_at=date)
    documents = []
    for key, doc in [('questionPaper', qp), ('markScheme', ms)]:
        pages = [dict(page=1, mode='visual-cover', reviewer='Codex cover review', date='2026-09-09')]
        pages += [dict(page=p, mode='visual-detailed-subset', reviewer=m['reviewer'], date=date)
                  for p in m['pageAudit'][key]['visuallyReviewedPages']]
        documents.append(dict(document_id=doc['id'], qualification='4CH1', document_type=doc['type'], canonical_url=doc['url'],
            title='4CH1/1C Summer 2024 ' + doc['type'], publisher='Pearson', year=2024, series='June', component='1C',
            variant='unresolved', printed_exam_date='2024-05-17' if key == 'questionPaper' else '',
            filename_date='2024-05-18' if key == 'questionPaper' else '', sha256=doc['sha256'], page_count=doc['pageCount'],
            access_status='obtained', local_evidence_path=OVERLAY, reviewed_pages_json=compact(pages),
            identity_status='agent-reviewed-detailed-subset', identity_notes='Q1–Q2 ten parts/sixteen marks matched; whole inventory and source/scope/template gates remain. Printed/filename discrepancy and legacy variant retained.',
            batch_id=common['batch_id'], updated_at=date))
    papers = [dict(paper_id=PAPER, qualification='4CH1', year=2024, series='June', component='1C', variant='unresolved',
        qp_document_id=qp['id'], ms_document_id=ms['id'], insert_document_ids_json='[]', examiner_report_ids_json='[]',
        report_status=m['examinerReportStatus'], target_specification_id='4CH1-spec', applicability_status='partial-current-scope-review',
        stage='indexed', last_successful_stage='indexed', expected_leaf_tasks='', indexed_leaf_tasks=10, extracted_leaf_tasks=10,
        assessed_marks=110, all_alternatives_marks='', option_rules_json=compact(dict(mode='answer-all', sourcePages=[1], wholeAllocationReviewed=False)),
        reconciled_marks='false', scheme_match_status='matched-Q1-detailed-subset', complete_page_audit='false', template_links_complete='false',
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
    return dict(detailedTasks=10, detailedMarks=16, numberedMappings=12, fullyProcessedPapers=0, activeTemplates=0)


if __name__ == '__main__':
    print(compact(export()))
