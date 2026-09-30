"""Export one reviewed inventory and its note links, preserving unrelated rows."""
import csv
import json
import sys
from pathlib import Path
from ledger_io import read_table, read_csv, coverage_partitions


def encode(value):
    """Keep embedded JSON lossless and compact for reviewed source sync."""
    return json.dumps(value, separators=(",", ":"))

root = Path(__file__).resolve().parents[1]
path = Path(sys.argv[1]).resolve()
if path.parent != root / 'research/syllabus':
    raise ValueError('Expected a reviewed syllabus inventory')
inventory = json.loads(path.read_text())
notes = [json.loads(p.read_text()) for p in (root / 'content/notes').glob('*.json')]
date = inventory['reviewDate']
point_rows, coverage_rows = [], []
for point in inventory['points']:
    if not point['statementVerified'] or point['humanReviewed'] or point['substatementAuditComplete']:
        raise ValueError('This exporter is limited to agent-reviewed partial parent coverage')
    point_rows.append(dict(point_id=point['id'], qualification=inventory['qualification'], specification_document_id=inventory['specificationDocumentId'], specification_issue=inventory['specificationIssue'], official_reference=point['reference'], parent_point_id='', reference_kind='statement', short_original_summary=point['summary'], pdf_page=point['pdfPage'], printed_page=point['printedPage'], applicable_components_json=encode(point['components']), applicability_status='current-specification', extraction_status='source-checked', reviewed_by=inventory['reviewedBy'], reviewer_type='agent', human_reviewed='false', updated_at=date))
    for heading in point['noteSectionIds']:
        coverage_date = point.get('teachingReviewedAt', date)
        matches = [(n, s) for n in notes if n['sourceId'] == inventory['specificationDocumentId'] and n['chapterId'] == point['chapterId'] for s in n['sections'] if s['id'] == heading]
        if len(matches) != 1:
            raise ValueError('Ambiguous or missing teaching target: ' + heading)
        note, section = matches[0]
        if point['reference'] not in section.get('points', []) or point['pdfPage'] not in note['sourcePages']:
            raise ValueError('Teaching link lacks its exact source page or point')
        if note['complete'] or note['humanReviewed'] or point['teachingCoverage'] != 'partial':
            raise ValueError('Do not promote completion through this exporter')
        coverage_rows.append(dict(coverage_id=point['id']+':'+heading, point_id=point['id'], chapter_id=point['chapterId'], heading_id=heading, explanation_status='partial', example_ids_json=encode([heading+':example'] if section.get('example') else []), answer_template_ids_json='[]', source_refs_json=encode([dict(documentId=inventory['specificationDocumentId'], pdfPages=[point['pdfPage']], provenanceKind='source-fact', observation='Specification scope reviewed; explanation and examples are original teaching content.')]), draft_status='drafted', source_check_status='agent-source-checked', human_review_status='not-reviewed', checked_by=inventory['reviewedBy'], checked_at=coverage_date, blockers_json=encode(['Substatement audit pending', 'Assessment-family and whole-chapter review incomplete']), updated_at=coverage_date))

# Validate both table shapes before changing either file.
pending = []
ids = {p['id'] for p in inventory['points']}
for name, key, additions in [('syllabus-points', 'point_id', point_rows), ('coverage', 'coverage_id', coverage_rows)]:
    directory = root / 'research/ledger/v1'
    fields, rows = read_table(directory, name)
    target = directory / (name + '.csv')
    if name == 'coverage' and (directory / 'coverage-partitions.json').exists():
        partitions = coverage_partitions(directory)
        target = partitions[inventory['qualification']]
        _, rows = read_csv(target)
    if len({r[key] for r in additions}) != len(additions) or any(set(r) != set(fields) for r in additions):
        raise ValueError('Invalid or duplicate export row')
    retained = [r for r in rows if r['point_id'] not in ids]
    pending.append((target, fields, retained + additions))
for target, fields, rows in pending:
    with target.open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fields, lineterminator='\n')
        writer.writeheader()
        writer.writerows(rows)
print(encode(dict(inventory=path.name, reviewedParents=len(point_rows), partialLinks=len(coverage_rows), completePoints=0)))
