import mutationSelection from './note-sections/biology-reproduction/03-mutation-selection.json' with { type: 'json' };
import inheritance from './note-sections/biology-reproduction/02-inheritance.json' with { type: 'json' };
import metadata from './notes/biology-reproduction.json' with { type: 'json' };
import reproduction from './note-sections/biology-reproduction/01-reproduction.json' with { type: 'json' };
import { composeNote } from './compose-note.mjs';
import type { ChapterNotes } from './notes.ts';
export default composeNote(metadata as ChapterNotes & { sectionFiles: string[] }, { '../note-sections/biology-reproduction/01-reproduction.json': reproduction, '../note-sections/biology-reproduction/02-inheritance.json': inheritance, '../note-sections/biology-reproduction/03-mutation-selection.json': mutationSelection });
