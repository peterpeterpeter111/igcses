import metadata from './notes/biology-ecology.json' with { type: 'json' };
import samplingFeeding from './note-sections/biology-ecology/01-sampling-feeding.json' with { type: 'json' };
import cyclesHuman from './note-sections/biology-ecology/02-cycles-human-influences.json' with { type: 'json' };
import { composeNote } from './compose-note.mjs';
import type { ChapterNotes } from './notes.ts';
export default composeNote(metadata as ChapterNotes & { sectionFiles: string[] }, { '../note-sections/biology-ecology/01-sampling-feeding.json': samplingFeeding, '../note-sections/biology-ecology/02-cycles-human-influences.json': cyclesHuman });
