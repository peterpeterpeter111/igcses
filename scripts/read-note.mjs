import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { composeNote, validPartPath } from '../content/compose-note.mjs';

export function readNote(path) {
  const metadata = JSON.parse(readFileSync(path, 'utf8'));
  const files = metadata.sectionFiles ?? [];
  if (!Array.isArray(files)) throw new Error('Invalid note part manifest');
  const parts = {};
  const base = resolve(dirname(path), '../note-sections');
  for (const file of files) {
    if (!validPartPath(file)) throw new Error('Invalid note part path');
    const target = resolve(dirname(path), file);
    if (lstatSync(target).isSymbolicLink() || !realpathSync(target).startsWith(base + sep))
      throw new Error('Linked or escaped note part');
    parts[file] = JSON.parse(readFileSync(target, 'utf8'));
  }
  return composeNote(metadata, parts);
}
