"""Download only the three explicitly selected pilot documents. No link crawling."""
import hashlib
import json
from pathlib import Path

import requests
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
destination = root / 'work' / 'pilot-4eb1-2024-nov-01'
destination.mkdir(parents=True, exist_ok=True)
base = 'https://qualifications.pearson.com/content/dam/pdf/International-GCSE/English-Language-B/2016/Exam-materials/'
files = {
    'question-paper': '4eb1-01-que-20241106.pdf',
    'mark-scheme': '4eb1-01-rms-20250123.pdf',
    'examiner-report': '4eb1-01-pef-20250123.pdf',
}
records = []
for kind, filename in files.items():
    path = destination / filename
    if not path.exists():
        response = requests.get(base + filename, timeout=40)
        response.raise_for_status()
        if not response.content.startswith(b'%PDF'):
            raise ValueError(f'{kind} did not return a PDF')
        path.write_bytes(response.content)
    reader = PdfReader(path)
    pages = [{'pdfPage': i + 1, 'text': page.extract_text() or ''} for i, page in enumerate(reader.pages)]
    (destination / f'{kind}-pages.json').write_text(json.dumps(pages, indent=2))
    (destination / f'{kind}.txt').write_text('\n\n'.join(
        f'PDF PAGE {p["pdfPage"]}\n' + '\n'.join(
            line for line in p['text'].splitlines()
            if '........' not in line and 'DO NOT WRITE IN THIS AREA' not in line
        ) for p in pages
    ))
    records.append({'type': kind, 'url': base + filename,
                    'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                    'pageCount': len(pages), 'accessStatus': 'obtained',
                    'accessDate': '2026-09-08', 'reviewedPages': []})
(destination / 'download-manifest.json').write_text(json.dumps(records, indent=2))
print(json.dumps(records, indent=2))
