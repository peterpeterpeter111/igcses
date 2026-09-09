"""Bounded mechanical indexing for five cross-subject paper/scheme pairs.

This pass deliberately stops at obtained/indexed. It does not infer exact task
counts from OCR, certify identity, map syllabus points, analyse schemes, or
activate templates. Raw PDFs remain under ignored work/.
"""
from __future__ import annotations

import hashlib
import json
import re
import argparse
from datetime import date
from importlib.metadata import version, PackageNotFoundError
from pathlib import Path
from urllib.parse import urlparse

import requests
from pypdf import PdfReader

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--offline", action="store_true", help="Re-index cached PDFs without any network requests")
ARGS = parser.parse_args()
try:
    FONTTOOLS_VERSION = version("fonttools")
except PackageNotFoundError:
    FONTTOOLS_VERSION = None

ROOT = Path(__file__).resolve().parents[1]
BATCH_ID = "2026-09-08-cross-subject-lower-01"
OUT = ROOT / "work" / "batches" / BATCH_ID
OUT.mkdir(parents=True, exist_ok=True)
ALTERNATES_PATH = ROOT / "research" / "batches" / f"{BATCH_ID}.alternate-sources.json"
ALTERNATES = json.loads(ALTERNATES_PATH.read_text()) if ALTERNATES_PATH.exists() else {}
PREVIOUS_PATH = OUT / "batch-manifest.json"
PREVIOUS = json.loads(PREVIOUS_PATH.read_text()) if PREVIOUS_PATH.exists() else {}
PREVIOUS_RECORDS = {r["paperId"]: r for r in PREVIOUS.get("records", [])}

PAIRS = [
    {
        "paperId": "4HB1-2024-May-01-standard",
        "qualification": "4HB1", "series": "May", "year": 2024, "component": "01", "variant": "standard",
        "qpLegacyLinkId": "086280071a38d1f2", "msLegacyLinkId": "0e2d95328bf9ba43",
        "qp": "https://qualifications.pearson.com/content/dam/pdf/International-GCSE/Human-Biology/2017/Exam-materials/4hb1-01-que-20240515.pdf",
        "ms": "https://qualifications.pearson.com/content/dam/pdf/International-GCSE/Human-Biology/2017/Exam-materials/4hb1-01-rms-20240822.pdf",
    },
    {
        "paperId": "4BI1-2024-June-1-standard",
        "qualification": "4BI1", "series": "June", "year": 2024, "component": "1", "variant": "standard",
        "qpLegacyLinkId": "3779bd1a4426e2a2", "msLegacyLinkId": "8d8b3145b28f2227",
        "qp": "https://pmt.physicsandmathstutor.com/download/Biology/GCSE/Past-Papers/Edexcel-IGCSE/New-Spec-Paper-1/QP/June 2024 QP.pdf",
        "ms": "https://pmt.physicsandmathstutor.com/download/Biology/GCSE/Past-Papers/Edexcel-IGCSE/New-Spec-Paper-1/MS/June 2024 MS.pdf",
    },
    {
        "paperId": "4CH1-2024-June-1-standard",
        "qualification": "4CH1", "series": "June", "year": 2024, "component": "1", "variant": "standard",
        "qpLegacyLinkId": "fac78a14a592366d", "msLegacyLinkId": "acf062368ae2a175",
        "qp": "https://pmt.physicsandmathstutor.com/download/Chemistry/GCSE/Past-Papers/Edexcel-IGCSE/New-Spec-Paper-1/QP/June 2024 QP.pdf",
        "ms": "https://pmt.physicsandmathstutor.com/download/Chemistry/GCSE/Past-Papers/Edexcel-IGCSE/New-Spec-Paper-1/MS/June 2024 MS.pdf",
    },
    {
        "paperId": "4PH1-2024-June-1-standard",
        "qualification": "4PH1", "series": "June", "year": 2024, "component": "1", "variant": "standard",
        "qpLegacyLinkId": "79a578cbff6bb178", "msLegacyLinkId": "9e0d0365cbda7361",
        "qp": "https://pmt.physicsandmathstutor.com/download/Physics/GCSE/Past-Papers/Edexcel-IGCSE/New-Spec-Paper-1/QP/June 2024 QP.pdf",
        "ms": "https://pmt.physicsandmathstutor.com/download/Physics/GCSE/Past-Papers/Edexcel-IGCSE/New-Spec-Paper-1/MS/June 2024 MS.pdf",
    },
    {
        "paperId": "4EB1-2024-May-01-standard",
        "qualification": "4EB1", "series": "May", "year": 2024, "component": "01", "variant": "standard",
        "qpLegacyLinkId": "455221364139fa57", "msLegacyLinkId": "86ff319223f528f4",
        "qp": "https://qualifications.pearson.com/content/dam/pdf/International-GCSE/English-Language-B/2016/Exam-materials/4eb1-01-que-20240524.pdf",
        "ms": "https://qualifications.pearson.com/content/dam/pdf/International-GCSE/English-Language-B/2016/Exam-materials/4eb1-01-rms-20240822.pdf",
    },
]


def fetch(url: str, path: Path) -> dict:
    cached = path.exists()
    if not path.exists():
        if ARGS.offline:
            raise FileNotFoundError(f"Offline mode: cached PDF missing: {path.name}")
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        if not response.content.startswith(b"%PDF"):
            raise ValueError(f"Not a PDF: {url}")
        path.write_bytes(response.content)
    data = path.read_bytes()
    if not data.startswith(b"%PDF"):
        raise ValueError(f"Not a PDF: {path}")
    reader = PdfReader(path)
    prior = next((r.get(kind, {}) for r in PREVIOUS_RECORDS.values()
                  for kind in ("questionPaper", "markScheme")
                  if r.get(kind, {}).get("url") == url), {})
    return {
        "url": url,
        "filename": path.name,
        "sha256": hashlib.sha256(data).hexdigest(),
        "pageCount": len(reader.pages),
        "accessStatus": "obtained",
        "accessDate": prior.get("accessDate") if cached else str(date.today()),
        "cacheReused": cached,
        "lastVerifiedDate": str(date.today()),
        "reader": reader,
    }


def extract(reader: PdfReader) -> list[dict]:
    pages = []
    for index, page in enumerate(reader.pages):
        text = (page.extract_text() or "").replace("\u00a0", " ")
        # These are only candidate signals for human/Astra review later.
        labels = sorted({
            (int(number), subpart or None)
            for number, subpart in re.findall(r"\b(?:Question|Q)\s*([0-9]{1,2})(?:\.([a-z]))?\b", text, re.I)
        }, key=lambda item: (item[0], item[1] or ""))
        marks = sorted({int(mark) for mark in re.findall(r"\((\d{1,2})\)\s*(?:marks?|$)", text, re.I)})
        pages.append({
            "pdfPage": index + 1,
            "textChars": len(text),
            "questionLabelCandidates": [{"number": n, "subpart": s} for n, s in labels],
            "markCandidates": marks,
            "extractionWarning": len(text.strip()) < 60 or "........" in text or "[" in text,
        })
    return pages


records = []
for pair in PAIRS:
    folder = OUT / pair["paperId"]
    folder.mkdir(parents=True, exist_ok=True)
    documents = {}
    errors = []
    previous = PREVIOUS_RECORDS.get(pair["paperId"], {})
    prior_errors = previous.get("priorDownloadErrors", []) + previous.get("downloadErrors", [])
    prior_errors = list({json.dumps(e, sort_keys=True): e for e in prior_errors}.values())
    alternate = ALTERNATES.get(pair["qualification"], {})
    for kind in ("qp", "ms"):
        urls = [pair[kind]] + ([alternate[kind]] if kind in alternate else [])
        # Reuse a previously obtained copy before retrying an unavailable host.
        urls.sort(key=lambda url: not (folder / Path(urlparse(url).path).name).exists())
        for url in urls:
            path = folder / Path(urlparse(url).path).name
            try:
                documents[kind] = fetch(url, path)
                documents[kind]["originalLedgerUrl"] = pair[kind]
                if url != pair[kind]:
                    documents[kind]["alternateSource"] = alternate
                break
            except Exception as exc:
                errors.append({"documentType": kind, "url": url, "error": str(exc), "attemptDate": str(date.today())})
    if len(documents) != 2:
        records.append({
            "paperId": pair["paperId"], "qualification": pair["qualification"],
            "qpLegacyLinkId": pair["qpLegacyLinkId"], "msLegacyLinkId": pair["msLegacyLinkId"],
            "stage": "blocked", "processingStatus": "indexed-only",
            "fullyProcessed": False, "indexed": False,
            "questionPaper": {k: v for k, v in documents.get("qp", {}).items() if k != "reader"},
            "markScheme": {k: v for k, v in documents.get("ms", {}).items() if k != "reader"},
            "downloadErrors": errors, "priorDownloadErrors": prior_errors, "extractedTaskCount": 0,
            "identityStatus": "cover-review-required", "reviewedPages": [],
        })
        (OUT / "partial-records.json").write_text(json.dumps(records, indent=2))
        print(f"{pair['qualification']}: download blocked", flush=True)
        continue
    qp, ms = documents["qp"], documents["ms"]
    qp_pages = extract(qp["reader"])
    ms_pages = extract(ms["reader"])
    (folder / "question-paper-pages.json").write_text(json.dumps(qp_pages, indent=2))
    (folder / "mark-scheme-pages.json").write_text(json.dumps(ms_pages, indent=2))
    (folder / "question-paper.txt").write_text("\n\n".join(
        f"PDF PAGE {i + 1}\n{page.extract_text() or ''}" for i, page in enumerate(qp["reader"].pages)
    ))
    (folder / "mark-scheme.txt").write_text("\n\n".join(
        f"PDF PAGE {i + 1}\n{page.extract_text() or ''}" for i, page in enumerate(ms["reader"].pages)
    ))
    records.append({
        "paperId": pair["paperId"], "qualification": pair["qualification"], "year": pair["year"],
        "series": pair["series"], "component": pair["component"], "variant": pair["variant"],
        "stage": "indexed", "processingStatus": "indexed-only", "fullyProcessed": False, "indexed": True,
        "qpLegacyLinkId": pair["qpLegacyLinkId"], "msLegacyLinkId": pair["msLegacyLinkId"],
        "downloadErrors": errors, "priorDownloadErrors": prior_errors,
        "questionPaper": {k: v for k, v in qp.items() if k != "reader"},
        "markScheme": {k: v for k, v in ms.items() if k != "reader"},
        "questionPaperPages": qp_pages, "markSchemePages": ms_pages,
        "candidateQuestionLabels": sum(len(p["questionLabelCandidates"]) for p in qp_pages),
        "pageWarnings": {
            "questionPaper": [p["pdfPage"] for p in qp_pages if p["extractionWarning"]],
            "markScheme": [p["pdfPage"] for p in ms_pages if p["extractionWarning"]],
        },
        "identityStatus": "cover-review-required", "schemeMatchStatus": "ledger-pair-candidate",
        "reviewedPages": [], "extractedTaskCount": 0,
        "blockers": [
            "Cover identity, printed dates and component/variant require visual review.",
            "Question/subpart labels, diagrams, tables and level grids are candidate-only.",
            "No exact task extraction, scheme interpretation, syllabus mapping or template validation has run.",
            "Page flags are only heuristics and cannot establish completeness of text, diagrams or tables.",
        ] + (["The extraction environment lacks fontTools; embedded-font text may be incomplete."] if FONTTOOLS_VERSION is None else []),
    })
    (OUT / "partial-records.json").write_text(json.dumps(records, indent=2))
    print(f"{pair['qualification']}: indexed-only", flush=True)

manifest = {
    "schemaVersion": 1,
    "batchId": BATCH_ID,
    "executionMethod": "Deterministic Python script; no model inference used for extraction",
    "extractionEnvironment": {"pypdf": version("pypdf"), "fonttools": FONTTOOLS_VERSION, "offline": ARGS.offline},
    "scope": "five cross-subject recent question-paper/mark-scheme pairs; one pair per available subject, 4MB1 excluded because no pair is catalogued",
    "sourcePolicy": "Original five ledger pairs only; explicit Pearson alternative URLs discovered through Save My Exams; no archive crawl. Alternative identity and scheme pairing remain candidates.",
    "status": "indexed-only",
    "records": records,
    "counts": {
        "pairsAttempted": len(PAIRS),
        "pairsObtained": sum(bool(r.get("questionPaper")) and bool(r.get("markScheme")) for r in records),
        "pairsIndexed": sum(r["indexed"] for r in records),
        "pairsBlocked": sum(not r["indexed"] for r in records),
        "pairsFullyProcessed": 0,
        "additionalLinksDiscovered": sum(sum(kind in entry for kind in ("qp", "ms")) for entry in ALTERNATES.values()),
        "additionalPairsDiscovered": 0,
        "paperDocumentsObtained": sum(bool(r.get("questionPaper")) for r in records),
        "markSchemeDocumentsObtained": sum(bool(r.get("markScheme")) for r in records),
    },
    "nextCursor": "Retry only records with indexed=false; once all five are indexed, stop for Astra review. Download-error history does not mean a recovered pair remains blocked.",
    "blockers": [
        "This batch is mechanical indexing only; Astra review is required before any record can become processed.",
        "4MB1 remains a source-discovery gap.",
    ],
}
(OUT / "batch-manifest.json").write_text(json.dumps(manifest, indent=2))
print(json.dumps({"batchId": BATCH_ID, **manifest["counts"]}, indent=2))
