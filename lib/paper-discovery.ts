import mathematicsDiscovery from '../research/discovery/2026-09-28-mathematics-b.json' with { type: 'json' };

// New downloads remain separate from the preserved indexed batch and reviews.
export const additionalPaperCandidates = mathematicsDiscovery.records;
export const latestDiscoveryDate = mathematicsDiscovery.recordedAt;

export function obtainedPaperCandidates(qualification: string) {
  return additionalPaperCandidates.filter(
    (record) =>
      record.qualification === qualification &&
      record.questionPaper.accessStatus === 'obtained' &&
      record.markScheme.accessStatus === 'obtained',
  );
}
