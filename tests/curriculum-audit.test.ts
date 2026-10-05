import { test } from 'node:test';
import assert from 'node:assert/strict';
import audit from '../research/curriculum-audits/4PH1-motion-foundations.json' with { type: 'json' };
import inventory from '../research/syllabus/4PH1-forces-and-motion.json' with { type: 'json' };
import notes from '../content/notes/physics.json' with { type: 'json' };
import { reviewedInventories } from '../lib/syllabus.ts';
import { notes as allNotes } from '../content/notes.ts';
import { curriculumAudits } from '../lib/curriculum.ts';

void test('combined curriculum audits preserve unique source identities and real partial evidence', () => {
  const parents = curriculumAudits.flatMap((a) => a.parents);
  assert.equal(parents.length, 469);
  assert.equal(new Set(parents.map((p) => p.parentId)).size, parents.length);
  const requirements = parents.flatMap((p) => p.requirements);
  assert.equal(requirements.length, 1343);
  assert.equal(new Set(requirements.map((r) => r.id)).size, requirements.length);
  for (const a of curriculumAudits) {
    const chapterInventories = reviewedInventories.filter((i) => i.qualification === a.qualification && i.points.some((p) => p.chapterId === a.chapterId));
    const chapterNotes = allNotes.find((n) => n.sourceId === a.documentId && n.chapterId === a.chapterId)!;
    assert.ok(chapterInventories.length);
    assert.ok(chapterNotes);
    assert.ok(chapterInventories.every((i) => i.specificationSha256 === a.documentSha256));
    assert.equal(a.completeTeachingPoints, 0);
    assert.equal(a.completeChapters, 0);
    for (const p of a.parents) {
      const source = chapterInventories.flatMap((i) => i.points).find((i) => i.id === p.parentId)!;
      assert.ok(source);
      assert.equal(p.pdfPage, source.pdfPage);
      assert.equal(p.printedPage, source.printedPage);
      assert.deepEqual(p.components, source.components);
      assert.equal(p.substatementAuditComplete, false);
      for (const r of p.requirements) {
        assert.equal(r.completionStatus, 'partial');
        assert.ok(r.remainingChecks.length);
        for (const e of r.teachingEvidence) {
          const section = chapterNotes.sections.find((s) => s.id === e.sectionId)!;
          assert.ok(section?.points?.includes(p.officialReference));
          assert.ok(source.noteSectionIds.includes(e.sectionId));
          const value = (section as unknown as Record<string, unknown>)[e.field];
          assert.ok(value);
          if (Array.isArray(value)) assert.ok(value.length);
        }
      }
    }
  }
});

void test('curriculum decomposition preserves source parent identities and component scope', () => {
  assert.equal(audit.parents.length, 10);
  assert.equal(audit.parents.reduce((n, p) => n + p.requirements.length, 0), 21);
  const ids = audit.parents.flatMap((p) => p.requirements.map((r) => r.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(audit.documentSha256, inventory.specificationSha256);
  for (const parent of audit.parents) {
    const source = inventory.points.find((p) => p.id === parent.parentId)!;
    assert.ok(source);
    assert.equal(parent.officialReference, source.reference);
    assert.equal(parent.pdfPage, source.pdfPage);
    assert.equal(parent.printedPage, source.printedPage);
    assert.deepEqual(parent.components, source.components);
    assert.ok(parent.requirements.every((r) => r.id.startsWith(parent.parentId + ':r')));
  }
});

void test('curriculum teaching evidence resolves to real fields without promoting completion', () => {
  for (const parent of audit.parents) {
    assert.equal(parent.substatementAuditComplete, false);
    assert.equal(parent.teachingAuditStatus, 'partial');
    for (const requirement of parent.requirements) {
      assert.ok(requirement.remainingChecks.length > 0);
      assert.equal(requirement.completionStatus, 'partial');
      for (const evidence of requirement.teachingEvidence) {
        const section = notes.sections.find((s) => s.id === evidence.sectionId)!;
        assert.ok(section, evidence.sectionId);
        assert.ok(section.points.includes(parent.officialReference));
        const field = (section as unknown as Record<string, unknown>)[evidence.field];
        assert.ok(field, evidence.sectionId + ':' + evidence.field);
        if (Array.isArray(field)) assert.ok(field.length > 0);
      }
    }
  }
  assert.equal(notes.complete, false);
  assert.equal(audit.completeTeachingPoints, 0);
  assert.equal(audit.completeChapters, 0);
});

void test('new plotting teaching links are dated independently of the older source identity review', async () => {
  const { execFileSync } = await import('node:child_process');
  const rows = JSON.parse(execFileSync('python3', ['-c', "import json; from scripts.ledger_io import read_table; print(json.dumps(read_table('research/ledger/v1','coverage')[1]))"], { encoding: 'utf8' }));
  for (const ref of ['1.3', '1.7']) {
    const row = rows.find((r: Record<string, string>) => r.coverage_id === '4PH1:issue4:' + ref + ':plotting-motion-data');
    assert.ok(row);
    const point = inventory.points.find((p) => p.reference === ref)!;
    assert.equal(row.checked_at, point.teachingReviewedAt);
    assert.equal(row.updated_at, point.teachingReviewedAt);
    assert.equal(row.explanation_status, 'partial');
  }
  assert.equal(inventory.reviewDate, '2026-09-09');
});
