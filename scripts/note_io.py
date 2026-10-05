"""Read ordered chapter parts as one unchanged teaching document.

Top-level notes are authoritative manifests, never inferred from a directory glob.
Part files must stay inside content/note-sections and match their chapter identity.
"""
import json
import re
from pathlib import Path


def read_note(path):
    path = Path(path)
    metadata = json.loads(path.read_text())
    if not isinstance(metadata.get('sections'), list):
        raise ValueError('Missing inline section array')
    files = metadata.get('sectionFiles', [])
    if not isinstance(files, list) or ('sectionFiles' in metadata and (not files or metadata['sections'])):
        raise ValueError('Ambiguous note parts and inline sections')
    if any(not isinstance(p, str) or not re.fullmatch(r'\.\./note-sections/[a-z0-9-]+/[a-z0-9-]+\.json', p) for p in files):
        raise ValueError('Invalid note part path')
    if len(set(files)) != len(files):
        raise ValueError('Repeated note part path')
    sections = [] if files else metadata['sections']
    base = (path.parent.parent / 'note-sections').resolve()
    for file in files:
        target = path.parent / file
        if target.is_symlink() or base not in target.resolve().parents:
            raise ValueError('Linked or escaped note part')
        part = json.loads(target.read_text())
        if (part.get('subjectId') != metadata['subjectId'] or part.get('chapterId') != metadata['chapterId'] or
                not isinstance(part.get('sections'), list) or not part['sections']):
            raise ValueError('Empty or wrong-chapter note part')
        sections.extend(part['sections'])
    ids = [s.get('id') if isinstance(s, dict) else None for s in sections]
    if any(not isinstance(id, str) or not id for id in ids) or len(set(ids)) != len(ids):
        raise ValueError('Invalid or duplicate teaching section')
    return {**{k: v for k, v in metadata.items() if k != 'sectionFiles'}, 'sections': sections}
