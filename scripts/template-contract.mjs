import { readFileSync } from 'node:fs';
import Ajv from 'ajv';

const schema = JSON.parse(readFileSync(new URL('../research/schemas/template.schema.json', import.meta.url), 'utf8'));
const validateShape = new Ajv({ allErrors: true, strict: false }).compile(schema);

// Research-only contract checks. Passing this gate is not evidence of teaching
// quality, calibrated marking, or permission to register a live generator.
export function templateContractErrors(family) {
  if (!validateShape(family)) return (validateShape.errors ?? []).map((e) => `${e.instancePath}: ${e.message}`);
  const errors = [];
  const require = (condition, message) => { if (!condition) errors.push(message); };
  const uniqueIds = (items, label) => require(
    items.every((item) => item.id.trim().length > 0) && new Set(items.map((item) => item.id)).size === items.length,
    `${label} identifiers must be nonempty and unique`,
  );
  uniqueIds(family.parameters, 'Parameter');
  uniqueIds(family.marking.criteria, 'Criterion');
  uniqueIds(family.transformations, 'Transformation');
  for (const p of family.parameters) {
    if (['integer', 'number'].includes(p.type)) {
      require(p.domain.minimum <= p.domain.maximum, `${p.id}: inverted numeric domain`);
      if (p.type === 'integer') require(
        [p.domain.minimum, p.domain.maximum, p.domain.step].every(Number.isInteger),
        `${p.id}: integer domain contains fractional bounds or step`,
      );
    }
    if (p.type === 'original-text') require(p.domain.minWords <= p.domain.maxWords, `${p.id}: inverted word range`);
  }
  require(family.customQuiz.validatedMarks.every((m) => family.customQuiz.candidateMarks.includes(m)), 'Validated marks must be a subset of candidate marks');
  // This version supplies one scheme, so it cannot certify several maxima.
  require(family.customQuiz.validatedMarks.every((m) => m === family.marking.maximum), 'Every validated maximum needs its own matching scheme');
  if (family.marking.method === 'levels') {
    const bands = [...family.marking.levelRubric].sort((a, b) => a.minMarks - b.minMarks);
    require(new Set(bands.map((b) => b.level)).size === bands.length, 'Rubric levels must be unique');
    require(bands[0].minMarks === 0 && bands.at(-1).maxMarks === family.marking.maximum, 'Level rubric must cover zero through the maximum');
    for (const [index, band] of bands.entries()) {
      require(band.minMarks <= band.maxMarks, 'Level rubric has an inverted band');
      if (index > 0) require(band.minMarks === bands[index - 1].maxMarks + 1 && band.level > bands[index - 1].level, 'Level rubric has gaps, overlaps or unordered levels');
    }
  } else {
    require(family.marking.criteria.reduce((sum, c) => sum + c.credit, 0) === family.marking.maximum, 'Criterion credits must equal the scheme maximum');
    require(family.marking.levelRubric.length === 0, 'Non-level marking must not contain an alternative level rubric');
  }
  require(family.review.humanReviewed === (family.review.pedagogyStatus === 'human-reviewed'), 'Human-review flag must agree with the recorded review status');
  if (family.review.pedagogyStatus === 'human-reviewed') require(family.review.reviewerType === 'human', 'Human-reviewed status requires a human reviewer');
  if (family.review.pedagogyStatus === 'agent-reviewed') require(family.review.reviewerType === 'agent', 'Agent-reviewed status requires an agent reviewer');
  if (family.runtime.implemented) require(typeof family.runtime.generatorId === 'string' && family.runtime.generatorId.trim().length > 0, 'Implemented runtime must identify its generator');
  if (['validated', 'active'].includes(family.status)) {
    require(family.syllabusRefs.every((ref) => ref.mappingStatus === 'verified'), 'Promotion requires verified syllabus mappings');
    require(family.assessmentObjectives.every((ao) => /^AO[1-9][0-9]*$/.test(ao)), 'Promotion requires assigned assessment objectives');
    require(family.transformations.every((t) => t.status !== 'candidate'), 'Promotion cannot include unvalidated transformations');
    require(family.customQuiz.validatedMarks.includes(family.marking.maximum), 'Promotion requires a validated scheme maximum');
    require(family.review.reviewer?.trim().length > 0, 'Promotion requires an identified reviewer');
  }
  return errors;
}
