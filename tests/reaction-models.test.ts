import { createHash } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import bank from '../research/reaction-models/4CH1-named-core-2026-10-17.json' with { type: 'json' };
import reconciliationBank from '../research/reaction-models/4CH1-reconciliation-2026-10-18.json' with { type: 'json' };
import inorganicBank from '../research/reaction-models/4CH1-inorganic-families-2026-10-18.json' with { type: 'json' };
import organicBank from '../research/reaction-models/4CH1-organic-slice-2026-10-18.json' with { type: 'json' };
import note from '../content/notes/chemistry.json' with { type: 'json' };
import inventory from '../research/syllabus/4CH1-formulae-and-calculations.json' with { type: 'json' };
import scope from '../research/reviews/2026-10-17-REACTION-SOURCE-SCOPE.json' with { type: 'json' };
// Parses finite molecular formulae, including bracket groups and dot hydrates.
function atoms(formula: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const part of formula.split('.')) {
    const prefix = part.match(/^\d+/)?.[0] ?? '';
    const multiplier = Number(prefix || 1);
    const body = part.slice(prefix.length);
    const tokens = body.match(/[A-Z][a-z]?|\d+|[()]/g) ?? [];
    assert.equal(tokens.join(''), body);
    const stack: Record<string, number>[] = [{}];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === '(') { stack.push({}); continue; }
      const count = /^\d+$/.test(tokens[i + 1] ?? '') ? Number(tokens[++i]) : 1;
      if (token === ')') {
        assert.ok(stack.length > 1);
        const group = stack.pop()!;
        for (const [key, value] of Object.entries(group)) stack.at(-1)![key] = (stack.at(-1)![key] ?? 0) + value * count;
      } else {
        assert.match(token, /^[A-Z][a-z]?$/);
        stack.at(-1)![token] = (stack.at(-1)![token] ?? 0) + count;
      }
    }
    assert.equal(stack.length, 1);
    for (const [key, value] of Object.entries(stack[0])) result[key] = (result[key] ?? 0) + value * multiplier;
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
function total(species: { formula: string; coefficient: number }[]) {
  const sum: Record<string, number> = {};
  for (const item of species) {
    assert.ok(Number.isInteger(item.coefficient) && item.coefficient > 0);
    for (const [key, value] of Object.entries(atoms(item.formula))) sum[key] = (sum[key] ?? 0) + item.coefficient * value;
  }
  return Object.fromEntries(Object.entries(sum).sort(([a], [b]) => a.localeCompare(b)));
}
void test('finite reaction models conserve atoms, including water and hydrate multiplicities', () => {
  assert.deepEqual(atoms('CuSO4.5H2O'), { Cu: 1, H: 10, O: 9, S: 1 });
  assert.deepEqual(atoms('Al2(SO4)3'), { Al: 2, O: 12, S: 3 });
  assert.equal(bank.models.length, 13);
  for (const model of bank.models) assert.deepEqual(total(model.reactants), total(model.products), model.id);
  const broken = structuredClone(bank.models.find((m) => m.id === 'brine-electrolysis')!);
  broken.reactants[1].coefficient = 1;
  assert.notDeepEqual(total(broken.reactants), total(broken.products));
});
void test('published written models retain explicit conditions and matching mapped lessons', () => {
  const parent = inventory.points.find((p) => p.reference === '1.25')!;
  for (const model of bank.models) {
    const section = note.sections.find((s) => s.id === model.sectionId)!;
    assert.ok(parent.noteSectionIds.includes(model.sectionId), model.id);
    assert.ok(section.paragraphs.includes(model.condition));
    assert.ok(section.paragraphs.includes(model.interpretationLimit));
    assert.ok(section.paragraphs.some((p) => p.includes(model.formulaEquation)));
    assert.equal(section.practice!.answer, model.practice.answer);
    for (const item of [...model.reactants, ...model.products]) assert.ok(['s', 'l', 'g', 'aq'].includes(item.state));
    if (model.components.length === 1) { assert.deepEqual(model.components, ['2C']); assert.match(section.title, /Paper 2C/); }
  }
  const brine = bank.models.find((m) => m.id === 'brine-electrolysis')!;
  assert.match(brine.condition, /concentrated.*inert.*separated/);
  assert.match(brine.interpretationLimit, /dilute/);
  const lead = bank.models.find((m) => m.id === 'molten-lead-bromide')!;
  assert.equal(lead.products.find((p) => p.formula === 'Pb')!.state, 'l');
  assert.match(lead.condition, /hot|molten/i);
  assert.match(lead.condition, /inert electrodes/);
  assert.deepEqual(lead.sourceReferences, ['1.58C']);
  const displacement = bank.models.find((m) => m.id === 'zinc-copper-displacement')!;
  assert.ok(displacement.sourceReferences.includes('2.16'));
  assert.ok(!displacement.sourceReferences.includes('2.15'));
});
void test('individual source-classification slices do not self-certify the collection or exam bank', () => {
  assert.equal(scope.decisions.length, 182);
  assert.equal(new Set(scope.decisions.map((d) => d.id)).size, 182);
  for (const decision of scope.decisions) assert.ok(readFileSync(decision.reviewRef, 'utf8').includes(decision.id.split(':').at(-1)!));
  assert.equal(scope.wholeReactionCollectionComplete, false);
  assert.equal(bank.wholeCollectionComplete, false);
  const parent = inventory.points.find((p) => p.reference === '1.25')!;
  assert.equal(parent.teachingCoverage, 'complete');
  assert.equal(parent.substatementAuditComplete, true);
});

void test('Organic models preserve actual formula labels, formal accounting and representation boundaries', () => {
  assert.equal(organicBank.models.length, 14);
  assert.equal(organicBank.wholeCollectionComplete, false);
  assert.equal(organicBank.models.filter((m) => m.sourceDemand === 'required-named-route').length, 6);
  const parent = inventory.points.find((p) => p.reference === '1.25')!;
  for (const model of organicBank.models) {
    const left = model.reactants.map((p) => ({ formula: p.atomFormula, coefficient: p.coefficient }));
    const right = model.products.map((p) => ({ formula: p.atomFormula, coefficient: p.coefficient }));
    assert.deepEqual(total(left), total(right), model.id);
    for (const species of [...model.reactants, ...model.products]) {
      if (species.formulaLabel !== '[O]') assert.deepEqual(atoms(species.formulaLabel.replaceAll('=', '').replaceAll('–', '')), atoms(species.atomFormula), model.id);
    }
    const section = note.sections.find((s) => s.id === model.sectionId)!;
    assert.ok(parent.noteSectionIds.includes(model.sectionId));
    assert.ok(section.paragraphs.includes(model.stateContext));
    assert.ok(section.paragraphs.includes(model.conditions));
    for (const paragraph of section.paragraphs) assert.doesNotMatch(paragraph, /(?:^|[+→⇌]\s*)[₀₁₂₃₄₅₆₇₈₉]/u, 'Coefficients must stay on the baseline: ' + model.id);
    assert.equal(section.practice!.answer, model.practice.answer);
    for (const limit of model.representationLimits) assert.ok(section.paragraphs.includes(limit));
    if (model.components.length === 1) assert.match(section.title, /Paper 2C/);
  }
  const shorthand = organicBank.models.find((m) => m.id === 'ethanol-dichromate-oxidation')!;
  assert.equal(shorthand.representation, 'oxidant-shorthand');
  assert.equal(shorthand.conditionalStateEquation, null);
  assert.ok(shorthand.reactants.every((p) => p.state === null));
  assert.match(shorthand.stateContext, /No complete reagent equation/);
  const addition = organicBank.models.find((m) => m.id === 'alkene-bromine-addition')!;
  assert.equal(addition.representation, 'structural-addition');
  assert.ok([...addition.reactants, ...addition.products].every((p) => p.state === null));
  assert.match(addition.conditionalStateEquation!, /explicitly stipulated nonaqueous/);
  assert.equal(parent.teachingCoverage, 'complete');
});

void test('Inorganic family models conserve every atom and preserve distinct equation/phase contexts', () => {
  assert.equal(inorganicBank.models.length, 32);
  assert.equal(inorganicBank.noteSectionIds.length, 12);
  const allIds = [...bank.models, ...organicBank.models, ...inorganicBank.models].map((m) => m.id);
  assert.equal(new Set(allIds).size, 59);
  const parent = inventory.points.find((p) => p.reference === '1.25')!;
  for (const model of inorganicBank.models) {
    assert.deepEqual(total(model.reactants), total(model.products), model.id);
    const section = note.sections.find((s) => s.id === model.sectionId)!;
    assert.ok(parent.noteSectionIds.includes(model.sectionId));
    assert.ok(section.paragraphs.includes(model.formulaEquation + '.'));
    assert.ok(section.paragraphs.includes(model.conditions));
    assert.ok(section.paragraphs.includes(model.limits));
    assert.ok(section.paragraphs.some((p) => p.includes(model.wordEquation)));
    if (model.components.length === 1) {
      assert.deepEqual(model.components, ['2C']);
      assert.ok(section.title.includes('Paper 2C') || section.paragraphs.some((p) => p.includes(model.id.replaceAll('-', ' ').replace(/^./, (c) => c.toUpperCase()) + ' — Paper 2C')));
    }
    for (const paragraph of section.paragraphs) assert.doesNotMatch(paragraph, /(?:^|[+→⇌]\s*)[₀₁₂₃₄₅₆₇₈₉]/u);
  }
  const aluminium = inorganicBank.models.find((m) => m.id === 'aluminium-carbon-anode')!;
  assert.match(aluminium.conditions, /dissolved/);
  assert.match(aluminium.limits, /inert-anode/);
  assert.equal(aluminium.products.find((s) => s.formula === 'CO2')!.coefficient, 3);
  assert.ok(!aluminium.products.some((s) => s.formula === 'O2'));
  const iron = inorganicBank.models.find((m) => m.id === 'iron-oxide-carbon-monoxide')!;
  assert.match(iron.conditions, /below iron melting point/);
  const barium = inorganicBank.models.find((m) => m.id === 'barium-sulfate-test')!;
  assert.match(barium.conditions, /HCl/);
  assert.match(barium.limits, /Not sulfuric acid/);
  assert.equal(inorganicBank.wholeCollectionComplete, false);
  assert.equal(parent.teachingCoverage, 'complete');
});

void test('reconciliation models distinguish molecular balance, ion charge and open repeats', () => {
  assert.equal(reconciliationBank.models.length, 10);
  assert.equal(reconciliationBank.representations.length, 7);
  const all = [...bank.models, ...organicBank.models, ...inorganicBank.models, ...reconciliationBank.models];
  assert.equal(new Set(all.map((m) => m.id)).size, 69);
  for (const model of reconciliationBank.models) {
    assert.deepEqual(total(model.reactants), total(model.products), model.id);
    const section = note.sections.find((s) => s.id === model.sectionId)!;
    assert.ok(section.paragraphs.includes(model.formulaEquation + '.'));
    assert.ok(section.paragraphs.includes(model.conditions));
    assert.ok(section.paragraphs.includes(model.limits));
    if (model.components.length === 1) assert.match(section.title, /Paper 2C/);
    for (const paragraph of section.paragraphs) assert.doesNotMatch(paragraph, /(?:^|[+→⇌]\s*)[₀₁₂₃₄₅₆₇₈₉]/u);
  }
  const full = reconciliationBank.models.find((m) => m.id === 'ethanol-full-dichromate-model')!;
  assert.deepEqual(total(full.reactants), { C: 6, Cr: 4, H: 34, K: 4, O: 49, S: 8 });
  assert.equal(full.products.find((p) => p.formula === 'H2O')!.coefficient, 11);
  assert.equal(full.reactants.find((p) => p.formula === 'CH3CH2OH')!.coefficient * 4, full.reactants.find((p) => p.formula === 'K2Cr2O7')!.coefficient * 6); // 3 organic oxidations and 2 dichromate reductions transfer12 electrons.
  const dissolution = reconciliationBank.representations.find((r) => r.kind === 'physical-dissociation')!;
  assert.deepEqual(total(dissolution.reactants!), total(dissolution.products!));
  const charge = (items: { coefficient: number; charge: number }[]) => items.reduce((sum, item) => sum + item.coefficient * item.charge, 0);
  assert.equal(charge(dissolution.reactants!), charge(dissolution.products!));
  assert.equal(dissolution.newCompoundSynthesis, false);
  const rust = reconciliationBank.representations.find((r) => r.kind === 'word-model-variable-composition')!;
  assert.equal(rust.fixedFormulaSpecified, false);
  for (const repeat of reconciliationBank.representations.filter((r) => r.kind === 'open-addition-repeat')) {
    assert.deepEqual(atoms(repeat.monomerFormula!), atoms(repeat.repeatUnitFormula!));
    assert.equal(repeat.finiteClosedMolecule, false);
    assert.equal(repeat.waterUnitsPerIdealRepeat, 0);
  }
  const polyester = reconciliationBank.representations.find((r) => r.kind === 'open-condensation-repeat')!;
  assert.deepEqual(total(polyester.monomerFormulae!.map((formula) => ({ formula, coefficient: 1 }))), total([{ formula: polyester.repeatUnitFormula!, coefficient: 1 }, { formula: 'H2O', coefficient: 2 }]));
  assert.equal(polyester.finiteOpenChainWaterCount, '2n-1');
  assert.equal(reconciliationBank.wholeCollectionComplete, false);
  assert.equal(inventory.points.find((p) => p.reference === '1.25')!.teachingCoverage, 'complete');
});

void test('authored collection completion pins all182 independent source decisions and actual teaching evidence', () => {
  const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)]));
    return value;
  };
  const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
  const review = read(inventory.completionReviewRef);
  const collection = read(review.collectionReviewRef);
  const matrix = read(collection.matrixRef);
  assert.equal(hash(matrix), collection.matrixSha256);
  assert.equal(collection.authoredCollectionCoverageComplete, true);
  assert.equal(collection.unresolvedMaterialGaps, 0);
  assert.equal(collection.examReadinessCertified, false);
  assert.equal(collection.activeExamTemplates, 0);
  assert.equal(matrix.wholeCollectionCertifiedByThisMatrix, false);
  const ids: string[] = [];
  for (const source of collection.independentReviews) {
    const checked = read(source.ref);
    assert.equal(hash(checked), source.sha256);
    const decisions = checked.rows ?? checked.decisions ?? checked.sourceVerdicts;
    assert.deepEqual(decisions.map((row: { sourceId: string }) => row.sourceId), source.sourceIds);
    for (const decision of decisions) {
      assert.ok(['adequate-with-scope', 'not-separate-reaction'].includes(decision.verdict));
      assert.ok(decision.reasoning.trim()); ids.push(decision.sourceId);
    }
  }
  assert.equal(ids.length, 182); assert.equal(new Set(ids).size, 182);
  assert.deepEqual([...ids].sort(), matrix.rows.map((row: { sourceId: string }) => row.sourceId).sort());
  for (const [path, expected] of Object.entries(collection.bankHashes)) assert.equal(hash(read(path)), expected, path);
  for (const row of matrix.rows) {
    for (const evidence of row.existingAuthoredEvidence) {
      const section = read(evidence.noteRef).sections.find((s: { id: string }) => s.id === evidence.sectionId);
      assert.equal(hash(section), evidence.sectionSha256, evidence.sectionId);
    }
  }
  const current = review.points.find((p: { pointId: string }) => p.pointId === '4CH1:issue3:1.25');
  assert.equal(current.requirements.length, 4);
  assert.ok(current.requirements.every((r: { verdict: string }) => r.verdict === 'approved'));
});
