"""Read normalized CSV tables, including explicitly declared subject partitions.

The root CSV remains the schema header. Partitioned data is never inferred from
whatever files happen to exist: the manifest must list every subject file.
"""
import csv
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


def coverage_partitions(directory):
    directory = Path(directory)
    manifest = json.loads((directory / 'coverage-partitions.json').read_text())
    if manifest.get('schemaVersion') != 1 or manifest.get('table') != 'coverage':
        raise ValueError('Unsupported coverage partition contract')
    entries = manifest['partitions']
    result = {}
    for entry in entries:
        code, filename = entry['qualification'], entry['path']
        if not re.fullmatch(r'4[A-Z]{2}1', code) or filename != 'coverage/' + code + '.csv' or code in result:
            raise ValueError('Invalid or repeated coverage partition')
        path = directory / filename
        if path.is_symlink() or not path.is_file():
            raise ValueError('Missing or linked coverage partition: ' + filename)
        result[code] = path
    if set((directory / 'coverage').glob('*.csv')) != set(result.values()):
        raise ValueError('Undeclared coverage partition')
    return result


def read_table(directory, name):
    directory = Path(directory)
    fields, rows = read_csv(directory / (name + '.csv'))
    if name != 'coverage' or not (directory / 'coverage-partitions.json').exists():
        return fields, rows
    if rows:
        raise ValueError('Partitioned coverage root must contain only its schema header')
    seen = set()
    for code, path in coverage_partitions(directory).items():
        part_fields, part_rows = read_csv(path)
        if part_fields != fields:
            raise ValueError('Coverage partition header differs: ' + str(path))
        for row in part_rows:
            if not row['point_id'].startswith(code + ':') or not row['coverage_id'].startswith(row['point_id'] + ':'):
                raise ValueError('Coverage row has wrong subject or point identity')
            if row['coverage_id'] in seen:
                raise ValueError('Duplicate coverage identity across partitions')
            seen.add(row['coverage_id'])
        rows.extend(part_rows)
    return fields, rows
