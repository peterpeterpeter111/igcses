import forces from '../research/syllabus/4PH1-forces-and-motion.json' with { type: 'json' };
import waves from '../research/syllabus/4PH1-waves.json' with { type: 'json' };
import energy from '../research/syllabus/4PH1-energy-transfers.json' with { type: 'json' };
import electricity from '../research/syllabus/4PH1-electricity-selected.json' with { type: 'json' };
import magnetism from '../research/syllabus/4PH1-magnetism-selected.json' with { type: 'json' };
import matter from '../research/syllabus/4PH1-matter.json' with { type: 'json' };
import radioactivity from '../research/syllabus/4PH1-radioactivity.json' with { type: 'json' };
import astrophysics from '../research/syllabus/4PH1-astrophysics.json' with { type: 'json' };

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
];
