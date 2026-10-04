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

import humanCells from '../research/syllabus/4HB1-cells-foundations.json' with { type: 'json' };

import chemistryStates from '../research/syllabus/4CH1-states-and-mixtures.json' with { type: 'json' };

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
  { title: 'Cells and tissues (1.1–1.16)', ...humanCells },
  { title: 'Principles foundations (1.1–1.22)', ...chemistryStates },
  { title: 'Number: section 1, rows A–K', ...mathsNumber },
  { title: 'Sets: section 2, rows A–I', ...mathsSets },
  { title: 'Algebra foundations: section 3, rows A–C', ...mathsAlgebra },
  { title: 'Polynomials and algebraic fractions: section 3, rows D–F', ...mathsPolynomials },
  { title: 'Equations: section 3, row G', ...mathsEquations },
  { title: 'Simultaneous equations, inequalities and sequences: section 3, rows H–L', ...mathsAlgebraRest },
  { title: 'Selected paper demands: functions, matrices, geometry, vectors and statistics (partial teaching)', ...mathsPaperDemands },
];
