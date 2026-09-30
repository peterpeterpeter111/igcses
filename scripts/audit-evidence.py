"""Read-only reconciliation of saved evidence; never interprets or promotes it.

No downloads, PDF extraction, syllabus mapping or educational judgement.
An optional report uses exclusive creation to preserve previous audit evidence.
"""
import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from ledger_io import read_table


ROOT = Path(__file__).resolve().parents[1]


def audit(root=ROOT):
    def read(path):
        return json.loads((root / path).read_text())

    errors, gaps = [], []
    tables = {}
    for path in sorted((root / 'research/ledger/v1').glob('*.csv')):
        fields, rows = read_table(path.parent, path.stem)
        if not fields or len(fields) != len(set(fields)):
            errors.append({'kind': 'invalid-csv-header', 'file': path.name})
            continue
        seen = set()
        for number, row in enumerate(rows, 2):
            if set(row) != set(fields) or any(value is None for value in row.values()):
                errors.append({'kind': 'invalid-csv-row', 'file': path.name, 'row': number})
                continue
            key = (row['template_id'], row['version']) if path.stem == 'templates' else row[fields[0]]
            if not key or key in seen:
                errors.append({'kind': 'duplicate-or-empty-id', 'file': path.name, 'row': number})
            seen.add(key)
            for field, value in row.items():
                if field.endswith('_json') and value:
                    try:
                        json.loads(value)
                    except json.JSONDecodeError:
                        errors.append({'kind': 'invalid-json-cell', 'file': path.name, 'row': number, 'field': field})
        tables[path.stem] = rows

    sources = read('research/sources.json')
    batch = read('research/batches/2026-09-08-cross-subject-lower-01.manifest.json')
    pilot = read('research/pilot/4EB1-2024-November-01.json')
    extractions = [json.loads(p.read_text()) for p in sorted((root / 'research/extractions').glob('*.json'))]
    inventories = [json.loads(p.read_text()) for p in sorted((root / 'research/syllabus').glob('*.json'))]
    notes = [json.loads(p.read_text()) for p in sorted((root / 'content/notes').glob('*.json'))]
    audits = [json.loads(p.read_text()) for p in sorted((root / 'research/curriculum-audits').glob('*.json'))]
    families = [json.loads(p.read_text()) for p in sorted((root / 'research/templates').glob('*.json'))]
    discovery_candidates = [record for p in sorted((root / 'research/discovery').glob('*.json'))
                            for record in json.loads(p.read_text())['records']]
    paper_reviews = [json.loads(p.read_text()) for p in sorted((root / 'research/paper-reviews').glob('*.json'))]
    cover_reviewed_ids = set()
    for review in paper_reviews:
        candidate = next((r for r in discovery_candidates if r['id'] == review['candidateId']), None)
        if not candidate or review['qualification'] != candidate['qualification'] or any(
                review[k + 'Sha256'] != candidate[k]['sha256'] for k in ['questionPaper', 'markScheme']):
            errors.append({'kind': 'cover-review-source-mismatch', 'id': review['candidateId']})
        elif review['identityStatus'] == 'cover-checked' and review['coverPairingStatus'] == 'matched':
            cover_reviewed_ids.add(candidate['id'])
    documents = {s['id']: s for s in sources}
    documents.update({d['id']: d for d in pilot['documents'] + [d for e in extractions for d in e['documents']]})
    expected_documents = [{'id': s['id'], 'sha256': s['sha256']} for s in sources]
    expected_documents += [{'id': d['id'], 'sha256': d['sha256']} for d in pilot['documents']]
    for paper in batch['records']:
        for kind in ['questionPaper', 'markScheme']:
            expected_documents.append({'id': paper['paperId'] + ':' + kind, 'sha256': paper[kind]['sha256']})
    for paper in discovery_candidates:
        for kind in ['questionPaper', 'markScheme']:
            if paper[kind]['accessStatus'] == 'obtained':
                expected_documents.append({'id': paper['id'] + ':' + kind, 'sha256': paper[kind]['sha256']})
    # Hash existing files only; matching bytes does not verify content or pairing.
    local_hashes = {}
    for path in sorted((root / 'work').rglob('*.pdf')):
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        local_hashes.setdefault(digest, []).append(str(path.relative_to(root)))
    local_evidence = []
    for document in expected_documents:
        paths = local_hashes.get(document['sha256'], [])
        local_evidence.append({**document, 'matchingLocalFiles': paths})
        if not paths:
            gaps.append({'kind': 'missing-local-pdf', 'id': document['id']})

    point_rows = {r['point_id']: r for r in tables['syllabus-points']}
    coverage_rows = {r['coverage_id']: r for r in tables['coverage']}
    expected_points, expected_coverage = set(), set()
    for inventory in inventories:
        for point in inventory['points']:
            expected_points.add(point['id'])
            row = point_rows.get(point['id'])
            if not row or (row['official_reference'], row['specification_document_id'], row['pdf_page']) != (
                    point['reference'], inventory['specificationDocumentId'], str(point['pdfPage'])):
                errors.append({'kind': 'syllabus-export-mismatch', 'id': point['id']})
            for heading in point['noteSectionIds']:
                key = point['id'] + ':' + heading
                expected_coverage.add(key)
                target = [(n, s) for n in notes if n['sourceId'] == inventory['specificationDocumentId']
                          and n['chapterId'] == point['chapterId'] for s in n['sections'] if s['id'] == heading]
                row = coverage_rows.get(key)
                if len(target) != 1 or not row:
                    errors.append({'kind': 'missing-or-ambiguous-teaching-link', 'id': key})
                    continue
                note, section = target[0]
                if point['reference'] not in section.get('points', []) or point['pdfPage'] not in note['sourcePages']:
                    errors.append({'kind': 'teaching-source-mismatch', 'id': key})
                if (row['point_id'], row['chapter_id'], row['heading_id'], row['explanation_status']) != (
                        point['id'], point['chapterId'], heading, point['teachingCoverage']):
                    errors.append({'kind': 'coverage-export-mismatch', 'id': key})
                try:
                    refs = json.loads(row['source_refs_json'])
                    examples = json.loads(row['example_ids_json'])
                except json.JSONDecodeError:
                    continue  # Already recorded as an invalid JSON cell above.
                if not any(ref.get('documentId') == inventory['specificationDocumentId']
                           and ref.get('pdfPages') == [point['pdfPage']] for ref in refs):
                    errors.append({'kind': 'coverage-source-page-mismatch', 'id': key})
                if examples != ([heading + ':example'] if section.get('example') else []):
                    errors.append({'kind': 'coverage-example-mismatch', 'id': key})
    for name, actual, expected in [('syllabus-points', set(point_rows), expected_points),
                                    ('coverage', set(coverage_rows), expected_coverage)]:
        for key in sorted(actual - expected):
            errors.append({'kind': 'unmodelled-ledger-row', 'table': name, 'id': key})

    normal_docs = {r['document_id'] for r in tables['documents']}
    # Metadata transcription closes reference gaps, not academic review gates.
    source_fields = {'qualification': 'qualification', 'document_type': 'documentType',
                     'canonical_url': 'url', 'title': 'title', 'publisher': 'publisher',
                     'specification_issue': 'specificationIssue', 'sha256': 'sha256',
                     'page_count': 'pages', 'access_status': 'status'}
    normalized_documents = {r['document_id']: r for r in tables['documents']}
    for source in sources:
        row = normalized_documents.get(source['id'])
        if row and any(row[field] != str(source[source_field]) for field, source_field in source_fields.items()):
            errors.append({'kind': 'specification-document-metadata-mismatch', 'id': source['id']})
        if row and row['identity_status'] == 'metadata-only':
            try:
                if json.loads(row['reviewed_pages_json']) != []:
                    errors.append({'kind': 'metadata-export-claims-page-review', 'id': source['id']})
            except json.JSONDecodeError:
                pass  # The CSV cell validation above already records this error.
    normal_tasks = {r['task_id'] for r in tables['tasks']}
    paper_ids = {r['paper_id'] for r in tables['papers']}
    for candidate in discovery_candidates:
        if candidate['id'] not in paper_ids:
            gaps.append({'kind': 'candidate-pair-only-in-discovery-json', 'id': candidate['id'],
                         'note': 'Discovery overlay remains separate from normalized paper rows; check cover review overlays and task-index status.'})
    pilot_tasks = {t['id'] for t in pilot['tasks']}
    family_ids = {(f['id'], f['version']) for f in families}
    for row in tables['tasks']:
        if row['paper_id'] not in paper_ids:
            errors.append({'kind': 'task-paper-reference-missing', 'id': row['task_id']})
    for row in tables['task-mappings']:
        if row['task_id'] not in normal_tasks or row['point_id'] not in point_rows:
            errors.append({'kind': 'task-mapping-reference-missing', 'id': row['mapping_id']})
    for row in tables['template-links']:
        if (row['template_id'], row['template_version']) not in family_ids:
            errors.append({'kind': 'template-reference-missing', 'id': row['link_id']})
        if row['task_id'] not in normal_tasks:
            if row['task_id'] in pilot_tasks:
                gaps.append({'kind': 'template-task-only-in-pilot-json', 'id': row['task_id']})
            else:
                errors.append({'kind': 'template-task-reference-missing', 'id': row['task_id']})
    # A normalized ledger is not yet self-contained. Sidecar evidence is valid,
    # but must not be silently counted as a normalized database row.
    for row in tables['syllabus-points']:
        ref = row['specification_document_id']
        if ref not in documents:
            errors.append({'kind': 'specification-reference-missing', 'id': ref})
    for ref in sorted(set(r['specification_document_id'] for r in tables['syllabus-points']) - normal_docs):
        gaps.append({'kind': 'specification-only-in-source-json', 'id': ref})
    if not tables['batches']:
        gaps.append({'kind': 'normalized-batch-table-empty', 'note': 'Historical JSON batch manifests remain authoritative.'})
    if not tables['links']:
        gaps.append({'kind': 'normalized-discovery-links-empty', 'note': 'Raw paper-ledger.json remains authoritative.'})

    raw = read('research/paper-ledger.json')
    per_subject = []
    for source in sources:
        code = source['qualification']
        teaching = [n for n in notes if n['sourceId'] == source['id']]
        indexed = [r for r in batch['records'] if r['qualification'] == code]
        obtained_candidates = [r for r in discovery_candidates if r['qualification'] == code
                               and all(r[k]['accessStatus'] == 'obtained' for k in ['questionPaper', 'markScheme'])]
        parents = [p for i in inventories if i['qualification'] == code for p in i['points']]
        local_requirements = [r for a in audits if a['qualification'] == code for p in a['parents'] for r in p['requirements']]
        per_subject.append({
            'qualification': code,
            'rawDiscoveredDocumentLinks': dict(sorted(Counter(r['documentType'] for r in raw if r['qualification'] == code).items())),
            'obtainedPairs': sum(all(r[k]['accessStatus'] == 'obtained' for k in ['questionPaper', 'markScheme']) for r in indexed)
                + int(code == pilot['qualification'] and all(any(d['type'] == kind and d['accessStatus'] == 'obtained'
                    for d in pilot['documents']) for kind in ['question-paper', 'mark-scheme'])) + len(obtained_candidates),
            'obtainedCandidatePairsPendingReview': sum(r['id'] not in cover_reviewed_ids for r in obtained_candidates),
            'additionalPairsWithCoverReview': sum(r['id'] in cover_reviewed_ids for r in obtained_candidates),
            'partialNoteDocuments': len(teaching),
            'noteSections': sum(len(n['sections']) for n in teaching),
            'reviewedParentIdentities': len(parents),
            'partialLocalRequirements': sum(r['completionStatus'] == 'partial' for r in local_requirements),
            'normalizedPaperRows': sum(r['qualification'] == code for r in tables['papers']),
            'normalizedFullyProcessedPapers': sum(r['qualification'] == code and r['stage'] == 'processed' for r in tables['papers']),
            'activeTemplates': sum(f['subject'] == code and f['status'] == 'active' for f in families),
        })
    return {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'scope': 'Offline structural reconciliation and byte hashes only. No new discovery, paper processing, educational validation or completion promotion.',
        'csvRowCounts': {name: len(rows) for name, rows in tables.items()},
        'subjects': per_subject, 'localEvidence': local_evidence,
        'errors': errors, 'normalizationAndEvidenceGaps': gaps,
        'educationalReadinessCertified': False,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, help='Create a new JSON report; refuses to overwrite.')
    args = parser.parse_args()
    report = audit()
    encoded = json.dumps(report, indent=2) + '\n'
    if args.output:
        with args.output.open('x') as stream:
            stream.write(encoded)
    print(encoded)
    raise SystemExit(1 if report['errors'] else 0)
