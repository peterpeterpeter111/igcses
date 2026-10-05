import metadata from './notes/biology-resources.json' with { type: 'json' };
import food from './note-sections/biology-resources/01-food-production.json' with { type: 'json' };
import { composeNote } from './compose-note.mjs';
import type { ChapterNotes } from './notes.ts';
export default composeNote(metadata as ChapterNotes & { sectionFiles: string[] }, { '../note-sections/biology-resources/01-food-production.json': food });
