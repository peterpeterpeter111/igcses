import reviews from '../content/chapter-teaching-reviews.json' with { type: 'json' };

// This safe projection is checked against pinned source/lesson decisions by
// chapter_teaching_review.py. It contains no source text or marking criteria.
export const authoredChapterReviews = reviews;
export const getChapterTeachingReview = (subjectId: string, chapterId: string) =>
  authoredChapterReviews.find((review) => review.subjectId === subjectId && review.chapterId === chapterId);
