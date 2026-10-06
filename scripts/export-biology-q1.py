"""Normalize only the visually checked Biology Q1 subset (six parts / 12 marks).

Validation and table preparation precede every write. Raw batch, incomplete
whole-paper counts and printed source qualifications cannot be promoted here.
This validates source records, not free-text or drawing responses.
"""
import csv
import hashlib
import io
import json
from pathlib import Path
from ledger_io import read_table

ROOT = Path(__file__).resolve().parents[1]
PAPER = '4BI1-2024-June-1-standard'
OVERLAY = 'research/extractions/' + PAPER + '.json'
SKILLS = 'research/syllabus-skills/4BI1-issue3-q1-selected.json'
EXPECTED = {
    '1.a.i': (1, [3], [4], [('4.6', 'primary')]),
    '1.a.ii': (2, [3], [4], [('4.7', 'primary'), ('4.6', 'supporting')]),
    '1.a.iii': (1, [3], [4], [('4.6', 'primary'), ('4.7', 'supporting')]),
    '1.b.i': (2, [4], [4], []),
    '1.b.ii': (4, [5], [5], [('2.25', 'supporting')]),
    '1.b.iii': (2, [5], [6], [('1.4', 'supporting')]),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def prepare(root=ROOT, overlay=None):
    root = Path(root)
    def read(path):
        return json.loads((root / path).read_text())
    m = read(OVERLAY) if overlay is None else overlay
    require(m['paperId'] == PAPER and m['qualification'] == '4BI1', 'Wrong bounded paper')
    require(m['paperStage'] == 'indexed' and m['status'] == 'partial-detailed-extraction'
            and m['fullyProcessed'] is False and m['humanReviewed'] is False
            and m['marksReconciled'] is False and m['wholePaperLeafCount'] is None,
            'Partial subset must not promote full processing, denominator or human review')
    require(m['wholePaperMarks'] == 110 and m['detailedLeafTasks'] == 6
            and m['detailedOriginalMarks'] == 12 and m['reviewedQuestionTotals'] == {'1': 12}
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
    for key, doc, count, pages in [('questionPaper', qp, 32, [2, 3, 4, 5]), ('markScheme', ms, 24, [3, 4, 5, 6])]:
        r, a = raw[key], m['pageAudit'][key]
        require(doc['id'] == PAPER + ':' + key and doc['sha256'] == r['sha256'] == cover[key + 'Sha256']
                and doc['url'] == r['url'] and doc['pageCount'] == r['pageCount'] == count, 'Document/hash mismatch')
        require(a == dict(visuallyReviewedPages=pages, wholeDocumentReviewed=False), 'Partial page audit drift')
    source = next(s for s in read('research/sources.json') if s['id'] == '4BI1-spec')
    spec = m['currentSpecification']
    require(spec == dict(documentId=source['id'], sha256=source['sha256'], issue='3', reviewedPages=[18, 21, 29, 49], wholeHistoricalAmendmentReconciliation='pending'), 'Specification scope drift')
    skills = read(SKILLS)
    require(skills['specificationDocumentId'] == spec['documentId'] and skills['specificationSha256'] == spec['sha256']
            and skills['humanReviewed'] is False and skills['reviewedPages'] == [49]
            and [(s['id'], s['pdfPage'], s['appliesToBiology']) for s in skills['skills']]
            == [('4BI1:issue3:mathematical:' + i, 49, True) for i in ['1A', '1C', '3C']], 'Selected mathematical skill scope drift')
    points = {p['point_id']: p for p in read_table(root / 'research/ledger/v1', 'syllabus-points')[1]}
    tasks = m['tasks']
    require(len(tasks) == len(EXPECTED) and len({t['taskId'] for t in tasks}) == 6
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
    require(t['mathematicalSkillIds'] == [s['id'] for s in skills['skills']]
            and skills['taskMappings'] == [dict(taskId=t['taskId'], skillIds=t['mathematicalSkillIds'], scope='required-operations-only', humanReviewed=False)], 'Skills must remain separate from numbered mappings')
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
    require(sum(t['originalMarks'] for t in tasks) == 12 and m['blockers'] and m['processingNotes'], 'Subset reconciliation/gaps missing')

    date = m['reviewDate']
    common = dict(reviewed_by=m['reviewer'], reviewer_type='agent', human_reviewed='false', batch_id='biology-q1-detailed-' + date, updated_at=date)
    documents = []
    for key, doc in [('questionPaper', qp), ('markScheme', ms)]:
        reviews = [dict(page=1, mode='visual-cover', reviewer='Codex cover visual review', date='2026-09-09')]
        reviews += [dict(page=p, mode='visual-Q1-subset', reviewer=m['reviewer'], date=date) for p in m['pageAudit'][key]['visuallyReviewedPages']]
        documents.append(dict(document_id=doc['id'], qualification='4BI1', document_type=doc['type'], canonical_url=doc['url'], title='4BI1/1B Summer 2024 ' + doc['type'], publisher='Pearson', year=2024, series='June', component='1B', variant='unresolved', printed_exam_date='2024-05-10' if key == 'questionPaper' else '', filename_date='2024-05-11' if key == 'questionPaper' else '', sha256=doc['sha256'], page_count=doc['pageCount'], access_status='obtained', local_evidence_path=OVERLAY, reviewed_pages_json=compact(reviews), identity_status='agent-reviewed-subset', identity_notes='Cover match plus Q1 task pairing only. Legacy standard variant unresolved; printed/filename date conflict retained. Whole-page audit pending.', batch_id=common['batch_id'], updated_at=date))
    papers = [dict(paper_id=PAPER, qualification='4BI1', year=2024, series='June', component='1B', variant='unresolved', qp_document_id=qp['id'], ms_document_id=ms['id'], insert_document_ids_json='[]', examiner_report_ids_json='[]', report_status=m['examinerReportStatus'], target_specification_id=spec['documentId'], applicability_status='partial-current-scope-review', stage='indexed', last_successful_stage='indexed', expected_leaf_tasks='', indexed_leaf_tasks=6, extracted_leaf_tasks=6, assessed_marks=110, all_alternatives_marks='', option_rules_json=compact(dict(mode='answer-all', sourcePages=[2], wholeAllocationReviewed=False)), reconciled_marks='false', scheme_match_status='cover-and-Q1-subset-match-only', complete_page_audit='false', template_links_complete='false', blocking_issues_json=compact(m['blockers']), reviewed_at=date, **common)]
    task_rows, mappings = [], []
    for t in tasks:
        task_rows.append(dict(task_id=t['taskId'], paper_id=PAPER, question_path=t['questionPath'], record_kind='leaf', qp_pages_json=compact(t['questionPaperPages']), stimulus_refs_json=compact(t['stimulusRefs']), scheme_pages_json=compact(t['markSchemePages']), command_word=t['commandWord'], original_marks=t['originalMarks'], assessment_objectives_json='[]', required_knowledge='; '.join(t['requiredKnowledge']), context_summary=t['contextSummary'], stimulus_types_json=compact(t['stimulusTypes']), solution_structure_json=compact(t['solutionStructure']), marking_method=t['markingMethod'], rubric_ref=OVERLAY + '#' + t['taskId'], acceptable_alternatives_json=compact(t['acceptableAlternatives']), dependencies_json=compact(t['dependencies']), common_errors_json=compact(t['commonErrors']), report_refs_json='[]', extraction_status='source-checked', mapping_status='selected-mathematical-skills-only' if not t['syllabusMappings'] else 'agent-reviewed-partial-current-scope', review_status='agent-reviewed', blocker='; '.join(t['blockers']), **common))
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
    return dict(detailedTasks=6, detailedMarks=12, numberedMappings=7, fullyProcessedPapers=0, activeTemplates=0)


if __name__ == '__main__':
    print(compact(export()))
