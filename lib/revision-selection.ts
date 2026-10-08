import type { RevisionQuestion } from './revision-contract.ts';

export const MAX_PRACTICE_QUESTIONS = 30;
export type PracticeOptions = { chapters: string[]; count: number; order: 'mixed' | 'lesson' };
export function practiceChapters(questions: RevisionQuestion[]) {
  const chapters = new Map<string, { id: string; title: string; count: number }>();
  for (const question of questions) {
    const id = question.id.split('/')[0];
    const chapter = chapters.get(id) ?? { id, title: question.chapter, count: 0 };
    chapter.count++;
    chapters.set(id, chapter);
  }
  return [...chapters.values()];
}
// Work only on public lesson prompts; this selection never reads exam rubrics.
export function selectPractice(questions: RevisionQuestion[], options: PracticeOptions, random = Math.random): RevisionQuestion[] {
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > MAX_PRACTICE_QUESTIONS || !['mixed', 'lesson'].includes(options.order)) return [];
  const selected = new Set(options.chapters);
  const seen = new Set<string>();
  const items = questions.filter((question) => {
    if (!selected.has(question.id.split('/')[0]) || seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
  if (options.order === 'mixed') {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  }
  return items.slice(0, options.count);
}
