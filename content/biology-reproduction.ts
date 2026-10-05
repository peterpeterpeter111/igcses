import metadata from './notes/biology-reproduction.json' with { type: 'json' };
import reproduction from './note-sections/biology-reproduction/01-reproduction.json' with { type: 'json' };
import { composeNote } from './compose-note.mjs';
import type { ChapterNotes } from './notes.ts';
export default composeNote(metadata as ChapterNotes & { sectionFiles: string[] }, { '../note-sections/biology-reproduction/01-reproduction.json': reproduction });
