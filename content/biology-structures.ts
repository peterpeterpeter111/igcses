import metadata from './notes/biology-structures.json' with { type: 'json' };
import { composeNote } from './compose-note.mjs';
import type { ChapterNotes } from './notes.ts';
import part0 from './note-sections/biology-structures/01-cells.json' with { type: 'json' };
import part1 from './note-sections/biology-structures/02-molecules.json' with { type: 'json' };
import part2 from './note-sections/biology-structures/03-transport.json' with { type: 'json' };
import part3 from './note-sections/biology-structures/04-photosynthesis.json' with { type: 'json' };
import part4 from './note-sections/biology-structures/05-nutrition.json' with { type: 'json' };
import part5 from './note-sections/biology-structures/06-respiration.json' with { type: 'json' };
import part6 from './note-sections/biology-structures/07-plant-gas.json' with { type: 'json' };
import part7 from './note-sections/biology-structures/08-human-gas.json' with { type: 'json' };
import part8 from './note-sections/biology-structures/09-plant-transport.json' with { type: 'json' };
import part9 from './note-sections/biology-structures/10-human-transport.json' with { type: 'json' };
import part10 from './note-sections/biology-structures/11-excretion.json' with { type: 'json' };
export default composeNote(metadata as ChapterNotes, {
  '../note-sections/biology-structures/01-cells.json': part0,
  '../note-sections/biology-structures/02-molecules.json': part1,
  '../note-sections/biology-structures/03-transport.json': part2,
  '../note-sections/biology-structures/04-photosynthesis.json': part3,
  '../note-sections/biology-structures/05-nutrition.json': part4,
  '../note-sections/biology-structures/06-respiration.json': part5,
  '../note-sections/biology-structures/07-plant-gas.json': part6,
  '../note-sections/biology-structures/08-human-gas.json': part7,
  '../note-sections/biology-structures/09-plant-transport.json': part8,
  '../note-sections/biology-structures/10-human-transport.json': part9,
  '../note-sections/biology-structures/11-excretion.json': part10,
});
