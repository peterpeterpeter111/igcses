import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateResultantPrototype,
  buildResultantPrototype,
  validateResultantPrototype,
  type ForceParameters,
} from '../server/generators/collinear-resultant.ts';

void test('seeded force prototypes vary structure and remain deterministic and ineligible for live quizzes', () => {
  const signatures = new Set<string>(),
    questions = new Set<string>();
  for (let seed = 0; seed < 200; seed++) {
    const q = generateResultantPrototype(seed);
    assert.deepEqual(generateResultantPrototype(seed), q);
    assert.equal(q.family.status, 'provisional');
    assert.equal(q.validation.liveEligible, false);
    assert.equal(validateResultantPrototype(q), true);
    assert.equal(
      q.privateSolution.criteria.reduce((n, c) => n + c.marks, 0),
      2,
    );
    assert.deepEqual(Object.keys(q.publicQuestion).sort(), [
      'maximumMarks',
      'prompt',
      'stimulus',
    ]);
    signatures.add(q.structuralSignature);
    questions.add(q.publicQuestion.prompt + q.publicQuestion.stimulus);
  }
  assert.equal(signatures.size, 16);
  assert.equal(questions.size, 200);
});

void test('force prototypes solve direct and inverse boundary cases in every supported structure', () => {
  for (const task of ['resultant', 'missing-force'] as const)
    for (const representation of ['prose', 'table'] as const)
      for (const axis of ['horizontal', 'vertical'] as const)
        for (const context of [0, 1, 2])
          for (const forces of [
            [5, -250],
            [250, -5],
            [5, -5, 250],
            [-250, 250, -5],
          ]) {
            const q = buildResultantPrototype(0, {
              task,
              representation,
              axis,
              context,
              forces,
            });
            const expected =
              task === 'resultant'
                ? forces.reduce((sum, f) => sum + f, 0)
                : forces[0];
            assert.equal(q.privateSolution.signedTenths, expected);
            assert.equal(validateResultantPrototype(q), true);
          }
});

void test('force prototypes reject singular or out-of-domain inputs and corrupted solutions', () => {
  const p: ForceParameters = {
    task: 'resultant',
    representation: 'prose',
    axis: 'horizontal',
    context: 0,
    forces: [10, -5],
  };
  for (const forces of [
    [5, -5],
    [4, -250],
    [5, -251],
    [5, 10],
    [5.5, -10],
    [NaN, -5],
    [5],
  ]) {
    assert.throws(() => buildResultantPrototype(0, { ...p, forces }));
  }
  for (const seed of [-1, 0.5, NaN, 0x100000000])
    assert.throws(() => generateResultantPrototype(seed));
  const q = buildResultantPrototype(0, p);
  q.privateSolution.signedTenths += 1;
  assert.equal(validateResultantPrototype(q), false);
  const wrongDirection = buildResultantPrototype(0, p);
  wrongDirection.privateSolution.direction = 'left';
  assert.equal(validateResultantPrototype(wrongDirection), false);
});

void test('force prototype validation rejects changed public data in both representations', () => {
  for (const representation of ['prose', 'table'] as const) {
    const q = buildResultantPrototype(0, {
      task: 'resultant',
      representation,
      axis: 'horizontal',
      context: 0,
      forces: [10, -5],
    });
    q.publicQuestion.stimulus = q.publicQuestion.stimulus.replace(
      '1.0 N',
      '2.0 N',
    );
    assert.equal(validateResultantPrototype(q), false);
  }
});

void test('force validation rejects altered context, provenance, rubric, working and leaked fields', () => {
  const original = buildResultantPrototype(0, {
    task: 'resultant',
    representation: 'table',
    axis: 'vertical',
    context: 0,
    forces: [32, -20],
  });
  const changes = [
    (q: typeof original) => {
      q.privateSolution.working[1] = '3.2 + 2.0 = 1.2 N';
    },
    (q: typeof original) => {
      q.privateSolution.criteria[0].id = 'direction';
    },
    (q: typeof original) => {
      q.privateSolution.criteria[1].description = 'Credit downwards';
    },
    (q: typeof original) => {
      q.publicQuestion.stimulus = q.publicQuestion.stimulus.replace(
        'Any forces in other directions balance.',
        'Other forces are unknown.',
      );
    },
    (q: typeof original) => {
      q.publicQuestion.stimulus = q.publicQuestion.stimulus.replace(
        'Quantity | Magnitude | Direction',
        'Quantity | Energy | Direction',
      );
    },
    (q: typeof original) => {
      q.seed = -1;
    },
    (q: typeof original) => {
      q.structuralSignature = 'different-family';
    },
    (q: typeof original) => {
      Object.assign(q.family, { status: 'active' });
    },
    (q: typeof original) => {
      Object.assign(q.publicQuestion, { solution: '1.2 N upwards' });
    },
  ];
  for (const change of changes) {
    const q = structuredClone(original);
    change(q);
    assert.equal(validateResultantPrototype(q), false);
  }
});
