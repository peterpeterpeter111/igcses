import englishNovemberSummary from '../research/pilot-summaries/4EB1-2024-November-01.json' with { type: 'json' };
import englishMaySummary from '../research/pilot-summaries/4EB1-2024-May-01-standard.json' with { type: 'json' };
import retrievalValidation from '../research/validation/2026-10-05-retrieval-prototype.json' with { type: 'json' };
import rawLinks from '../research/paper-ledger.json' with { type: 'json' };
import candidates from '../research/coverage.json' with { type: 'json' };
import batch from '../research/batches/2026-09-08-cross-subject-lower-01.manifest.json' with { type: 'json' };
import covers from '../research/reviews/2026-09-09-cover-review.json' with { type: 'json' };
import physicsExtraction from '../research/extractions/4PH1-2024-June-1-standard.json' with { type: 'json' };
import humanIndex from '../research/paper-indexes/4HB1-2024-summer-01.json' with { type: 'json' };
import chemistryIndex from '../research/paper-indexes/4CH1-2024-summer-1c.json' with { type: 'json' };
import biologyIndex from '../research/paper-indexes/4BI1-2024-summer-1b.json' with { type: 'json' };
import humanExtraction from '../research/extractions/4HB1-2024-May-01-standard.json' with { type: 'json' };
import biologyExtraction from '../research/extractions/4BI1-2024-June-1-standard.json' with { type: 'json' };
import chemistryExtraction from '../research/extractions/4CH1-2024-June-1-standard.json' with { type: 'json' };
import physicsIndex from '../research/reviews/2026-09-10-physics-leaf-index.json' with { type: 'json' };
import physicsVisualAudit from '../research/reviews/2026-09-10-physics-visual-audit.json' with { type: 'json' };
import { subjects } from '../content/catalog.ts';
import { reviewedInventories } from './syllabus.ts';
import { notes } from '../content/notes.ts';
import { activeFamilies } from '../server/template-registry.ts';
import {
  latestDiscoveryDate,
  obtainedPaperCandidates,
  paperCoverReview,
  paperDetailedSummary,
} from './paper-discovery.ts';

import researchFamilies from '../research/template-summaries.json' with { type: 'json' };
const familyNames: Record<string, string> = {
  '4HB1.cube.measure': 'Human Biology cube measures',
  '4EB1.retrieve-two-causes': 'English retrieval',
  '4PH1.collinear-resultant': 'Physics resultant force',
  '4PH1.weight.convert-mass': 'Physics weight',
  '4MB1.factorisation.monic-quadratic': 'Maths factorisation',
  '4MB1.matrices.add-two-by-two': 'Maths matrix addition',
  '4MB1.statistics.grouped-mean': 'Maths grouped means',
  '4EB1.explicit-fact-retrieval': 'English one-fact retrieval',
  '4EB1.retrieve-two-comments': 'English two-comment retrieval',
  '4EB1.language-structure-analysis': 'English language and structure',
  '4EB1.viewpoints-comparison': 'English viewpoints comparison',
  '4EB1.source-directed-letter': 'English source-directed letter',
  '4EB1.argumentative-extended-writing': 'English argument writing',
  '4EB1.future-narrative': 'English narrative writing',
  '4EB1.place-description': 'English descriptive writing',
};
const mathematicsSummary = obtainedPaperCandidates('4MB1')
  .map(paperDetailedSummary)
  .find((row) => row !== null);
export const evidenceHighlights = {
  updatedAt: [
    englishNovemberSummary.reviewedAt,
    englishMaySummary.reviewedAt,
    physicsExtraction.paperStageReviewedAt,
    latestDiscoveryDate,
    mathematicsSummary?.reviewedAt ?? latestDiscoveryDate,
    retrievalValidation.date,
    humanExtraction.reviewDate,
    biologyExtraction.reviewDate,
    chemistryExtraction.reviewDate,
  ]
    .sort()
    .at(-1),
  englishNovemberDetailedTasks: englishNovemberSummary.detailedTasks,
  englishMayDetailedTasks: englishMaySummary.detailedTasks,
  humanBiologyDetailedParts: humanExtraction.detailedLeafTasks,
  humanBiologyExpectedParts: humanExtraction.wholePaperLeafCount,
  humanBiologyDetailedMarks: humanExtraction.detailedOriginalMarks,
  biologyDetailedParts: biologyExtraction.detailedLeafTasks,
  biologyDetailedMarks: biologyExtraction.detailedOriginalMarks,
  biologyExpectedParts: biologyIndex.indexedLeafCount,
  biologyIndexedMarks: biologyIndex.indexedOriginalMarks,
  biologyReviewedQuestions: Object.keys(biologyExtraction.reviewedQuestionTotals).join(', '),
  mathematicsDetailedParts: mathematicsSummary?.detailedTasks ?? 0,
  mathematicsDetailedMarks: mathematicsSummary?.originalMarks ?? 0,
  physicsDetailedParts: physicsExtraction.detailedLeafTasks,
  physicsDetailedMarks: physicsExtraction.detailedOriginalMarks,
  provisionalFamilies: researchFamilies.filter(
    (f) => f.status === 'provisional',
  ).length,
  experimentalGenerators: researchFamilies.filter(
    (f) => f.status === 'provisional' && f.runtimeImplemented,
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
      fullyProcessed: s.code === '4EB1' ? englishMaySummary.fullyProcessedPapers + englishNovemberSummary.fullyProcessedPapers : 0,
      candidatePoints: candidates.filter((x) => x.qualification === s.code)
        .length,
      completePoints: reviewedInventories.filter((i) => i.qualification === s.code).flatMap((i) => i.points).filter((p) => p.teachingCoverage === 'complete' && p.substatementAuditComplete).length,
      completeChapters: s.chapters.filter((x) => x.complete).length,
      writtenChapters: notes.filter((n) => n.subjectId === s.id).length,
    };
  });
}
export function subjectEvidence(code: string) {
  return batch.records
    .filter((r) => r.qualification === code)
    .map((r) => {
      const detail = [physicsExtraction, humanExtraction, biologyExtraction, chemistryExtraction].find(
        (e) => e.paperId === r.paperId,
      );
      return {
        paperId: r.paperId,
        fullyProcessed: r.paperId === englishMaySummary.paperId && englishMaySummary.fullyProcessedPapers === 1,
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
              : r.paperId === biologyIndex.paperId
                ? {
                    textTasks: null,
                    hasEquationBooklet: false,
                    visualTasks: biologyIndex.indexedLeafCount,
                    reconciledMarks: biologyIndex.indexedOriginalMarks,
                    questionPaperPages: biologyIndex.questionPaperVisualPages.length,
                    markSchemePages: biologyIndex.markSchemeVisualPages.length,
                    sourceDiscrepancies: biologyIndex.sourceDiscrepancies.length,
                  }
                : r.paperId === chemistryIndex.paperId
                  ? {
                      textTasks: null,
                      hasEquationBooklet: false,
                      visualTasks: chemistryIndex.indexedLeafCount,
                      reconciledMarks: chemistryIndex.indexedOriginalMarks,
                      questionPaperPages: chemistryIndex.questionPaperVisualPages.length,
                      markSchemePages: chemistryIndex.markSchemeVisualPages.length,
                      sourceDiscrepancies: chemistryIndex.sourceDiscrepancies.length,
                    }
                  : null,
        extraction: r.paperId === englishMaySummary.paperId ? {
          detailedTasks: englishMaySummary.detailedTasks,
          originalMarks: englishMaySummary.detailedOriginalMarks,
          reviewedQuestions: Array.from({ length: englishMaySummary.printedTasks }, (_, i) => String(i + 1)),
          expectedTasks: englishMaySummary.printedTasks,
          blockers: englishMaySummary.limitations,
          notes: ['The legacy May ID and the official June series describe one sitting, counted once.', 'All writing options are extracted; candidates answer only one Section C option.'],
          questionPaperPages: englishMaySummary.questionPaperPagesReviewed,
          markSchemePages: englishMaySummary.markSchemePagesReviewed,
          wholePageAudit: englishMaySummary.wholePageAudit,
          printedChoices: true,
          assessedMarks: englishMaySummary.assessedMarks,
          candidateAnsweredTasks: englishMaySummary.candidateAnsweredTasks,
        } : detail
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
              printedChoices: false,
              assessedMarks: null,
              candidateAnsweredTasks: null,
            }
          : null,
      };
    });
}
export const pointCandidates = candidates;
export const discoveryLinks = rawLinks;
