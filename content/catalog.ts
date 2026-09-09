export type Qualification = '4HB1' | '4BI1' | '4CH1' | '4PH1' | '4EB1' | '4MB1';
export type Chapter = {
  id: string;
  title: string;
  terms: string[];
  sourcePage: number;
  section: string;
  complete: boolean;
};
export type Subject = {
  id: string;
  code: Qualification;
  title: string;
  issue: string;
  overview: string;
  papers: string;
  chapters: Chapter[];
};
const chapters = (
  items: [string, string, string, number, string][],
): Chapter[] =>
  items.map(([id, title, terms, sourcePage, section]) => ({
    id,
    title,
    terms: terms.split('|'),
    sourcePage,
    section,
    complete: false,
  }));
export const subjects: Subject[] = [
  {
    id: 'human-biology',
    code: '4HB1',
    title: 'Human Biology',
    issue: '2 · September 2024',
    overview:
      'The human body, from cells to coordinated systems, inheritance and disease.',
    papers: '01 and 02',
    chapters: chapters([
      [
        'cells-and-tissues',
        'Cells and tissues',
        'mitochondria|nucleus|specialised cells|tissues',
        12,
        '1',
      ],
      [
        'biological-molecules',
        'Biological molecules',
        'enzymes|proteins|carbohydrates|lipids',
        12,
        '2',
      ],
      [
        'cell-transport',
        'Movement of substances',
        'diffusion|osmosis|active transport',
        12,
        '3',
      ],
      [
        'movement',
        'Bones, muscles and joints',
        'skeleton|antagonistic muscles|joints',
        12,
        '4',
      ],
      ['coordination', 'Coordination', 'nerves|hormones|reflexes|eye', 12, '5'],
      [
        'nutrition',
        'Nutrition and energy',
        'diet|digestion|absorption',
        12,
        '6',
      ],
      ['respiration', 'Respiration', 'aerobic|anaerobic|ATP', 12, '7'],
      ['gas-exchange', 'Gas exchange', 'alveoli|ventilation|lungs', 12, '8'],
      [
        'internal-transport',
        'Internal transport',
        'heart|blood|circulation',
        12,
        '9',
      ],
      [
        'homeostasis',
        'Homeostatic mechanisms',
        'kidneys|temperature|glucose|excretion',
        12,
        '10',
      ],
      [
        'reproduction',
        'Reproduction and heredity',
        'meiosis|inheritance|pregnancy',
        12,
        '11',
      ],
      ['disease', 'Disease', 'pathogens|immunity|vaccination', 12, '12'],
    ]),
  },
  {
    id: 'biology',
    code: '4BI1',
    title: 'Biology',
    issue: '3 · September 2024',
    overview:
      'Living organisms, their cells and systems, reproduction, ecosystems and biological resources.',
    papers: '1B and 2B',
    chapters: chapters([
      [
        'living-organisms',
        'The nature and variety of living organisms',
        'characteristics of life|classification|pathogens',
        13,
        '1',
      ],
      [
        'structures-and-functions',
        'Structures and functions in living organisms',
        'mitochondria|photosynthesis|enzymes|transport|respiration|homeostasis',
        13,
        '2',
      ],
      [
        'reproduction-and-inheritance',
        'Reproduction and inheritance',
        'genetics|DNA|meiosis|natural selection',
        13,
        '3',
      ],
      [
        'ecology',
        'Ecology and the environment',
        'food webs|sampling|carbon cycle|biodiversity',
        13,
        '4',
      ],
      [
        'biological-resources',
        'Use of biological resources',
        'crop production|genetic modification|cloning',
        13,
        '5',
      ],
    ]),
  },
  {
    id: 'chemistry',
    code: '4CH1',
    title: 'Chemistry',
    issue: '3 · September 2024',
    overview:
      'Particles and bonding, chemical reactions, quantitative chemistry and organic compounds.',
    papers: '1C and 2C',
    chapters: chapters([
      [
        'principles',
        'Principles of chemistry',
        'states of matter|atomic structure|bonding|moles|electrolysis',
        13,
        '1',
      ],
      [
        'inorganic',
        'Inorganic chemistry',
        'periodic table|metals|acids|salts|tests for ions',
        13,
        '2',
      ],
      [
        'physical',
        'Physical chemistry',
        'energetics|rates|equilibrium',
        13,
        '3',
      ],
      [
        'organic',
        'Organic chemistry',
        'alkanes|alkenes|alcohols|polymers',
        13,
        '4',
      ],
    ]),
  },
  {
    id: 'physics',
    code: '4PH1',
    title: 'Physics',
    issue: '4 · September 2024',
    overview:
      'Models, measurements and mathematical relationships that explain the physical world.',
    papers: '1P and 2P',
    chapters: chapters([
      [
        'forces-and-motion',
        'Forces and motion',
        'speed|velocity|acceleration|momentum|distance time graphs',
        14,
        '1',
      ],
      [
        'electricity',
        'Electricity',
        'current|voltage|resistance|circuits|charge',
        14,
        '2',
      ],
      [
        'waves',
        'Waves',
        'refraction|reflection|light|sound|electromagnetic spectrum',
        14,
        '3',
      ],
      [
        'energy',
        'Energy resources and energy transfers',
        'work|power|efficiency|thermal energy',
        14,
        '4',
      ],
      [
        'matter',
        'Solids, liquids and gases',
        'density|pressure|gas laws',
        14,
        '5',
      ],
      [
        'magnetism',
        'Magnetism and electromagnetism',
        'motors|induction|transformers',
        14,
        '6',
      ],
      [
        'radioactivity',
        'Radioactivity and particles',
        'half life|decay|fission|fusion',
        14,
        '7',
      ],
      [
        'astrophysics',
        'Astrophysics',
        'stars|orbits|red shift|universe',
        14,
        '8',
      ],
    ]),
  },
  {
    id: 'english',
    code: '4EB1',
    title: 'English Language B',
    issue: '4 · August 2025',
    overview:
      'Read unfamiliar texts closely, compare perspectives and write for a clear purpose and audience.',
    papers: '01; optional spoken endorsement E',
    chapters: chapters([
      [
        'reading',
        'Reading unseen texts',
        'retrieval|inference|language|structure|comparison|PEE',
        9,
        'Section A',
      ],
      [
        'directed-writing',
        'Directed writing',
        'audience|purpose|register|transactional writing|source synthesis',
        9,
        'Section B',
      ],
      [
        'writing',
        'Discursive, narrative and descriptive writing',
        'discursive writing|argument|description|narrative|punctuation',
        9,
        'Section C',
      ],
      [
        'spoken-language',
        'Spoken language endorsement',
        'presentation|questions|spoken language|optional',
        9,
        'Optional endorsement',
      ],
    ]),
  },
  {
    id: 'mathematics',
    code: '4MB1',
    title: 'Mathematics B',
    issue: '1 · January 2016; series update under review',
    overview:
      'Number and algebra, geometry and trigonometry, statistics and probability.',
    papers: '01 and 02',
    chapters: chapters([
      [
        'number-and-algebra',
        'Number and algebra',
        'fractions|indices|equations|functions|differentiation|matrices',
        11,
        'Number and algebra',
      ],
      [
        'geometry',
        'Geometry and trigonometry',
        'sectors|coordinate geometry|straight-line equations|vectors|trigonometry',
        11,
        'Geometry and trigonometry',
      ],
      [
        'statistics',
        'Statistics and probability',
        'averages|histograms|probability|tree diagrams',
        11,
        'Statistics and probability',
      ],
    ]),
  },
];
export const getSubject = (id: string) => subjects.find((s) => s.id === id);
export const getChapter = (subject: Subject, id: string) =>
  subject.chapters.find((c) => c.id === id);
