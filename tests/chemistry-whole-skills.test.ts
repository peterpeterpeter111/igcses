import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import audit from '../research/syllabus-skills/4CH1-issue3.json' with { type: 'json' };
import selected from '../research/syllabus-skills/4CH1-issue3-selected.json' with { type: 'json' };

void test('Whole Chemistry demand review binds every original leaf once and cannot invent skill or AO marks', () => {
  const sourceTasks: { taskId: string; questionPath: string; originalMarks: number }[] = [];
  for (let question = 1; question <= 10; question++) {
    const path = `research/extractions/4CH1-2024-June-1-standard/Q${question}.json`;
    const bytes = readFileSync(path);
    sourceTasks.push(...(JSON.parse(bytes.toString()) as { tasks: typeof sourceTasks }).tasks);
    for (const row of audit.taskMappings.filter((row) => row.sourcePartitionRef === path)) assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sourcePartitionSha256);
  }
  assert.deepEqual(audit.taskMappings.map((row) => [row.taskId, row.questionPath, row.originalMarks]), sourceTasks.map((row) => [row.taskId, row.questionPath, row.originalMarks]));
  assert.equal(new Set(audit.taskMappings.map((row) => row.taskId)).size, 56);
  assert.equal(audit.taskMappings.reduce((sum, row) => sum + row.originalMarks, 0), 110);
  const allowed = new Set(audit.skills.map((skill) => skill.id));
  for (const row of audit.taskMappings) {
    assert.ok(row.rationale.length > 40);
    assert.ok(row.mappings.every((mapping) => allowed.has(mapping.skillId) && mapping.applicability === 'required'));
    assert.equal(new Set(row.mappings.map((mapping) => mapping.skillId)).size, row.mappings.length);
    assert.equal(row.decision, row.mappings.length ? 'mapped' : 'no-separate-listed-demand');
    assert.equal(row.humanReviewed, false);
  }
  assert.equal(audit.counts.mappedLeaves + audit.counts.noSeparateListedDemandLeaves, 56);
  assert.equal(audit.counts.mathematicalDemandLeaves, 12);
  assert.equal(audit.counts.experimentalDemandLeaves, 27);
  assert.equal(audit.allLeafDemandReviewed, true);
  assert.equal(audit.officialSkillMarkAllocationObtained, false);
  assert.equal(audit.assessmentObjectiveContext.officialPerLeafAllocationObtained, false);
  assert.equal(audit.fullyProcessedPaper, false);
});
void test('Whole Chemistry review preserves selected maths decisions and refuses common category overclaims', () => {
  for (const old of selected.taskMappings) {
    const current = audit.taskMappings.find((row) => row.taskId === old.taskId)!;
    assert.deepEqual(current.mappings.filter((mapping) => mapping.skillId.includes(':mathematical:')), old.mappings);
  }
  const refs = (path: string) => audit.taskMappings.find((row) => row.questionPath === path)!.mappings.map((mapping) => mapping.skillId.split(':').at(-1));
  assert.deepEqual(refs('7.a'), []); // Recognising a percentage is not computing one.
  assert.deepEqual(refs('8.a.ii'), []); // Chemistry bond drawings are not Physics-only geometry.
  assert.ok(!refs('9.b.i').includes('4E')); // No tangent requested.
  assert.ok(!refs('9.c').includes('06')); // The task does not ask to identify variables.
  assert.ok(!refs('10.d').includes('09')); // Accuracy is not reliability.
  assert.deepEqual(refs('6.b.ii'), ['02']); // Predicting a known flame colour is not interpreting given unknown data.
});
