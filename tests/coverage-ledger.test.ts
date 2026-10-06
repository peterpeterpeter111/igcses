import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import sources from '../research/sources.json' with { type: 'json' };
import paperLedger from '../research/paper-ledger.json' with { type: 'json' };
import coverage from '../research/coverage.json' with { type: 'json' };
import batch from '../research/batches/2026-09-08-cross-subject-lower-01.manifest.json' with { type: 'json' };

void test('normalized specification references preserve saved metadata without inventing reviews', () => {
  const rows = JSON.parse(execFileSync('python3', ['-c',
    "import csv,json; print(json.dumps(list(csv.DictReader(open('research/ledger/v1/documents.csv')))))",
  ], { encoding: 'utf8' })) as Record<string, string>[];
  for (const source of sources) {
    const matches = rows.filter((row) => row.document_id === source.id);
    assert.equal(matches.length, 1);
    const row = matches[0];
    assert.equal(row.qualification, source.qualification);
    assert.equal(row.document_type, source.documentType);
    assert.equal(row.canonical_url, source.url);
    assert.equal(row.sha256, source.sha256);
    assert.equal(row.page_count, String(source.pages));
    assert.equal(row.specification_issue, source.specificationIssue);
    assert.equal(row.access_status, source.status);
    assert.equal(row.local_evidence_path, 'research/sources.json');
    assert.equal(row.identity_status, 'metadata-only');
    assert.deepEqual(JSON.parse(row.reviewed_pages_json), []);
    for (const field of ['year', 'series', 'component', 'variant', 'printed_exam_date'])
      assert.equal(row[field], '', 'Unknown or inapplicable paper identity must not be invented');
  }
});

void test('raw paper ledger keeps discovery and processing states separate', () => {
  assert.equal(paperLedger.length, 390);
  assert.equal(new Set(paperLedger.map((row) => row.id)).size, 390);
  assert.ok(paperLedger.every((row) => row.accessStatus === 'discovered'));
  assert.ok(paperLedger.every((row) => row.processingStatus === 'unprocessed'));
  assert.deepEqual(
    Object.fromEntries(
      ['4BI1', '4CH1', '4EB1', '4HB1', '4MB1', '4PH1'].map((code) => [
        code,
        paperLedger.filter((row) => row.qualification === code).length,
      ]),
    ),
    {
      '4BI1': 92,
      '4CH1': 84,
      '4EB1': 56,
      '4HB1': 74,
      '4MB1': 0,
      '4PH1': 84,
    },
  );
});

void test('candidate syllabus rows remain explicitly unverified', () => {
  assert.equal(coverage.length, 710);
  assert.ok(coverage.every((row) => row.drafted === false));
  assert.ok(coverage.every((row) => row.sourceChecked === false));
  assert.ok(coverage.every((row) => row.humanReviewed === false));
  assert.ok(
    coverage.every(
      (row) => row.extractionStatus === 'candidate-needs-page-verification',
    ),
  );
});

void test('the bounded five-pair batch is indexed-only', () => {
  assert.equal(batch.status, 'indexed-only');
  assert.equal(batch.records.length, 5);
  assert.ok(
    batch.records.every((row) => row.processingStatus === 'indexed-only'),
  );
  assert.ok(batch.records.every((row) => row.fullyProcessed === false));
  assert.equal(batch.counts.pairsFullyProcessed, 0);
  assert.equal(batch.counts.pairsObtained, 5);
});

// Reviewed identities and linked notes do not imply chapter completion.
void test('reviewed inventories agree with source candidates and subject-specific notes', async () => {
  const { reviewedInventories } = await import('../lib/syllabus.ts');
  const { getNotes } = await import('../content/notes.ts');
  const { subjects } = await import('../content/catalog.ts');
  assert.equal(
    reviewedInventories.reduce(
      (n, inventory) => n + inventory.points.length,
      0,
    ),
    608,
  );
  const allIds = reviewedInventories.flatMap((i) => i.points.map((p) => p.id));
  assert.equal(new Set(allIds).size, allIds.length);
  for (const qualification of ['4PH1', '4BI1']) {
    assert.deepEqual(
      reviewedInventories.filter((i) => i.qualification === qualification).flatMap((i) => i.points.map((p) => p.reference)).sort(),
      coverage.filter((p) => p.qualification === qualification).map((p) => p.reference).sort(),
      `${qualification} parent identities must reconcile to the preserved candidate inventory; teaching remains partial`,
    );
  }
  for (const inventory of reviewedInventories)
    for (const point of inventory.points) {
      const raw = coverage.find(
        (p) =>
          p.qualification === inventory.qualification &&
          p.reference === point.reference,
      );
      if (inventory.qualification === '4MB1') {
        assert.equal(raw, undefined, 'Raw numeric extraction must stay untouched for lettered Maths rows');
        assert.match(point.reference, /^(1[A-K]|2[A-I]|3[A-L]|4[A-GI-N]|5[BCE]|6[CFGJK]|7[BD]|8[DEGI]|9[AC]|10[A-K])$/);
        assert.equal(point.pdfPage, point.reference.startsWith('4') ? (['4L', '4M', '4N'].includes(point.reference) ? 22 : 21) : point.reference.startsWith('5') ? 23 : point.reference.startsWith('6') ? 24 : point.reference.startsWith('7') ? 25 : point.reference.startsWith('8') ? 26 : point.reference.startsWith('9') ? 27 : point.reference.startsWith('10') ? 28 : point.reference.startsWith('3') ? 20 : point.reference.startsWith('2') ? 19 : point.reference <= '1G' ? 17 : 18);
      } else {
        assert.ok(raw);
        assert.equal(raw.pdfPage, point.pdfPage);
      }
      assert.equal(point.printedPage, point.pdfPage - 6);
      assert.deepEqual(
        point.components,
        inventory.qualification === '4CH1' ? (point.reference.endsWith('C') ? ['2C'] : ['1C', '2C']) : ['4HB1', '4MB1'].includes(inventory.qualification) ? ['01', '02'] : inventory.qualification === '4BI1' ? (point.reference.endsWith('B') ? ['2B'] : ['1B', '2B']) : point.reference.endsWith('P') ? ['2P'] : ['1P', '2P'],
      );
      assert.equal(point.humanReviewed, false);
      assert.equal(point.substatementAuditComplete, false);
      assert.equal(
        point.teachingCoverage,
        point.noteSectionIds.length ? 'partial' : 'not-started',
      );
      if (!point.noteSectionIds.length) continue;
      const note = getNotes(subjects.find((s) => s.code === inventory.qualification)!.id, point.chapterId);
      assert.ok(note);
      assert.ok(note.sourcePages.includes(point.pdfPage));
      assert.ok(point.noteSectionIds.length > 0);
      for (const id of point.noteSectionIds)
        assert.ok(
          note.sections.some(
            (section) =>
              section.id === id && section.points?.includes(point.reference),
          ),
        );
    }
});
