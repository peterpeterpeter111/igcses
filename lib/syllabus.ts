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
  { title: 'Cells and tissues (1.1–1.16)', ...humanCells },
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
