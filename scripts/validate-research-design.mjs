import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (name) => JSON.parse(readFileSync(root + name, 'utf8'));
const schema = read('research/schemas/template.schema.json');
const template = read(
  'research/templates/4EB1-retrieve-two-causes.v0.1.0.json',
);
const pilot = read('research/pilot/4EB1-2024-November-01.json');
const raw = read('research/paper-ledger.json');
const results = [];
function check(name, fn) {
  fn();
  results.push({ name, passed: true });
}
const ajv = new Ajv({ allErrors: true, strict: false });
const validateTemplate = ajv.compile(schema);

check('JSON schema and provisional family are valid', () => {
  assert(ajv.validateSchema(schema));
  assert(validateTemplate(template), JSON.stringify(validateTemplate.errors));
});
const templates = readdirSync(root + 'research/templates/')
  .filter((name) => name.endsWith('.json'))
  .map((name) => read('research/templates/' + name));
check(
  'Every saved family satisfies its schema and has no unreviewed activation',
  () => {
    for (const family of templates) {
      assert(
        validateTemplate(family),
        family.id + ': ' + JSON.stringify(validateTemplate.errors),
      );
      if (
        !['agent-reviewed', 'human-reviewed'].includes(
          family.review.pedagogyStatus,
        )
      )
        assert.notEqual(family.status, 'active');
      for (const ref of family.validation.runRefs)
        assert(existsSync(root + ref), ref);
    }
  },
);
check(
  'Physics prototype links its extracted task and student answer guide',
  () => {
    const family = templates.find((t) => t.id === '4PH1.collinear-resultant');
    const extraction = read(
      'research/extractions/4PH1-2024-June-1-standard.json',
    );
    const source = family.sourceTasks[0];
    const task = extraction.tasks.find((t) => t.taskId === source.taskId);
    assert(task);
    assert.equal(source.originalMarks, task.originalMarks);
    assert.deepEqual(source.markScheme.pdfPages, task.markSchemePages);
    assert.deepEqual(source.questionPaper.pdfPages, task.questionPaperPages);
    assert(
      read('content/notes/physics.json').sections.some(
        (section) =>
          section.answerGuide?.id === family.answerGuideId &&
          section.answerGuide.sourceTaskId === source.taskId,
      ),
    );
    assert.equal(family.status, 'provisional');
    assert.equal(family.runtime.implemented, true);
    assert.deepEqual(family.customQuiz.validatedMarks, []);
  },
);
check('Untested family cannot be promoted to active', () => {
  const candidate = structuredClone(template);
  candidate.status = 'active';
  assert.equal(validateTemplate(candidate), false);
});
check(
  'Custom maximum of three is rejected; source marks are preserved separately',
  () => {
    const candidate = structuredClone(template);
    candidate.customQuiz.candidateMarks = [3];
    assert.equal(validateTemplate(candidate), false);
    assert.deepEqual(template.originalMarks, [2]);
    assert(pilot.tasks.some((t) => t.marks === 15));
  },
);
check('Public field contract cannot include a rubric', () => {
  const candidate = structuredClone(template);
  candidate.runtime.publicFields.push('rubric');
  assert.equal(validateTemplate(candidate), false);
});
check(
  'Every pilot task has a unique number, matching AO marks and valid evidence pages',
  () => {
    assert.equal(new Set(pilot.tasks.map((t) => t.id)).size, 11);
    assert.deepEqual(
      pilot.tasks.map((t) => t.number),
      Array.from({ length: 11 }, (_, i) => i + 1),
    );
    for (const task of pilot.tasks) {
      assert.equal(
        Object.values(task.aoMarks).reduce((a, b) => a + b, 0),
        task.marks,
      );
      assert(
        task.qpPages.every((p) => Number.isInteger(p) && p >= 1 && p <= 36),
      );
      assert(
        task.msPages.length &&
          task.msPages.every((p) => Number.isInteger(p) && p >= 1 && p <= 20),
      );
    }
  },
);
check(
  'All three permitted candidate paths total 100, while all alternatives total 160',
  () => {
    const compulsory = pilot.tasks.filter((t) => t.section !== 'C');
    const base = compulsory.reduce((s, t) => s + t.marks, 0);
    for (const option of pilot.tasks.filter((t) => t.section === 'C')) {
      assert.equal(base + option.marks, pilot.counts.assessedMarks);
      assert.equal(compulsory.length + 1, pilot.counts.candidateAnsweredTasks);
    }
    assert.equal(
      pilot.tasks.reduce((s, t) => s + t.marks, 0),
      pilot.counts.allAlternativesMarks,
    );
  },
);
check('Partial extraction cannot be counted as a processed paper', () => {
  assert.equal(
    pilot.tasks.filter((t) => t.detailedExtraction).length,
    pilot.counts.detailedExtractions,
  );
  assert.equal(pilot.counts.detailedExtractions, 1);
  assert.equal(pilot.counts.fullyProcessedPapers, 0);
  assert.notEqual(pilot.processingStatus, 'processed');
  assert.equal(pilot.templateLinksComplete, false);
  assert(pilot.blockingIssues.length > 0);
});
check('Q5, template and exact scheme references agree', () => {
  const task = pilot.tasks.find((t) => t.number === 5);
  const source = template.sourceTasks[0];
  assert.equal(source.taskId, task.id);
  assert.equal(source.originalMarks, task.marks);
  assert.equal(
    source.markScheme.documentId,
    pilot.documents.find((d) => d.type === 'mark-scheme').id,
  );
  assert.deepEqual(source.markScheme.pdfPages, task.msPages);
  assert.equal(task.detailedExtraction.templateId, template.id);
});
check(
  'Raw counts remain discoveries and are not silently replaced by pilot counts',
  () => {
    assert.equal(raw.length, 390);
    const count = (type) => raw.filter((r) => r.documentType === type).length;
    assert.equal(count('question-paper'), 188);
    assert.equal(count('mark-scheme'), 186);
    assert.equal(count('examiner-report'), 16);
    assert.equal(
      raw.filter(
        (r) => r.documentType === 'question-paper' && /extract/i.test(r.title),
      ).length,
      2,
    );
    for (const document of pilot.documents) {
      const legacy = raw.find((r) => r.id === document.legacyLinkId);
      assert(legacy);
      assert.equal(new URL(legacy.url).searchParams.get('pdf'), document.url);
    }
  },
);
check(
  'CSV contracts contain unique headers and cover each normalized table',
  () => {
    const dir = root + 'research/ledger/v1/';
    const files = readdirSync(dir).filter((n) => n.endsWith('.csv'));
    assert.equal(files.length, 11);
    for (const name of files) {
      const headers = readFileSync(dir + name, 'utf8')
        .split(/\r?\n/)[0]
        .split(',');
      assert.equal(new Set(headers).size, headers.length);
      assert(headers.every((h) => /^[a-z][a-z0-9_]*$/.test(h)));
    }
  },
);
check(
  'Custom blueprint arithmetic: 22 tasks, 80 marks, only allowed maxima',
  () => {
    const plan = [
      [8, 2],
      [10, 4],
      [4, 6],
    ];
    assert.equal(
      plan.reduce((s, [n, m]) => s + n * m, 0),
      80,
    );
    assert.equal(
      plan.reduce((s, [n]) => s + n, 0),
      22,
    );
    assert(plan.every(([, m]) => [2, 4, 6].includes(m)));
  },
);

let hashesVerified = 0;
for (const document of pilot.documents) {
  const local =
    root +
    pilot.evidenceDirectory +
    '/' +
    new URL(document.url).pathname.split('/').pop();
  if (!existsSync(local)) continue;
  assert.equal(
    createHash('sha256').update(readFileSync(local)).digest('hex'),
    document.sha256,
  );
  hashesVerified++;
}
console.log(
  JSON.stringify(
    {
      scope:
        'research design only; no API calls, bulk processing or application tests',
      checks: results.length,
      results,
      pilotDocumentHashesVerified: hashesVerified,
      missingLocalEvidence: 3 - hashesVerified,
      activeTemplates: templates.filter((t) => t.status === 'active').length,
      fullyProcessedPapers: pilot.counts.fullyProcessedPapers,
    },
    null,
    2,
  ),
);
