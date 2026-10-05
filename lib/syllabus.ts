import biologyBreeding from '../research/syllabus/4BI1-selective-breeding.json' with { type: 'json' };
import biologyFood from '../research/syllabus/4BI1-food-production.json' with { type: 'json' };
import biologyEcologyCycles from '../research/syllabus/4BI1-ecology-cycles-influences.json' with { type: 'json' };
import biologyEcologyFoundations from '../research/syllabus/4BI1-ecology-foundations.json' with { type: 'json' };
import biologyMutationSelection from '../research/syllabus/4BI1-mutation-selection.json' with { type: 'json' };
import biologyInheritance from '../research/syllabus/4BI1-inheritance.json' with { type: 'json' };
import biologyReproduction from '../research/syllabus/4BI1-reproduction.json' with { type: 'json' };
import biologyHormones from '../research/syllabus/4BI1-hormones.json' with { type: 'json' };
import biologySkinTemperature from '../research/syllabus/4BI1-skin-temperature.json' with { type: 'json' };
import biologyEye from '../research/syllabus/4BI1-eye.json' with { type: 'json' };
import biologyHumanNervous from '../research/syllabus/4BI1-human-nervous.json' with { type: 'json' };
import biologyPlantCoordination from '../research/syllabus/4BI1-plant-coordination.json' with { type: 'json' };
import biologyExcretion from '../research/syllabus/4BI1-excretion.json' with { type: 'json' };
import biologyHumanTransport from '../research/syllabus/4BI1-human-transport.json' with { type: 'json' };
import biologyPlantTransport from '../research/syllabus/4BI1-plant-transport.json' with { type: 'json' };
import humanInternalClinical from '../research/syllabus/4HB1-internal-transport-clinical.json' with { type: 'json' };
import humanInternal from '../research/syllabus/4HB1-internal-transport-foundations.json' with { type: 'json' };
import humanRespGas from '../research/syllabus/4HB1-respiration-gas-exchange.json' with { type: 'json' };
import humanQ79 from '../research/syllabus/4HB1-selected-q79-demands.json' with { type: 'json' };
import humanQ6 from '../research/syllabus/4HB1-selected-q6-demands.json' with { type: 'json' };
import humanQ4 from '../research/syllabus/4HB1-selected-q4-demands.json' with { type: 'json' };
import humanMonohybrid from '../research/syllabus/4HB1-monohybrid.json' with { type: 'json' };
import humanQ3 from '../research/syllabus/4HB1-selected-q3-demands.json' with { type: 'json' };
import humanQ1 from '../research/syllabus/4HB1-selected-q1-demands.json' with { type: 'json' };
import humanQ2 from '../research/syllabus/4HB1-selected-q2-demands.json' with { type: 'json' };
import humanMovement from '../research/syllabus/4HB1-movement.json' with { type: 'json' };
import humanTransport from '../research/syllabus/4HB1-cell-transport.json' with { type: 'json' };
import biologyHumanGas from '../research/syllabus/4BI1-human-gas.json' with { type: 'json' };
import biologyRespiration from '../research/syllabus/4BI1-respiration-plant-gas.json' with { type: 'json' };
import biologyNutrition from '../research/syllabus/4BI1-human-nutrition.json' with { type: 'json' };
import biologyPhotosynthesis from '../research/syllabus/4BI1-photosynthesis.json' with { type: 'json' };
import chemistryElectrolysis from '../research/syllabus/4CH1-electrolysis.json' with { type: 'json' };
import chemistryCalculations from '../research/syllabus/4CH1-formulae-and-calculations.json' with { type: 'json' };
import biologyTransport from '../research/syllabus/4BI1-cell-transport.json' with { type: 'json' };
import mathsPaperDemands from '../research/syllabus/4MB1-selected-paper-demands.json' with { type: 'json' };
import mathsAlgebraRest from '../research/syllabus/4MB1-systems-inequalities-sequences.json' with { type: 'json' };
import mathsEquations from '../research/syllabus/4MB1-equations.json' with { type: 'json' };
import forces from '../research/syllabus/4PH1-forces-and-motion.json' with { type: 'json' };
import waves from '../research/syllabus/4PH1-waves.json' with { type: 'json' };
import energy from '../research/syllabus/4PH1-energy-transfers.json' with { type: 'json' };
import electricity from '../research/syllabus/4PH1-electricity-selected.json' with { type: 'json' };
import magnetism from '../research/syllabus/4PH1-magnetism-selected.json' with { type: 'json' };
import matter from '../research/syllabus/4PH1-matter.json' with { type: 'json' };
import radioactivity from '../research/syllabus/4PH1-radioactivity.json' with { type: 'json' };
import astrophysics from '../research/syllabus/4PH1-astrophysics.json' with { type: 'json' };
import biologyLiving from '../research/syllabus/4BI1-living-organisms.json' with { type: 'json' };
import biologyCells from '../research/syllabus/4BI1-cell-organisation.json' with { type: 'json' };
import biologyMolecules from '../research/syllabus/4BI1-molecules-and-enzymes.json' with { type: 'json' };

import humanCells from '../research/syllabus/4HB1-cells-foundations.json' with { type: 'json' };

import chemistryStates from '../research/syllabus/4CH1-states-and-mixtures.json' with { type: 'json' };
import chemistryBonding from '../research/syllabus/4CH1-bonding.json' with { type: 'json' };
import humanMolecules from '../research/syllabus/4HB1-biological-molecules.json' with { type: 'json' };

import mathsNumber from '../research/syllabus/4MB1-number.json' with { type: 'json' };
import mathsSets from '../research/syllabus/4MB1-sets.json' with { type: 'json' };
import mathsAlgebra from '../research/syllabus/4MB1-algebra-foundations.json' with { type: 'json' };
import mathsPolynomials from '../research/syllabus/4MB1-polynomials-and-fractions.json' with { type: 'json' };

// Reviewed overlays are kept separate from the immutable raw candidates.
export const reviewedInventories = [
  { title: 'Selective breeding (5.10–5.11; partial teaching)', ...biologyBreeding },
  { title: 'Food production (5.1–5.9B; partial teaching)', ...biologyFood },
  { title: 'Internal transport: disease, treatments and antibodies (partial teaching)', ...humanInternalClinical },
  { title: 'Internal transport foundations: additional identities with partial teaching', ...humanInternal },
  { title: 'Respiration and gas exchange: additional identities with partial teaching', ...humanRespGas },
  { title: 'Selected Q7–Q9 demands: gas exchange and blood groups (partial teaching), sewage (identity only)', ...humanQ79 },
  { title: 'Selected Q6 demands: blood transport (partial teaching)', ...humanQ6 },
  { title: 'Forces and motion', ...forces },
  { title: 'Waves', ...waves },
  { title: 'Energy resources and transfers (4.1–4.19P)', ...energy },
  { title: 'Electricity (2.1–2.28P)', ...electricity },
  { title: 'Solids, liquids and gases (5.1–5.22)', ...matter },
  { title: 'Magnetism and electromagnetism (6.1–6.20P)', ...magnetism },
  { title: 'Radioactivity and particles (7.1–7.26)', ...radioactivity },
  { title: 'Astrophysics (8.1–8.18P)', ...astrophysics },
  { title: 'The nature and variety of living organisms (1.1–1.4)', ...biologyLiving },
  { title: 'Cell organisation and structures (2.1–2.6B)', ...biologyCells },
  { title: 'Biological molecules and enzymes (2.7–2.14B)', ...biologyMolecules },
  { title: 'Cell transport (2.15–2.17)', ...biologyTransport },
  { title: 'Plant nutrition and photosynthesis (2.18–2.23)', ...biologyPhotosynthesis },
  { title: 'Human nutrition (2.24–2.33B)', ...biologyNutrition },
  { title: 'Respiration and plant gas exchange (2.34–2.45B)', ...biologyRespiration },
  { title: 'Human gas exchange (2.46–2.50)', ...biologyHumanGas },
  { title: 'General and plant transport (2.51–2.58B; partial teaching)', ...biologyPlantTransport },
  { title: 'Human transport (2.59–2.69; partial teaching)', ...biologyHumanTransport },
  { title: 'Excretion (2.70–2.79B; partial teaching)', ...biologyExcretion },
  { title: 'General and plant coordination (2.80–2.85; partial teaching)', ...biologyPlantCoordination },
  { title: 'Human nervous coordination (2.86–2.90; partial teaching)', ...biologyHumanNervous },
  { title: 'Eye structure and responses (2.91–2.92; partial teaching)', ...biologyEye },
  { title: 'Skin temperature regulation (2.93; partial teaching)', ...biologySkinTemperature },
  { title: 'Named hormones (2.94–2.95B; partial teaching)', ...biologyHormones },
  { title: 'Reproduction (3.1–3.13; partial teaching)', ...biologyReproduction },
  { title: 'Inheritance (3.14–3.34; partial teaching)', ...biologyInheritance },
  { title: 'Mutation and selection (3.35B–3.39; partial teaching)', ...biologyMutationSelection },
  { title: 'Ecology sampling and feeding (4.1–4.9; partial teaching)', ...biologyEcologyFoundations },
  { title: 'Ecology cycles and human influences (4.10–4.18B; partial teaching)', ...biologyEcologyCycles },
  { title: 'Cells and tissues (1.1–1.16)', ...humanCells },
  { title: 'Bones, muscles and joints (4.1–4.6)', ...humanMovement },
  { title: 'Selected Q1 demands: coordination and skin (identities only; no teaching)', ...humanQ1 },
  { title: 'Selected heredity foundations (11.13/11.14/11.20/11.21; partial teaching)', ...humanQ3 },
  { title: 'Monohybrid inheritance (11.19; partial teaching)', ...humanMonohybrid },
  { title: 'Selected Q4 demands: respiration and exercise (partial teaching)', ...humanQ4 },
  { title: 'Selected Q2 demands: food hygiene and bacteria (identities only; no teaching)', ...humanQ2 },
  { title: 'Principles foundations (1.1–1.22)', ...chemistryStates },
  { title: 'Group behaviour, formulae and calculations (1.23–1.36)', ...chemistryCalculations },
  { title: 'Ionic, covalent and metallic bonding (1.37–1.54C)', ...chemistryBonding },
  { title: 'Electrolysis (1.55C–1.60C; Paper 2C)', ...chemistryElectrolysis },
  { title: 'Biological molecules (2.1–2.10)', ...humanMolecules },
  { title: 'Movement of substances (3.1–3.3)', ...humanTransport },
  { title: 'Number: section 1, rows A–K', ...mathsNumber },
  { title: 'Sets: section 2, rows A–I', ...mathsSets },
  { title: 'Algebra foundations: section 3, rows A–C', ...mathsAlgebra },
  { title: 'Polynomials and algebraic fractions: section 3, rows D–F', ...mathsPolynomials },
  { title: 'Equations: section 3, row G', ...mathsEquations },
  { title: 'Simultaneous equations, inequalities and sequences: section 3, rows H–L', ...mathsAlgebraRest },
  { title: 'Selected paper demands: functions, matrices, geometry, vectors and statistics (partial teaching)', ...mathsPaperDemands },
];
