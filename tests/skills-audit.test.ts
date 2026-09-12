import { test } from 'node:test';
import assert from 'node:assert/strict';
import skills from '../research/syllabus-skills/4PH1-issue4.json' with { type: 'json' };
import paper from '../research/extractions/4PH1-2024-June-1-standard.json' with { type: 'json' };
import { reviewedInventories } from '../lib/syllabus.ts';

void test('skills audit separates Physics applicability from numbered content and AO allocation', () => {
  assert.equal(skills.skills.length, 35);
  assert.equal(new Set(skills.skills.map((s) => s.id)).size, 35);
  assert.equal(skills.skills.filter((s) => s.kind === 'experimental').length, 10);
  assert.equal(skills.skills.filter((s) => s.kind === 'mathematical').length, 25);
  for (const row of ['2E', '2G']) {
    assert.ok(skills.excludedMathematicalRows.some((s) => s.row === row));
    assert.ok(!skills.skills.some((s) => s.id === '4PH1:issue4:mathematical:' + row));
  }
  const parents = reviewedInventories.flatMap((i) => i.points);
  assert.equal(parents.length, 195);
  assert.ok(skills.skills.every((s) => !parents.some((p) => p.id === s.id)));
  assert.equal(skills.documentSha256, reviewedInventories[0].specificationSha256);
  assert.equal(skills.assessmentObjectiveCaution.officialTaskAllocationVerified, false);
  assert.equal(skills.teachingCompletionAssessed, false);
  assert.equal(skills.fullyProcessedPaper, false);
});

void test('Q10 skills link exact specification, paper and scheme pages without activating templates', () => {
  const tasks = paper.tasks.filter((t) => t.questionPath.startsWith('10.'));
  assert.deepEqual(skills.taskMappings.map((m) => m.taskId).sort(), tasks.map((t) => t.taskId).sort());
  assert.equal(skills.taskMappings.reduce((n, m) => n + m.mappings.length, 0), 16);
  for (const row of skills.taskMappings) {
    const task = tasks.find((t) => t.taskId === row.taskId)!;
    assert.deepEqual(task.skillMappings, row.mappings);
    assert.equal(task.templateLinkStatus, 'candidate-only');
    assert.deepEqual(task.assessmentObjectives, []);
    for (const mapping of row.mappings) {
      const skill = skills.skills.find((s) => s.id === mapping.skillId)!;
      assert.ok(skill);
      assert.ok(mapping.rationale.length > 0);
      assert.deepEqual(mapping.evidenceRefs, [
        { documentId: skills.documentId, pdfPages: [skill.sourceLocator.pdfPage] },
        { documentId: paper.documents[0].id, pdfPages: task.questionPaperPages },
        { documentId: paper.documents[1].id, pdfPages: task.markSchemePages },
      ]);
    }
  }
  assert.equal(paper.fullyProcessed, false);
});
