import humanBiology from './notes/human-biology.json' with { type: 'json' };
import biology from './notes/biology.json' with { type: 'json' };
import chemistry from './notes/chemistry.json' with { type: 'json' };
import physics from './notes/physics.json' with { type: 'json' };
import physicsWaves from './notes/physics-waves.json' with { type: 'json' };
import physicsEnergy from './notes/physics-energy.json' with { type: 'json' };
import english from './notes/english.json' with { type: 'json' };
import mathematics from './notes/mathematics.json' with { type: 'json' };
export type NoteSection = {
  id: string;
  title: string;
  paragraphs: string[];
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
  prerequisites: string[];
  goals: string[];
  sections: NoteSection[];
};
// Teaching content is added only after its relevant specification pages are reviewed.
export const notes: ChapterNotes[] = [
  humanBiology,
  biology,
  chemistry,
  physics,
  physicsWaves,
  physicsEnergy,
  english,
  mathematics,
] as ChapterNotes[];
export const getNotes = (subjectId: string, chapterId: string) =>
  notes.find((n) => n.subjectId === subjectId && n.chapterId === chapterId);
