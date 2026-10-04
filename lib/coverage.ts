import matrixFamily from '../research/templates/4MB1-matrix-addition.v0.1.0.json' with { type: 'json' };
import groupedMeanFamily from '../research/templates/4MB1-grouped-mean.v0.1.0.json' with { type: 'json' };
import rawLinks from '../research/paper-ledger.json' with { type: 'json' };
import candidates from '../research/coverage.json' with { type: 'json' };
import batch from '../research/batches/2026-09-08-cross-subject-lower-01.manifest.json' with { type: 'json' };
import covers from '../research/reviews/2026-09-09-cover-review.json' with { type: 'json' };
import physicsExtraction from '../research/extractions/4PH1-2024-June-1-standard.json' with { type: 'json' };
import physicsIndex from '../research/reviews/2026-09-10-physics-leaf-index.json' with { type: 'json' };
import physicsVisualAudit from '../research/reviews/2026-09-10-physics-visual-audit.json' with { type: 'json' };
import { subjects } from '../content/catalog';
import { notes } from '../content/notes';
import retrievalFamily from '../research/templates/4EB1-retrieve-two-causes.v0.1.0.json' with { type: 'json' };
import resultantFamily from '../research/templates/4PH1-collinear-resultant.v0.1.0.json' with { type: 'json' };
import weightFamily from '../research/templates/4PH1-weight-convert-mass.v0.1.0.json' with { type: 'json' };
import quadraticFamily from '../research/templates/4MB1-monic-quadratic.v0.1.0.json' with { type: 'json' };
import { activeFamilies } from '../server/template-registry';
import { latestDiscoveryDate, obtainedPaperCandidates, paperCoverReview, paperDetailedSummary } from './paper-discovery';

const researchFamilies = [retrievalFamily, resultantFamily, weightFamily, quadraticFamily, matrixFamily, groupedMeanFamily];
const mathematicsSummary = obtainedPaperCandidates('4MB1').map(paperDetailedSummary).find((row) => row !== null);
export const evidenceHighlights = {
  updatedAt: [physicsExtraction.paperStageReviewedAt, latestDiscoveryDate, mathematicsSummary?.reviewedAt ?? latestDiscoveryDate].sort().at(-1),
  mathematicsDetailedParts: mathematicsSummary?.detailedTasks ?? 0,
  mathematicsDetailedMarks: mathematicsSummary?.originalMarks ?? 0,
  physicsDetailedParts: physicsExtraction.detailedLeafTasks,
  physicsDetailedMarks: physicsExtraction.detailedOriginalMarks,
  provisionalFamilies: researchFamilies.filter((f) => f.status === 'provisional').length,
  experimentalGenerators: researchFamilies.filter((f) => f.status === 'provisional' && f.runtime.implemented).length,
  activeFamilies: activeFamilies.length,
};
export function coverageSummary() {
  return subjects.map((s) => {
    const raw = rawLinks.filter((x) => x.qualification === s.code),
      indexed = batch.records.filter((x) => x.qualification === s.code);
    return {
      subject: s,
      rawQuestionLinks: raw.filter((x) => x.documentType === 'question-paper')
        .length,
      rawSchemeLinks: raw.filter((x) => x.documentType === 'mark-scheme')
        .length,
      rawReportLinks: raw.filter((x) => x.documentType === 'examiner-report')
        .length,
      obtained:
        indexed.filter((x) => x.indexed).length + (s.code === '4EB1' ? 1 : 0)
        + obtainedPaperCandidates(s.code).length,
      candidatePairs: obtainedPaperCandidates(s.code).filter((record) => !paperCoverReview(record)).length,
      fullyProcessed: 0,
      candidatePoints: candidates.filter((x) => x.qualification === s.code)
        .length,
      completePoints: 0,
      completeChapters: s.chapters.filter((x) => x.complete).length,
      writtenChapters: notes.filter((n) => n.subjectId === s.id).length,
    };
  });
}
export function subjectEvidence(code: string) {
  return batch.records
    .filter((r) => r.qualification === code)
    .map((r) => ({
      paperId: r.paperId,
      questionPaper: r.questionPaper,
      markScheme: r.markScheme,
      review: covers.records.find((c) => c.paperId === r.paperId),
      index:
        r.paperId === physicsIndex.paperId
          ? {
              textTasks: physicsIndex.indexedLeafCount,
              visualTasks: physicsVisualAudit.verifiedLeafCount,
              reconciledMarks: physicsVisualAudit.reconciledMarks,
              questionPaperPages: physicsVisualAudit.questionPaper.length,
              markSchemePages: physicsVisualAudit.markScheme.length,
              sourceDiscrepancies:
                new Set([
                  ...physicsVisualAudit.sourceDiscrepancies.map((d) => d.id),
                  ...physicsExtraction.tasks.flatMap((t) =>
                    t.sourceDiscrepancy ? [t.sourceDiscrepancy.id] : [],
                  ),
                ]).size,
            }
          : null,
      extraction:
        r.paperId === physicsExtraction.paperId
          ? {
              detailedTasks: physicsExtraction.detailedLeafTasks,
              originalMarks: physicsExtraction.detailedOriginalMarks,
              expectedTasks: physicsExtraction.wholePaperLeafCount,
              reviewedQuestions: Object.keys(
                physicsExtraction.reviewedQuestionTotals,
              ),
              blockers: physicsExtraction.blockers,
              notes: physicsExtraction.processingNotes,
            }
          : null,
    }));
}
export const pointCandidates = candidates;
export const discoveryLinks = rawLinks;
