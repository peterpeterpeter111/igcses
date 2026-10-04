import mathematicsDiscovery from '../research/discovery/2026-09-28-mathematics-b.json' with { type: 'json' };
import mathematicsCoverReview from '../research/paper-reviews/4MB1-2024-summer-01.json' with { type: 'json' };
import mathematicsIndex from '../research/paper-indexes/4MB1-2024-summer-01.json' with { type: 'json' };
import mathematicsDetail from '../research/extractions/4MB1-2024-summer-01.json' with { type: 'json' };

// New downloads remain separate from the preserved indexed batch and reviews.
export const additionalPaperCandidates = mathematicsDiscovery.records;
export const latestDiscoveryDate = mathematicsCoverReview.reviewedAt;

export function paperCoverReview(record: (typeof additionalPaperCandidates)[number]) {
  return mathematicsCoverReview.candidateId === record.id &&
    mathematicsCoverReview.qualification === record.qualification &&
    mathematicsCoverReview.questionPaperSha256 === record.questionPaper.sha256 &&
    mathematicsCoverReview.markSchemeSha256 === record.markScheme.sha256
    ? mathematicsCoverReview
    : null;
}

export function paperTaskIndex(record: (typeof additionalPaperCandidates)[number]) {
  return paperCoverReview(record) &&
    mathematicsIndex.paperId === record.id &&
    mathematicsIndex.qualification === record.qualification &&
    mathematicsIndex.questionPaperSha256 === record.questionPaper.sha256 &&
    mathematicsIndex.markSchemeSha256 === record.markScheme.sha256
    ? mathematicsIndex
    : null;
}

export function obtainedPaperCandidates(qualification: string) {
  return additionalPaperCandidates.filter(
    (record) =>
      record.qualification === qualification &&
      record.questionPaper.accessStatus === 'obtained' &&
      record.markScheme.accessStatus === 'obtained',
  );
}

// Return coverage metadata only; detailed answer criteria stay out of this view.
export function paperDetailedSummary(record: (typeof additionalPaperCandidates)[number]) {
  const index = paperTaskIndex(record);
  const detail = mathematicsDetail;
  if (!index || detail.paperId !== record.id || detail.qualification !== record.qualification ||
      detail.documents.find((d) => d.type === 'question-paper')?.sha256 !== record.questionPaper.sha256 ||
      detail.documents.find((d) => d.type === 'mark-scheme')?.sha256 !== record.markScheme.sha256 ||
      detail.tasks.length !== detail.detailedLeafTasks ||
      new Set(detail.tasks.map((t) => t.taskId)).size !== detail.tasks.length ||
      detail.tasks.reduce((sum, t) => sum + t.originalMarks, 0) !== detail.detailedOriginalMarks ||
      detail.tasks.some((t) => !index.tasks.some((i) => i.taskId === t.taskId && i.originalMarks === t.originalMarks))) {
    return null;
  }
  return {
    detailedTasks: detail.tasks.length,
    originalMarks: detail.detailedOriginalMarks,
    indexedTasks: index.indexedLeafCount,
    remainingTasks: index.indexedLeafCount - detail.tasks.length,
    reviewedAt: detail.reviewDate,
    humanReviewed: detail.humanReviewed,
    fullyProcessed: detail.fullyProcessed,
    pageAuditComplete: detail.pageAudit.questionPaper.wholeDocumentReviewed && detail.pageAudit.markScheme.wholeDocumentReviewed,
    questionPaperPagesReviewed: detail.pageAudit.questionPaper.visuallyReviewedPages.length,
    schemePagesReviewed: detail.pageAudit.markScheme.visuallyReviewedPages.length,
    blockers: detail.blockers,
  };
}
