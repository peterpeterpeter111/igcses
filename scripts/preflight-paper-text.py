"""Offline PDF text preparation, without task indexing or academic review.

Reads an explicit discovery overlay, verifies source hashes/page counts, and
stores page text only under ignored work/. The report contains counts/warnings,
not source text. Existing outputs are never overwritten; source files and
discovery status are never changed.
"""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import pypdf

ROOT = Path(__file__).resolve().parents[1]


def prepare(manifest_path, text_dir):
    manifest = json.loads(manifest_path.read_text())
    records, text_outputs = [], []
    for record in manifest['records']:
        documents = []
        for kind in ['questionPaper', 'markScheme']:
            document = record[kind]
            source_path = ROOT / document['localPath']
            digest = hashlib.sha256(source_path.read_bytes()).hexdigest()
            if digest != document['sha256']:
                raise ValueError(f'Source hash mismatch: {record["id"]}:{kind}')
            reader = pypdf.PdfReader(source_path)
            if len(reader.pages) != document['pageCount']:
                raise ValueError(f'Page count mismatch: {record["id"]}:{kind}')
            pages, page_text = [], []
            for number, page in enumerate(reader.pages, 1):
                try:
                    text = page.extract_text() or ''
                    error = None
                except Exception as exc:
                    text, error = '', type(exc).__name__ + ': ' + str(exc)
                warnings = []
                if error:
                    warnings.append('text-extraction-error')
                if len(text.strip()) < 60:
                    warnings.append('sparse-text-may-be-blank-or-visual')
                if '\ufffd' in text:
                    warnings.append('replacement-characters')
                if '\x00' in text:
                    warnings.append('null-characters')
                pages.append({'pdfPage': number, 'textChars': len(text),
                              'warnings': warnings, 'error': error})
                page_text.append({'pdfPage': number, 'text': text})
            output_path = text_dir / (record['id'] + '-' + kind + '-pages.json')
            text_outputs.append((output_path, page_text))
            documents.append({'kind': kind, 'sha256': digest,
                              'pageCount': len(pages), 'pages': pages,
                              'textOutput': str(output_path.relative_to(ROOT)),
                              'warningPages': [p['pdfPage'] for p in pages if p['warnings']],
                              'extractionErrorPages': [p['pdfPage'] for p in pages if p['error']]})
        records.append({'candidateId': record['id'], 'documents': documents,
                        'taskIndexCreated': False, 'identityReviewed': False,
                        'markSchemeReviewed': False, 'fullyProcessed': False})
    return {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'manifest': str(manifest_path.relative_to(ROOT)),
        'extractor': {'name': 'pypdf', 'version': pypdf.__version__},
        'scope': 'Mechanical text preparation only; no task, mark or syllabus interpretation.',
        'limitations': [
            'Extractable text does not establish correct reading order or mathematical notation.',
            'Diagrams, tables, fraction layout and symbols still require visual inspection.',
            'Sparse text may be intentional. No warning is not evidence of correctness.',
        ],
        'records': records,
    }, text_outputs


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--text-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    text_dir = (ROOT / args.text_dir).resolve()
    if ROOT / 'work' not in text_dir.parents:
        parser.error('--text-dir must be inside ignored work/')
    manifest_path = (ROOT / args.manifest).resolve()
    report_path = ROOT / args.output
    if report_path.exists():
        parser.error('Report already exists; choose a new output path')
    report, outputs = prepare(manifest_path, text_dir)
    if any(path.exists() for path, _ in outputs):
        parser.error('Text output already exists; choose a new text directory')
    text_dir.mkdir(parents=True, exist_ok=True)
    for path, content in outputs + [(report_path, report)]:
        with path.open('x') as stream:
            json.dump(content, stream, indent=2)
            stream.write('\n')
    print(json.dumps({'report': str(args.output), 'documents': len(outputs),
                      'pages': sum(d['pageCount'] for r in report['records'] for d in r['documents']),
                      'extractionErrors': sum(len(d['extractionErrorPages']) for r in report['records'] for d in r['documents'])}))
