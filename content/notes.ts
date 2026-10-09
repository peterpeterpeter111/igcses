import englishSpoken from './notes/english-spoken-language.json' with { type: 'json' };
import englishDirected from './notes/english-directed-writing.json' with { type: 'json' };
import englishWriting from './notes/english-writing.json' with { type: 'json' };
import humanDisease from './notes/human-biology-disease.json' with { type: 'json' };
import humanCoordination from './notes/human-biology-coordination.json' with { type: 'json' };
import humanHomeostasis from './notes/human-biology-homeostasis.json' with { type: 'json' };
import humanNutrition from './notes/human-biology-nutrition.json' with { type: 'json' };
import chemistryOrganic from './notes/chemistry-organic.json' with { type: 'json' };
import chemistryPhysical from './notes/chemistry-physical.json' with { type: 'json' };
import chemistryInorganic from './notes/chemistry-inorganic.json' with { type: 'json' };
import biologyResources from './biology-resources.ts';
import biologyEcology from './biology-ecology.ts';
import biologyReproduction from './biology-reproduction.ts';
import humanInternal from './notes/human-biology-internal-transport.json' with { type: 'json' };
import humanRespiration from './notes/human-biology-respiration.json' with { type: 'json' };
import humanGasExchange from './notes/human-biology-gas-exchange.json' with { type: 'json' };
import humanHeredity from './notes/human-biology-heredity.json' with { type: 'json' };
import humanMovement from './notes/human-biology-movement.json' with { type: 'json' };
import humanTransport from './notes/human-biology-transport.json' with { type: 'json' };
import mathematicsStatistics from './notes/mathematics-statistics.json' with { type: 'json' };
import mathematicsGeometry from './notes/mathematics-geometry.json' with { type: 'json' };
import humanBiology from './notes/human-biology.json' with { type: 'json' };
import humanMolecules from './notes/human-biology-molecules.json' with { type: 'json' };
import biology from './notes/biology.json' with { type: 'json' };
import biologyStructures from './biology-structures.ts';
import chemistry from './notes/chemistry.json' with { type: 'json' };
import physics from './notes/physics.json' with { type: 'json' };
import physicsWaves from './notes/physics-waves.json' with { type: 'json' };
import physicsEnergy from './notes/physics-energy.json' with { type: 'json' };
import physicsElectricity from './notes/physics-electricity.json' with { type: 'json' };
import physicsMatter from './notes/physics-matter.json' with { type: 'json' };
import physicsMagnetism from './notes/physics-magnetism.json' with { type: 'json' };
import physicsRadioactivity from './notes/physics-radioactivity.json' with { type: 'json' };
import physicsAstrophysics from './notes/physics-astrophysics.json' with { type: 'json' };
import english from './notes/english.json' with { type: 'json' };
import mathematics from './notes/mathematics.json' with { type: 'json' };
export type NoteSection = {
  id: string;
  title: string;
  paragraphs: string[];
  table?: { caption?: string; headers: string[]; rows: string[][] };
  terms?: string[];
  points?: string[];
  example?: { question: string; steps: string[]; explanation: string };
  practice?: { question: string; answer: string; explanation: string };
  diagram?: { src: string; alt: string; caption: string };
  commonMistakes?: string[];
  practical?: {
    apparatus: string[];
    method: string[];
    variables: string[];
    safety: string[];
    quality: string[];
  };
  answerGuide?: {
    id?: string;
    sourceTaskId?: string;
    command: string;
    steps: string[];
    caution: string;
  };
};
export type ChapterNotes = {
  subjectId: string;
  chapterId: string;
  status: 'draft' | 'source-checked';
  complete: boolean;
  humanReviewed: false;
  sourceId: string;
  sourcePages: number[];
  supportingSources?: { title: string; url: string; sectionIds: string[] }[];
  prerequisites: string[];
  goals: string[];
  sections: NoteSection[];
};
// Teaching content is added only after its relevant specification pages are reviewed.
export const notes: ChapterNotes[] = [
  humanDisease,
  mathematicsStatistics,
  humanBiology,
  humanMolecules,
  humanTransport,
  humanMovement,
  humanHeredity,
  humanRespiration,
  humanGasExchange,
  humanInternal,
  humanNutrition,
  humanHomeostasis,
  humanCoordination,
  biology,
  biologyStructures,
  biologyReproduction,
  biologyEcology,
  biologyResources,
  chemistry,
  chemistryInorganic,
  chemistryPhysical,
  chemistryOrganic,
  physics,
  physicsWaves,
  physicsEnergy,
  physicsElectricity,
  physicsMatter,
  physicsMagnetism,
  physicsRadioactivity,
  physicsAstrophysics,
  english,
  englishDirected,
  englishWriting,
  englishSpoken,
  mathematics,
  mathematicsGeometry,
] as ChapterNotes[];
export const getNotes = (subjectId: string, chapterId: string) =>
  notes.find((n) => n.subjectId === subjectId && n.chapterId === chapterId);
