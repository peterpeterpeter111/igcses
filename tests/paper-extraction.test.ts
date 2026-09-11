import { test } from 'node:test';
import assert from 'node:assert/strict';
import extracted from '../research/extractions/4PH1-2024-June-1-standard.json' with { type: 'json' };
import batch from '../research/batches/2026-09-08-cross-subject-lower-01.manifest.json' with { type: 'json' };
import { reviewedInventories } from '../lib/syllabus.ts';
import visualAudit from '../research/reviews/2026-09-10-physics-visual-audit.json' with { type: 'json' };
import leafIndex from '../research/reviews/2026-09-10-physics-leaf-index.json' with { type: 'json' };

void test('text leaf index reconciles all 110 marks without promoting processing status', () => {
  assert.equal(leafIndex.indexedLeafCount, leafIndex.tasks.length);
  assert.equal(new Set(leafIndex.tasks.map((t) => t.taskId)).size, 51);
  assert.equal(
    leafIndex.tasks.reduce((n, t) => n + t.originalMarks, 0),
    110,
  );
  for (const group of leafIndex.questionTotals) {
    assert.equal(
      leafIndex.tasks
        .filter((t) => t.questionPath.split('.')[0] === String(group.question))
        .reduce((n, t) => n + t.originalMarks, 0),
      group.marks,
    );
  }
  for (const task of extracted.tasks) {
    const indexed = leafIndex.tasks.find((t) => t.taskId === task.taskId);
    assert.equal(indexed?.originalMarks, task.originalMarks);
  }
  assert.equal(leafIndex.questionPaperSha256, extracted.documents[0].sha256);
  assert.equal(leafIndex.markSchemeSha256, extracted.documents[1].sha256);
  assert.equal(leafIndex.fullyProcessed, false);
  assert.equal(leafIndex.visualPageAuditComplete, false);
});

void test('Physics extraction keeps source pages, documents, task marks and raw index distinct', () => {
  const raw = batch.records.find((row) => row.paperId === extracted.paperId)!;
  assert.equal(raw.processingStatus, 'indexed-only');
  assert.equal(extracted.fullyProcessed, false);
  assert.equal(extracted.wholePaperLeafCount, visualAudit.verifiedLeafCount);
  assert.ok(extracted.blockers.length);
  assert.equal(extracted.detailedLeafTasks, extracted.tasks.length);
  assert.equal(
    new Set(extracted.tasks.map((task) => task.taskId)).size,
    extracted.tasks.length,
  );
  assert.equal(
    extracted.tasks.reduce((sum, task) => sum + task.originalMarks, 0),
    extracted.detailedOriginalMarks,
  );
  for (const [question, total] of Object.entries(
    extracted.reviewedQuestionTotals,
  )) {
    assert.equal(
      extracted.tasks
        .filter((task) => task.questionPath.split('.')[0] === question)
        .reduce((sum, task) => sum + task.originalMarks, 0),
      total,
    );
  }
  for (const [document, original] of [
    [extracted.documents[0], raw.questionPaper],
    [extracted.documents[1], raw.markScheme],
  ] as const) {
    assert.equal(document.sha256, original.sha256);
    assert.equal(document.pageCount, original.pageCount);
    assert.equal(document.url, original.url);
  }
  for (const task of extracted.tasks) {
    assert.ok(
      task.questionPaperPages.every((page) =>
        extracted.pageAudit.questionPaper.visuallyReviewedPages.includes(page),
      ),
    );
    assert.ok(
      task.markSchemePages.every((page) =>
        extracted.pageAudit.markScheme.visuallyReviewedPages.includes(page),
      ),
    );
    assert.equal(
      task.criteria.reduce((sum, criterion) => sum + criterion.marks, 0),
      task.originalMarks,
    );
    assert.ok(
      task.syllabusMappings.every((mapping) =>
        reviewedInventories.some((inventory) =>
          inventory.points.some((point) => point.id === mapping.pointId),
        ),
      ),
    );
    assert.equal(task.humanReviewed, false);
    assert.equal(task.templateLinkStatus, 'candidate-only');
  }
});

void test('visual inventory covers every source page but cannot promote paper or template completion', () => {
  for (const [pages, document] of [
    [visualAudit.questionPaper, extracted.documents[0]],
    [visualAudit.markScheme, extracted.documents[1]],
  ] as const) {
    assert.deepEqual(
      pages.map((p) => p.page),
      Array.from({ length: document.pageCount }, (_, i) => i + 1),
    );
    assert.ok(
      pages.every((p) => p.mode === 'visual-and-text' && p.observation),
    );
  }
  assert.equal(visualAudit.verifiedLeafCount, leafIndex.tasks.length);
  assert.equal(
    visualAudit.reconciledMarks,
    leafIndex.tasks.reduce((n, t) => n + t.originalMarks, 0),
  );
  assert.equal(visualAudit.fullyProcessed, false);
  assert.equal(visualAudit.humanReviewed, false);
  assert.ok(visualAudit.sourceDiscrepancies.length > 0);
  assert.equal(extracted.detailedLeafTasks, 19);
  assert.equal(extracted.detailedOriginalMarks, 51);
});

void test('Q8 retains the six-mark cap, seven-point pool and correct refraction physics', () => {
  const task = extracted.tasks.find((t) => t.questionPath === '8')!;
  assert.equal(task.originalMarks, 6);
  assert.equal(task.markingPointPool!.length, 7);
  assert.equal(task.markingConstraints!.maximum, 6);
  assert.deepEqual(task.markingConstraints!.jointCaps[0].pointIds, [
    'MP1',
    'MP2',
  ]);
  assert.equal(task.markingConstraints!.jointCaps[0].maximum, 1);
  const check = task.refractionCrossCheck!;
  for (const ray of check.rays) {
    const ratio =
      Math.sin((ray.approxIncidence * Math.PI) / 180) /
      Math.sin((ray.calculatedRefraction * Math.PI) / 180);
    assert.ok(Math.abs(ratio - check.refractiveIndex) < 1e-10);
    assert.ok(ray.calculatedRefraction < ray.approxIncidence);
    assert.ok(ray.calculatedRefraction >= ray.sourceRefractionRange[0]);
    assert.ok(ray.calculatedRefraction <= ray.sourceRefractionRange[1]);
  }
  assert.equal(task.templateLinkStatus, 'candidate-only');
  assert.ok(task.blockers.some((b) => b.includes('drawing')));
});

void test('Q7 electrical calculations preserve unit conversion, rounding alternatives and active branches', () => {
  const power = extracted.tasks.find(
    (t) => t.questionPath === '7.b.ii',
  )!.electricalCrossCheck!;
  assert.ok(
    Math.abs(power.voltageVolts! * power.currentAmperes! - power.powerWatts!) <
      1e-12,
  );
  const energy = extracted.tasks.find(
    (t) => t.questionPath === '7.b.iii',
  )!.electricalCrossCheck!;
  energy.powerChoicesWatts!.forEach((p, i) => {
    assert.ok(
      Math.abs(p * energy.timeSeconds! - energy.energyChoicesJoules![i]) <
        1e-10,
    );
  });
  const current = extracted.tasks.find(
    (t) => t.questionPath === '7.c.ii',
  )!.electricalCrossCheck!;
  assert.equal(
    current.activeBranchMilliampere!.reduce((a, b) => a + b, 0),
    current.supplyMilliampere,
  );
  assert.ok(
    !current.activeBranchMilliampere!.includes(current.openBranchMilliampere!),
  );
});

void test('detailed export retains stimulus pages and exact cross-topic syllabus references', async () => {
  const { readFileSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const report = JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import csv,json
from pathlib import Path
p=Path('research/ledger/v1')
print(json.dumps({name:list(csv.DictReader((p/(name+'.csv')).open())) for name in ['tasks','task-mappings']}))`,
      ],
      { encoding: 'utf8' },
    ),
  );
  for (const task of extracted.tasks) {
    const row = report.tasks.find(
      (r: Record<string, string>) => r.task_id === task.taskId,
    );
    assert.deepEqual(JSON.parse(row.stimulus_refs_json), task.stimulusRefs);
    assert.deepEqual(JSON.parse(row.stimulus_types_json), task.stimulusTypes);
    for (const mapping of task.syllabusMappings) {
      const row = report['task-mappings'].find(
        (r: Record<string, string>) =>
          r.mapping_id === task.taskId + ':' + mapping.pointId,
      );
      assert.deepEqual(
        JSON.parse(row.evidence_refs_json),
        mapping.evidenceRefs,
      );
      const point = reviewedInventories
        .flatMap((i) => i.points)
        .find((p) => p.id === mapping.pointId)!;
      assert.ok(
        mapping.evidenceRefs.some(
          (r) =>
            r.documentId === '4PH1-spec' &&
            r.pdfPages.length === 1 &&
            r.pdfPages[0] === point.pdfPage,
        ),
      );
    }
  }
  const time = extracted.tasks.find(
    (t) => t.questionPath === '3.c',
  )!.numericCrossCheck!;
  assert.equal(
    time.distanceMetres / time.speedMetresPerSecond,
    time.timeSeconds,
  );
  assert.equal(Number(time.correctDecimal), time.timeSeconds);
  // The untouched lower-model manifest remains historical evidence.
  assert.equal(
    JSON.parse(
      readFileSync(
        'research/batches/2026-09-08-cross-subject-lower-01.manifest.json',
        'utf8',
      ),
    ).status,
    'indexed-only',
  );
});
