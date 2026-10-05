// Offline mechanical/fixture evidence, never a live-readiness decision.
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import fixtures from '../research/validation/retrieval-marking-cases.json' with { type: 'json' };
import { generateRetrievalPrototype, validateRetrievalPrototype, buildRetrievalPrototype, RETRIEVAL_PARAMETER_SPACE, type RetrievalParameters } from '../server/generators/retrieve-two-causes.ts';
import { markRetrievalResponse } from '../server/generators/retrieval-marking.ts';
const unique = new Set<string>(), shapes = new Set<string>(); let minWords = Infinity, maxWords = 0, evidenceSpans = 0;
for (let seed = 0; seed < RETRIEVAL_PARAMETER_SPACE; seed++) {
  const q = generateRetrievalPrototype(seed); assert.ok(validateRetrievalPrototype(q));
  unique.add(JSON.stringify(q.publicQuestion)); shapes.add([q.parameters.context, q.parameters.causeIds.length, q.parameters.remedyCount, q.parameters.evidenceOrder].join(':'));
  minWords = Math.min(minWords, q.validation.wordCount); maxWords = Math.max(maxWords, q.validation.wordCount);
  for (const group of [...q.privateSolution.causes, ...q.privateSolution.remedies]) {
    assert.equal(q.publicQuestion.stimulus.targetParagraph.slice(group.evidence.start, group.evidence.end), group.evidence.text); evidenceSpans++;
  }
}
const q = buildRetrievalPrototype(0, fixtures.parameters as RetrievalParameters);
for (const c of fixtures.cases) { const m = markRetrievalResponse(q, { answers: c.answers, additionalEvidence: c.additionalEvidence }); assert.equal(m.status, c.status, c.id); assert.equal(m.score, c.score, c.id); }
const report = { date: '2026-10-05', scope: 'Offline finite composition and independent manually authored synthetic transcription cases. Not learner responses, reading-demand equivalence or full semantic marking calibration.', templateId: q.family.id, templateVersion: q.family.version,
  parameterPackagesChecked: RETRIEVAL_PARAMETER_SPACE, distinctPublicByteStrings: unique.size, parameterBoundaryShapes: shapes.size, passageWordRange: [minWords, maxWords], exactSpansChecked: evidenceSpans,
  fixtureCases: fixtures.cases.length, scoredCases: fixtures.cases.filter(c => c.status === 'scored').length, deferredCases: fixtures.cases.filter(c => c.status === 'needs-review').length,
  sourceEvidence: { taskId: q.family.sourceTaskId, questionPaper: { documentId: 'pilot-4EB1-2024-November-01-qp', pdfPages: [6, 33] }, markScheme: { documentId: 'pilot-4EB1-2024-November-01-ms', pdfPages: [8] } },
  liveEligible: false, activeTemplates: 0, learnerCalibrationPerformed: false,
  remaining: ['Finite original word bank; unconstrained original-text generation not implemented.', 'Explicit causal sentence forms are easier than many examination passages; no empirical difficulty equivalence.', 'Broad paraphrases, contradictory/combined claims and extra evidence require review.', 'Distinct byte strings do not prove semantic diversity or near-duplicate rejection.', 'No 4/6-mark adaptation or completed quiz blueprint; live AI remains deferred.'] };
const output = process.argv[2]; if (!output) throw new Error('Choose a new review report path');
writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(report));
