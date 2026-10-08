"""Export saved research families without promoting their readiness."""
import argparse
import csv
from datetime import date
import io
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--date', required=True, type=date.fromisoformat)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
updated = args.date.isoformat()
paths = sorted((root / 'research/templates').glob('*.json'))
families = [(path, json.loads(path.read_text())) for path in paths]
ids = [f['id'] + '@' + f['version'] for _, f in families]
if len(ids) != len(set(ids)):
    raise ValueError('Duplicate family/version identity')
# Validate the actual contracts before constructing either ledger.
subprocess.run(['node', '--input-type=module', '-e', """
import { readFileSync } from 'node:fs';
import { templateContractErrors } from './scripts/template-contract.mjs';
for (const path of process.argv.slice(1)) {
  const errors = templateContractErrors(JSON.parse(readFileSync(path, 'utf8')));
  if (errors.length) throw new Error(path + ': ' + errors.join('; '));
}
""", *[str(p) for p in paths]], cwd=root, check=True)

encode = lambda value: json.dumps(value, ensure_ascii=False, separators=(',', ':'))
templates, links = [], []
for path, family in families:
    for ref in family['validation']['runRefs']:
        if not (root / ref).is_file():
            raise ValueError('Missing validation evidence: ' + ref)
    templates.append(dict(
        template_id=family['id'], version=family['version'], qualification=family['subject'],
        origin=family['origin'], schema_path=str(path.relative_to(root)), family_status=family['status'],
        original_marks_json=encode(family['originalMarks']),
        validated_custom_marks_json=encode(family['customQuiz']['validatedMarks']),
        source_task_ids_json=encode([t['taskId'] for t in family['sourceTasks']]),
        syllabus_point_ids_json=encode([r['pointId'] for r in family['syllabusRefs']]),
        generator_status=('experimental-implemented' if family['status'] not in ['validated', 'active'] else 'implemented') if family['runtime']['implemented'] else 'not-implemented',
        validation_run_ids_json=encode(family['validation']['runRefs']),
        pedagogy_review_status=family['review']['pedagogyStatus'],
        human_reviewed=str(family['review']['humanReviewed']).lower(),
        blocker=' | '.join(family['review']['blockers']), updated_at=updated,
    ))
    for task in family['sourceTasks']:
        links.append(dict(
            link_id=family['id'] + '@' + family['version'] + ':' + task['taskId'],
            task_id=task['taskId'], template_id=family['id'], template_version=family['version'],
            relationship='derived', original_marks=task['originalMarks'],
            custom_marks_json=encode(family['customQuiz']['candidateMarks']),
            adaptation_validation_status=family['customQuiz']['adaptationStatus'],
            evidence_refs_json=encode([task['questionPaper'], task['markScheme']]),
            review_status=family['review']['pedagogyStatus'], updated_at=updated,
        ))

pending = []
for name, rows, identity in [('templates', templates, 'template_id'), ('template-links', links, 'link_id')]:
    target = root / 'research/ledger/v1' / (name + '.csv')
    with target.open() as stream:
        reader = csv.DictReader(stream)
        fields, existing = reader.fieldnames, list(reader)
    if any(set(row) != set(fields) for row in rows):
        raise ValueError('Ledger shape mismatch: ' + name)
    keys = {(row['template_id'], row['version']) if name == 'templates' else row[identity] for row in rows}
    existing_keys = {(row['template_id'], row['version']) if name == 'templates' else row[identity] for row in existing}
    if not existing_keys <= keys:
        raise ValueError('Refusing to discard unmodelled ledger records: ' + name)
    if len(keys) != len(rows):
        raise ValueError('Duplicate ledger identity: ' + name)
    # Keep the export timestamp of unchanged records. A new evidence link in
    # one family must not make every unrelated family look newly reviewed.
    def row_key(row):
        return (row['template_id'], row['version']) if name == 'templates' else row[identity]
    previous = {row_key(row): row for row in existing}
    for row in rows:
        old = previous.get(row_key(row))
        if old and all(old[key] == str(value) for key, value in row.items() if key != 'updated_at'):
            date.fromisoformat(old['updated_at'])
            row['updated_at'] = old['updated_at']
    output = io.StringIO(newline='')
    writer = csv.DictWriter(output, fields, lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)
    pending.append((target, output.getvalue()))
latest = {}
for _, family in families:
    previous = latest.get(family['id'])
    if previous is None or tuple(map(int, family['version'].split('.'))) > tuple(map(int, previous['version'].split('.'))):
        latest[family['id']] = family
summary = [dict(id=f['id'], version=f['version'], qualification=f['subject'], status=f['status'], runtimeImplemented=f['runtime']['implemented']) for f in latest.values()]
pending.append((root / 'research/template-summaries.json', json.dumps(summary, indent=2) + '\n'))
if args.check:
    for target, expected in pending:
        if target.read_text() != expected:
            raise ValueError('Ledger differs from saved families: ' + target.name)
else:
    for target, expected in pending:
        target.write_text(expected)
print(json.dumps({'families': len(templates), 'distinctFamilies': len(latest), 'sourceLinks': len(links), 'activeTemplates': sum(f['status'] == 'active' for _, f in families), 'checkOnly': args.check}))
