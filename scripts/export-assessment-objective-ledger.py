"""Export checked English objectives without changing numbered-source ledgers."""
import csv
import io
import json
from pathlib import Path
from assessment_objective_io import objective_tables

ROOT=Path(__file__).resolve().parents[1]
model=json.loads((ROOT/'research/assessment-objectives/4EB1-issue4.json').read_text())
tables=objective_tables(model,ROOT)
pending=[]
for name,(fields,additions) in tables.items():
    path=ROOT/'research/ledger/v1'/(name+'.csv')
    if path.is_symlink(): raise ValueError('Linked ledger target')
    retained=[]
    if path.exists():
        with path.open(newline='') as stream:
            reader=csv.DictReader(stream)
            if reader.fieldnames != fields: raise ValueError('Changed objective ledger headers')
            retained=[row for row in reader if row['qualification']!=model['qualification']]
    rows=retained+additions
    if len({row[fields[0]] for row in rows})!=len(rows) or any(set(row)!=set(fields) for row in rows):
        raise ValueError('Duplicate objective row or changed field set')
    buf=io.StringIO(newline='');writer=csv.DictWriter(buf,fields,lineterminator='\n');writer.writeheader();writer.writerows(rows)
    pending.append((path,buf.getvalue()))
# Both projections and existing table headers are checked before either write.
for path,content in pending: path.write_text(content)
print(json.dumps({'objectiveDefinitions':len(model['objectives']), 'partialObjectiveLinks':len(model['teachingLinks']), 'newNumberedIdentities':0,'completeObjectives':0}))
