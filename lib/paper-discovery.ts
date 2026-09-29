import mathematicsDiscovery from '../research/discovery/2026-09-28-mathematics-b.json' with { type: 'json' };
import mathematicsCoverReview from '../research/paper-reviews/4MB1-2024-summer-01.json' with { type: 'json' };

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

export function obtainedPaperCandidates(qualification: string) {
  return additionalPaperCandidates.filter(
    (record) =>
      record.qualification === qualification &&
      record.questionPaper.accessStatus === 'obtained' &&
      record.markScheme.accessStatus === 'obtained',
  );
}
