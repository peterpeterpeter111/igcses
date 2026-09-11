// Experimental source-derived generation. No API route serves this prototype.
// It deliberately does not produce a PrivateQuestion that can start a quiz.
export const RESULTANT_FAMILY = Object.freeze({
  id: '4PH1.collinear-resultant',
  version: '0.1.0',
  status: 'provisional',
  sourceTaskId: '4PH1-2024-June-1-standard.Q5.b.i',
} as const);
export type ForceParameters = {
  task: 'resultant' | 'missing-force';
  representation: 'prose' | 'table';
  axis: 'horizontal' | 'vertical';
  context: number;
  forces: number[]; // Signed integer tenths of a newton; no floating-point sums.
};
export type ResultantPrototype = {
  family: typeof RESULTANT_FAMILY;
  seed: number;
  parameters: ForceParameters;
  structuralSignature: string;
  publicQuestion: { prompt: string; stimulus: string; maximumMarks: 2 };
  privateSolution: {
    signedTenths: number;
    magnitudeN: number;
    direction: string;
    working: string[];
    criteria: { id: string; marks: 1; description: string }[];
  };
  validation: { mathematicallyChecked: boolean; liveEligible: false };
};
const contexts = {
  horizontal: [
    'a workshop trolley',
    'a model tugboat',
    'a magnetic test carriage',
  ],
  vertical: [
    'a suspended instrument',
    'a model lift platform',
    'a rising probe',
  ],
};
const directions = {
  horizontal: ['right', 'left'],
  vertical: ['upwards', 'downwards'],
} as const;
const decimal = (tenths: number) => (tenths / 10).toFixed(1);
function workedSolution(p: ForceParameters, total: number, answer: number) {
  const target =
    p.task === 'resultant' ? 'the resultant force' : 'the unknown force A';
  return [
    `Take ${directions[p.axis][0]} as positive.`,
    p.task === 'resultant'
      ? `Signed resultant = ${p.forces.map((f) => decimal(f)).join(' + ')} = ${decimal(total)} N.`
      : `Signed force A = signed resultant − other signed forces = ${decimal(total)} − (${p.forces
          .slice(1)
          .map((f) => decimal(f))
          .join(' + ')}) = ${decimal(answer)} N.`,
    `${target[0].toUpperCase() + target.slice(1)} has magnitude ${decimal(Math.abs(answer))} N and acts ${direction(answer, p.axis)}.`,
  ];
}
function direction(value: number, axis: ForceParameters['axis']) {
  return directions[axis][value > 0 ? 0 : 1];
}
export function assertForceParameters(p: ForceParameters) {
  if (
    !['resultant', 'missing-force'].includes(p.task) ||
    !['prose', 'table'].includes(p.representation) ||
    !['horizontal', 'vertical'].includes(p.axis) ||
    !Number.isInteger(p.context) ||
    p.context < 0 ||
    p.context > 2 ||
    ![2, 3].includes(p.forces.length) ||
    p.forces.some(
      (f) => !Number.isInteger(f) || Math.abs(f) < 5 || Math.abs(f) > 250,
    ) ||
    !p.forces.some((f) => f > 0) ||
    !p.forces.some((f) => f < 0) ||
    p.forces.reduce((sum, f) => sum + f, 0) === 0
  ) {
    throw new Error(
      'Parameters are outside the reviewed non-zero, opposing-force domain.',
    );
  }
}
export function buildResultantPrototype(
  seed: number,
  p: ForceParameters,
): ResultantPrototype {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Invalid seed');
  assertForceParameters(p);
  const labels = ['A', 'B', 'C'];
  const total = p.forces.reduce((sum, force) => sum + force, 0);
  const answer = p.task === 'resultant' ? total : p.forces[0];
  const readings = p.forces
    .map((force, i) => ({
      label: 'Force ' + labels[i],
      magnitude: decimal(Math.abs(force)) + ' N',
      direction: direction(force, p.axis),
    }))
    .filter((_, i) => p.task === 'resultant' || i !== 0);
  if (p.task === 'missing-force')
    readings.push({
      label: 'Resultant force',
      magnitude: decimal(Math.abs(total)) + ' N',
      direction: direction(total, p.axis),
    });
  const data =
    p.representation === 'table'
      ? [
          'Quantity | Magnitude | Direction',
          ...readings.map(
            (r) => `${r.label} | ${r.magnitude} | ${r.direction}`,
          ),
        ].join('\n')
      : readings
          .map((r) => `${r.label} is ${r.magnitude} ${r.direction}.`)
          .join(' ');
  const target =
    p.task === 'resultant' ? 'the resultant force' : 'the unknown force A';
  const stimulus = `In a test, ${p.forces.length} forces labelled ${labels.slice(0, p.forces.length).join(', ')} act on ${contexts[p.axis][p.context]} along one ${p.axis} line. These are all forces along this line. Any forces in other directions balance.\n\n${data}`;
  const working = workedSolution(p, total, answer);
  const instance: ResultantPrototype = {
    family: RESULTANT_FAMILY,
    seed,
    parameters: structuredClone(p),
    structuralSignature: [
      p.task,
      p.representation,
      p.axis,
      p.forces.length,
    ].join(':'),
    publicQuestion: {
      prompt: `Determine the magnitude in newtons and direction of ${target}. Show your working.`,
      stimulus,
      maximumMarks: 2,
    },
    privateSolution: {
      signedTenths: answer,
      magnitudeN: Math.abs(answer) / 10,
      direction: direction(answer, p.axis),
      working,
      criteria: [
        {
          id: 'magnitude',
          marks: 1,
          description: `Correct magnitude: ${decimal(Math.abs(answer))} N. Exact decimal equivalent accepted.`,
        },
        {
          id: 'direction',
          marks: 1,
          description: `Correct direction: ${direction(answer, p.axis)}; equivalent unambiguous wording accepted.`,
        },
      ],
    },
    validation: { mathematicallyChecked: false, liveEligible: false },
  };
  instance.validation.mathematicallyChecked =
    validateResultantPrototype(instance);
  if (!instance.validation.mathematicallyChecked)
    throw new Error('Independent force validation failed');
  return instance;
}
export function generateResultantPrototype(seed: number): ResultantPrototype {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Invalid seed');
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  const pick = (size: number) => Math.floor(next() * size);
  const p: ForceParameters = {
    task: pick(2) ? 'missing-force' : 'resultant',
    representation: pick(2) ? 'table' : 'prose',
    axis: pick(2) ? 'vertical' : 'horizontal',
    context: pick(3),
    forces: [],
  };
  const count = pick(2) + 2;
  for (let attempt = 0; attempt < 20; attempt++) {
    p.forces = [5 + pick(246), -(5 + pick(246))];
    if (count === 3) p.forces.push((pick(2) ? 1 : -1) * (5 + pick(246)));
    if (pick(2)) p.forces = p.forces.map((f) => -f);
    if (p.forces.reduce((sum, force) => sum + force, 0) !== 0)
      return buildResultantPrototype(seed, p);
  }
  throw new Error('Bounded sampling could not produce a non-zero resultant.');
}
// Separate check uses directional totals and the inverse balance equation.
// It does not evaluate the worked solution string or reuse its arithmetic path.
export function validateResultantPrototype(
  instance: ResultantPrototype,
): boolean {
  const p = instance.parameters;
  try {
    assertForceParameters(p);
  } catch {
    return false;
  }
  if (
    !Number.isInteger(instance.seed) ||
    instance.seed < 0 ||
    instance.seed > 0xffffffff ||
    instance.family.id !== RESULTANT_FAMILY.id ||
    instance.family.version !== RESULTANT_FAMILY.version ||
    instance.family.status !== RESULTANT_FAMILY.status ||
    instance.family.sourceTaskId !== RESULTANT_FAMILY.sourceTaskId ||
    instance.structuralSignature !==
      [p.task, p.representation, p.axis, p.forces.length].join(':') ||
    Object.keys(instance.publicQuestion).sort().join(',') !==
      'maximumMarks,prompt,stimulus'
  )
    return false;
  const forward = p.forces.filter((f) => f > 0).reduce((sum, f) => sum + f, 0);
  const backward = p.forces.filter((f) => f < 0).reduce((sum, f) => sum - f, 0);
  const net = forward - backward;
  const parts = instance.publicQuestion.stimulus.split('\n\n');
  const labels = ['A', 'B', 'C'].slice(0, p.forces.length).join(', ');
  const introduction = `In a test, ${p.forces.length} forces labelled ${labels} act on ${contexts[p.axis][p.context]} along one ${p.axis} line. These are all forces along this line. Any forces in other directions balance.`;
  if (
    parts.length !== 2 ||
    parts[0] !== introduction ||
    (p.representation === 'table' &&
      parts[1].split('\n')[0] !== 'Quantity | Magnitude | Direction')
  )
    return false;
  const rows =
    p.representation === 'table'
      ? parts[1]
          .split('\n')
          .slice(1)
          .map((row) =>
            row.match(
              /^(Force [ABC]|Resultant force) \| ([0-9]+\.[0-9]) N \| (right|left|upwards|downwards)$/,
            ),
          )
      : parts[1]
          .split('. ')
          .map((row) =>
            row
              .replace(/\.$/, '')
              .match(
                /^(Force [ABC]|Resultant force) is ([0-9]+\.[0-9]) N (right|left|upwards|downwards)$/,
              ),
          );
  const expectedReadings = p.forces
    .map((f, i) => ({ label: 'Force ' + ['A', 'B', 'C'][i], value: f }))
    .filter((_, i) => p.task === 'resultant' || i !== 0);
  if (p.task === 'missing-force')
    expectedReadings.push({ label: 'Resultant force', value: net });
  if (
    rows.length !== expectedReadings.length ||
    rows.some((row, i) => {
      const expected = expectedReadings[i];
      return (
        !row ||
        row[1] !== expected.label ||
        Number(row[2].replace('.', '')) !== Math.abs(expected.value) ||
        row[3] !== direction(expected.value, p.axis)
      );
    })
  )
    return false;
  const target =
    p.task === 'resultant' ? 'the resultant force' : 'the unknown force A';
  if (
    instance.publicQuestion.prompt !==
    `Determine the magnitude in newtons and direction of ${target}. Show your working.`
  )
    return false;
  const value = instance.privateSolution.signedTenths;
  const expectedValue = p.task === 'resultant' ? net : p.forces[0];
  const balance =
    p.task === 'resultant'
      ? value === net
      : p.forces.slice(1).reduce((sum, force) => sum + force, value) === net;
  const expectedDirection =
    value > 0
      ? p.axis === 'horizontal'
        ? 'right'
        : 'upwards'
      : p.axis === 'horizontal'
        ? 'left'
        : 'downwards';
  return (
    balance &&
    instance.privateSolution.magnitudeN === Math.abs(value) / 10 &&
    instance.privateSolution.direction === expectedDirection &&
    instance.publicQuestion.maximumMarks === 2 &&
    instance.privateSolution.criteria.length === 2 &&
    instance.privateSolution.criteria.every((c) => c.marks === 1) &&
    instance.privateSolution.criteria[0].id === 'magnitude' &&
    instance.privateSolution.criteria[0].description ===
      `Correct magnitude: ${decimal(Math.abs(expectedValue))} N. Exact decimal equivalent accepted.` &&
    instance.privateSolution.criteria[1].id === 'direction' &&
    instance.privateSolution.criteria[1].description ===
      `Correct direction: ${expectedDirection}; equivalent unambiguous wording accepted.` &&
    JSON.stringify(instance.privateSolution.working) ===
      JSON.stringify(workedSolution(p, net, expectedValue)) &&
    instance.validation.liveEligible === false
  );
}
