import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import skills from '../research/syllabus-skills/4CH1-issue3-selected.json' with { type: 'json' };
void test('Chemistry applicability inventory excludes other-science-only rows and keeps processing gates closed', () => {
  const mathematical = skills.skills.filter((skill) => skill.kind === 'mathematical');
  const experimental = skills.skills.filter((skill) => skill.kind === 'experimental');
  assert.equal(mathematical.length, 18);
  assert.equal(experimental.length, 10);
  assert.deepEqual(mathematical.map((skill) => skill.id.split(':').at(-1)), ['1A','1B','1C','2A','2B','2C','2F','2H','2I','3A','3B','3C','3D','4A','4B','4C','4D','4E']);
  assert.deepEqual(skills.excludedMathematicalRows.map((row) => row.row), ['1D','1E','2D','2E','2G','4F','5A','5B','5C']);
  assert.equal(skills.fullyProcessedPaper, false);
  assert.equal(skills.wholePaperSkillsAllocationReviewed, false);
  assert.equal(skills.assessmentObjectiveContext.officialPerLeafAllocationObtained, false);
  assert.equal(skills.humanReviewed, false);
  assert.equal(skills.reviewedLeafCount + skills.unreviewedLeafCount, 56);
});
void test('Selected Chemistry skill decisions are tied to unchanged private source partitions without invented precision or tangent demands', () => {
  assert.equal(skills.taskMappings.length, 12);
  assert.equal(new Set(skills.taskMappings.map((row) => row.taskId)).size, 12);
  const validSkills = new Set(skills.skills.map((skill) => skill.id));
  for (const row of skills.taskMappings) {
    const bytes = readFileSync(row.sourcePartitionRef);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sourcePartitionSha256);
    const part = JSON.parse(bytes.toString()) as { tasks: { taskId: string; questionPath: string; questionPaperPages: number[]; markSchemePages: number[] }[] };
    const task = part.tasks.find((task) => task.taskId === row.taskId)!;
    assert.ok(task);
    assert.equal(task.questionPath, row.questionPath);
    assert.deepEqual(row.questionPaperPages, task.questionPaperPages);
    assert.deepEqual(row.markSchemePages, task.markSchemePages);
    assert.ok(row.mappings.every((mapping) => validSkills.has(mapping.skillId) && mapping.applicability === 'required'));
    assert.equal(row.humanReviewed, false);
  }
  for (const path of ['3.c', '10.b']) assert.ok(!skills.taskMappings.find((row) => row.questionPath === path)!.mappings.some((mapping) => mapping.skillId.endsWith(':2A')));
  assert.ok(!skills.taskMappings.find((row) => row.questionPath === '9.b.i')!.mappings.some((mapping) => mapping.skillId.endsWith(':4E')));
});
