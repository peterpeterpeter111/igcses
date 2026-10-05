/**
 * Assemble explicitly ordered source parts without changing the reader contract.
 * Filesystem access belongs to offline readers; browser bundles pass static imports.
 * @param {import('./notes.ts').ChapterNotes & {sectionFiles?: string[]}} metadata
 * @param {Record<string, {subjectId: string, chapterId: string, sections: import('./notes.ts').NoteSection[]}>} parts
 * @returns {import('./notes.ts').ChapterNotes}
 */
export function composeNote(metadata, parts = {}) {
  if (!Array.isArray(metadata.sections)) throw new Error('Missing inline section array');
  const declared = Object.hasOwn(metadata, 'sectionFiles');
  const files = declared ? metadata.sectionFiles : [];
  if (!Array.isArray(files) || (declared && (!files.length || metadata.sections.length)))
    throw new Error('Ambiguous note parts and inline sections');
  if (new Set(files).size !== files.length || files.some((p) => !validPartPath(p)))
    throw new Error('Invalid or repeated note part path');
  if (Object.keys(parts).length !== files.length || Object.keys(parts).some((p) => !files.includes(p)))
    throw new Error('Note part registry differs from its manifest');
  const sections = files.length ? files.flatMap((file) => {
    const part = parts[file];
    if (!part || part.subjectId !== metadata.subjectId || part.chapterId !== metadata.chapterId ||
        !Array.isArray(part.sections) || !part.sections.length)
      throw new Error('Missing, empty or wrong-chapter note part: ' + file);
    return part.sections;
  }) : metadata.sections;
  if (sections.some((s) => !s || typeof s.id !== 'string' || !s.id) ||
      new Set(sections.map((s) => s.id)).size !== sections.length)
    throw new Error('Invalid or duplicate teaching section');
  const { sectionFiles: _files, ...note } = metadata;
  return { ...note, sections };
}

/** @param {unknown} path */
export function validPartPath(path) {
  return typeof path === 'string' && /^\.\.\/note-sections\/[a-z0-9-]+\/[a-z0-9-]+\.json$/.test(path);
}
