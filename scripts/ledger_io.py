"""Read normalized CSV tables, including explicitly declared subject partitions.

The root CSV remains the schema header. Partitioned data is never inferred from
whatever files happen to exist: the manifest must list every subject file.
"""
import csv
import io
import json
import re
from pathlib import Path


def read_csv(path):
    with path.open(newline='') as stream:
        reader = csv.DictReader(stream)
        fields, rows = reader.fieldnames, list(reader)
    if not fields or len(fields) != len(set(fields)):
        raise ValueError('Invalid ledger header: ' + str(path))
    if any(set(row) != set(fields) or any(v is None for v in row.values()) for row in rows):
        raise ValueError('Invalid ledger row: ' + str(path))
    return fields, rows


def table_partitions(directory, name):
    if name not in ('coverage', 'syllabus-points', 'tasks'):
        raise ValueError('Unsupported partitioned table')
    directory = Path(directory)
    manifest = json.loads((directory / (name + '-partitions.json')).read_text())
    version = manifest.get('schemaVersion')
    if version not in (1, 2) or manifest.get('table') != name or manifest.get('schemaPath') != name + '.csv':
        raise ValueError('Unsupported ledger partition contract')
    entries = manifest['partitions']
    if name == 'tasks' and [entry['qualification'] for entry in entries] != ['4HB1', '4BI1', '4CH1', '4PH1', '4EB1', '4MB1']:
        raise ValueError('Task partitions must declare every qualification in canonical order')
    result = {}
    for entry in entries:
        code = entry['qualification']
        if not re.fullmatch(r'4[A-Z]{2}1', code) or code in result:
            raise ValueError('Invalid or repeated ledger subject')
        if set(entry) != {'qualification', 'path' if version == 1 else 'paths'}:
            raise ValueError('Ambiguous partition entry')
        filenames = [entry['path']] if version == 1 else entry['paths']
        if not isinstance(filenames, list) or not filenames:
            raise ValueError('Empty or malformed partition paths')
        expected = [name + '/' + code + '.csv'] if len(filenames) == 1 else [name + '/' + code + f'-{i:03}.csv' for i in range(1, len(filenames) + 1)]
        if filenames != expected or (version == 1 and len(filenames) != 1):
            raise ValueError('Invalid or unordered partition paths')
        paths = [directory / filename for filename in filenames]
        if (directory / name).is_symlink() or any(path.is_symlink() or not path.is_file() for path in paths):
            raise ValueError('Missing or linked ledger partition')
        result[code] = paths
    if not result or set((directory / name).glob('*.csv')) != {p for paths in result.values() for p in paths}:
        raise ValueError('Undeclared ledger partition')
    return result


def coverage_partitions(directory):
    return table_partitions(directory, 'coverage')


def read_table(directory, name):
    directory = Path(directory)
    fields, rows = read_csv(directory / (name + '.csv'))
    if name not in ('coverage', 'syllabus-points', 'tasks') or not (directory / (name + '-partitions.json')).exists():
        return fields, rows
    if rows:
        raise ValueError('Partitioned root must contain only its schema header')
    seen = set()
    for code, paths in table_partitions(directory, name).items():
        for path in paths:
            part_fields, part_rows = read_csv(path)
            if part_fields != fields:
                raise ValueError('Ledger partition header differs: ' + str(path))
            for row in part_rows:
                identity = row['task_id'] if name == 'tasks' else row['coverage_id'] if name == 'coverage' else row['point_id']
                if name == 'tasks':
                    if not row['paper_id'].startswith(code + '-') or identity != row['paper_id'] + '.Q' + row['question_path']:
                        raise ValueError('Ledger task has wrong subject or paper identity')
                elif not row['point_id'].startswith(code + ':') or (name == 'coverage' and not identity.startswith(row['point_id'] + ':')) or (name == 'syllabus-points' and row['qualification'] != code):
                    raise ValueError('Ledger row has wrong subject or point identity')
                if identity in seen:
                    raise ValueError('Duplicate ledger identity across partitions')
                seen.add(identity)
            rows.extend(part_rows)
    return fields, rows


def csv_text(fields, rows):
    stream = io.StringIO(newline='')
    writer = csv.DictWriter(stream, fields, lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue()


def table_outputs(directory, name, fields, rows, qualification):
    """Prepare a validated table replacement; task exports touch one subject only.

    No writes occur here. Foreign rows must be exactly preserved, even when the
    caller supplies a complete logical table. Manifest order is authoritative.
    """
    directory, rows = Path(directory), list(rows)
    if any(set(row) != set(fields) or any(value is None for value in row.values()) for row in rows):
        raise ValueError('Malformed output row')
    if name != 'tasks' or not (directory / 'tasks-partitions.json').exists():
        return {directory / (name + '.csv'): csv_text(fields, rows)}
    saved_fields, old = read_table(directory, name)
    partitions = table_partitions(directory, name)
    if fields != saved_fields or qualification not in partitions:
        raise ValueError('Task export schema/subject mismatch')
    seen = set()
    for row in rows:
        code = row['paper_id'].split('-')[0]
        if code not in partitions or row['task_id'] != row['paper_id'] + '.Q' + row['question_path'] or row['task_id'] in seen:
            raise ValueError('Task output has wrong or duplicate identity')
        seen.add(row['task_id'])
    def foreign(records):
        return sorted(({field: str(row[field]) for field in fields} for row in records
                       if not row['paper_id'].startswith(qualification + '-')), key=lambda row: row['task_id'])
    if foreign(rows) != foreign(old):
        raise ValueError('Task export must preserve every foreign field')
    selected = [row for row in rows if row['paper_id'].startswith(qualification + '-')]
    paths = partitions[qualification]
    return {path: csv_text(fields, selected[len(selected) * i // len(paths):len(selected) * (i + 1) // len(paths)])
            for i, path in enumerate(paths)}
