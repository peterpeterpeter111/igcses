import englishObjectives from '../research/assessment-objectives/4EB1-issue4.json' with { type: 'json' };
// This source model has its own identity domain. Do not add its AO rows to
// reviewedInventories or report them as numbered curriculum statements.
export function assessmentObjectiveCoverage(qualification: string) {
  if (qualification !== englishObjectives.qualification) return [];
  return englishObjectives.objectives.map((objective) => ({
    ...objective,
    links: englishObjectives.teachingLinks.filter((link) => link.objectiveId === objective.id),
  }));
}
export const assessmentObjectiveReviewDate = englishObjectives.reviewDate;
