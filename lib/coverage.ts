import cubeFamily from '../research/templates/4HB1-cube-measure.v0.1.0.json' with { type: 'json' };
import matrixFamily from '../research/templates/4MB1-matrix-addition.v0.1.0.json' with { type: 'json' };
import retrievalValidation from '../research/validation/2026-10-05-retrieval-prototype.json' with { type: 'json' };
import groupedMeanFamily from '../research/templates/4MB1-grouped-mean.v0.1.0.json' with { type: 'json' };
import rawLinks from '../research/paper-ledger.json' with { type: 'json' };
import candidates from '../research/coverage.json' with { type: 'json' };
import batch from '../research/batches/2026-09-08-cross-subject-lower-01.manifest.json' with { type: 'json' };
import covers from '../research/reviews/2026-09-09-cover-review.json' with { type: 'json' };
import physicsExtraction from '../research/extractions/4PH1-2024-June-1-standard.json' with { type: 'json' };
import humanIndex from '../research/paper-indexes/4HB1-2024-summer-01.json' with { type: 'json' };
import humanExtraction from '../research/extractions/4HB1-2024-May-01-standard.json' with { type: 'json' };
import physicsIndex from '../research/reviews/2026-09-10-physics-leaf-index.json' with { type: 'json' };
import physicsVisualAudit from '../research/reviews/2026-09-10-physics-visual-audit.json' with { type: 'json' };
import { subjects } from '../content/catalog.ts';
import { notes } from '../content/notes.ts';
import retrievalFamily from '../research/templates/4EB1-retrieve-two-causes.v0.1.0.json' with { type: 'json' };
import resultantFamily from '../research/templates/4PH1-collinear-resultant.v0.1.0.json' with { type: 'json' };
import weightFamily from '../research/templates/4PH1-weight-convert-mass.v0.1.0.json' with { type: 'json' };
import quadraticFamily from '../research/templates/4MB1-monic-quadratic.v0.1.0.json' with { type: 'json' };
import { activeFamilies } from '../server/template-registry.ts';
import {
  latestDiscoveryDate,
  obtainedPaperCandidates,
  paperCoverReview,
  paperDetailedSummary,
} from './paper-discovery.ts';

const researchFamilies = [
  cubeFamily,
  retrievalFamily,
  resultantFamily,
  weightFamily,
  quadraticFamily,
  matrixFamily,
  groupedMeanFamily,
];
const familyNames: Record<string, string> = {
  '4HB1.cube.measure': 'Human Biology cube measures',
  '4EB1.retrieve-two-causes': 'English retrieval',
  '4PH1.collinear-resultant': 'Physics resultant force',
  '4PH1.weight.convert-mass': 'Physics weight',
  '4MB1.factorisation.monic-quadratic': 'Maths factorisation',
  '4MB1.matrices.add-two-by-two': 'Maths matrix addition',
  '4MB1.statistics.grouped-mean': 'Maths grouped means',
};
const mathematicsSummary = obtainedPaperCandidates('4MB1')
  .map(paperDetailedSummary)
  .find((row) => row !== null);
export const evidenceHighlights = {
  updatedAt: [
    physicsExtraction.paperStageReviewedAt,
    latestDiscoveryDate,
    mathematicsSummary?.reviewedAt ?? latestDiscoveryDate,
    retrievalValidation.date,
    humanExtraction.reviewDate,
  ]
    .sort()
    .at(-1),
  humanBiologyDetailedParts: humanExtraction.detailedLeafTasks,
  humanBiologyExpectedParts: humanExtraction.wholePaperLeafCount,
  humanBiologyDetailedMarks: humanExtraction.detailedOriginalMarks,
  mathematicsDetailedParts: mathematicsSummary?.detailedTasks ?? 0,
  mathematicsDetailedMarks: mathematicsSummary?.originalMarks ?? 0,
  physicsDetailedParts: physicsExtraction.detailedLeafTasks,
  physicsDetailedMarks: physicsExtraction.detailedOriginalMarks,
  provisionalFamilies: researchFamilies.filter(
    (f) => f.status === 'provisional',
  ).length,
  experimentalGenerators: researchFamilies.filter(
    (f) => f.status === 'provisional' && f.runtime.implemented,
  ).length,
  provisionalFamilyNames: researchFamilies
    .filter((f) => f.status === 'provisional')
    .map((f) => familyNames[f.id] ?? f.id),
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
        indexed.filter((x) => x.indexed).length +
        (s.code === '4EB1' ? 1 : 0) +
        obtainedPaperCandidates(s.code).length,
      candidatePairs: obtainedPaperCandidates(s.code).filter(
        (record) => !paperCoverReview(record),
      ).length,
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
    .map((r) => {
      const detail = [physicsExtraction, humanExtraction].find(
        (e) => e.paperId === r.paperId,
      );
      return {
        paperId: r.paperId,
        questionPaper: r.questionPaper,
        markScheme: r.markScheme,
        review: covers.records.find((c) => c.paperId === r.paperId),
        index:
          r.paperId === physicsIndex.paperId
            ? {
                textTasks: physicsIndex.indexedLeafCount,
                hasEquationBooklet: true,
                visualTasks: physicsVisualAudit.verifiedLeafCount,
                reconciledMarks: physicsVisualAudit.reconciledMarks,
                questionPaperPages: physicsVisualAudit.questionPaper.length,
                markSchemePages: physicsVisualAudit.markScheme.length,
                sourceDiscrepancies: new Set([
                  ...physicsVisualAudit.sourceDiscrepancies.map((d) => d.id),
                  ...physicsExtraction.tasks.flatMap((t) =>
                    t.sourceDiscrepancy ? [t.sourceDiscrepancy.id] : [],
                  ),
                ]).size,
              }
            : r.paperId === humanIndex.paperId
              ? {
                  textTasks: null,
                  hasEquationBooklet: false,
                  visualTasks: humanIndex.indexedLeafCount,
                  reconciledMarks: humanIndex.indexedOriginalMarks,
                  questionPaperPages: humanIndex.questionPaperVisualPages.length,
                  markSchemePages: humanIndex.markSchemeVisualPages.length,
                  sourceDiscrepancies: humanIndex.sourceDiscrepancies.length,
                }
              : null,
        extraction: detail
          ? {
              detailedTasks: detail.detailedLeafTasks,
              originalMarks: detail.detailedOriginalMarks,
              expectedTasks: detail.wholePaperLeafCount,
              reviewedQuestions: Object.keys(detail.reviewedQuestionTotals),
              blockers: detail.blockers,
              notes: detail.processingNotes,
              questionPaperPages:
                detail.pageAudit.questionPaper.visuallyReviewedPages.length,
              markSchemePages:
                detail.pageAudit.markScheme.visuallyReviewedPages.length,
              wholePageAudit:
                detail.pageAudit.questionPaper.wholeDocumentReviewed &&
                detail.pageAudit.markScheme.wholeDocumentReviewed,
            }
          : null,
      };
    });
}
export const pointCandidates = candidates;
export const discoveryLinks = rawLinks;
