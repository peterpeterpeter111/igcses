import metadata from './notes/biology-resources.json' with { type: 'json' };
import food from './note-sections/biology-resources/01-food-production.json' with { type: 'json' };
import breeding from './note-sections/biology-resources/02-selective-breeding.json' with { type: 'json' };
import geneticModification from './note-sections/biology-resources/03-genetic-modification.json' with { type: 'json' };
import cloning from './note-sections/biology-resources/04-cloning.json' with { type: 'json' };
import { composeNote } from './compose-note.mjs';
import type { ChapterNotes } from './notes.ts';
export default composeNote(metadata as ChapterNotes & { sectionFiles: string[] }, {
  '../note-sections/biology-resources/01-food-production.json': food,
  '../note-sections/biology-resources/02-selective-breeding.json': breeding,
  '../note-sections/biology-resources/03-genetic-modification.json': geneticModification,
  '../note-sections/biology-resources/04-cloning.json': cloning,
});
