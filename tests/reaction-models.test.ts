import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import bank from '../research/reaction-models/4CH1-named-core-2026-10-17.json' with { type: 'json' };
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
void test('complete source classification does not promote the partial reaction collection or exam bank', () => {
  assert.equal(scope.decisions.length, 182);
  assert.equal(new Set(scope.decisions.map((d) => d.id)).size, 182);
  for (const decision of scope.decisions) assert.ok(readFileSync(decision.reviewRef, 'utf8').includes(decision.id.split(':').at(-1)!));
  assert.equal(scope.wholeReactionCollectionComplete, false);
  assert.equal(bank.wholeCollectionComplete, false);
  const parent = inventory.points.find((p) => p.reference === '1.25')!;
  assert.equal(parent.teachingCoverage, 'partial');
  assert.equal(parent.substatementAuditComplete, false);
});
