"""Verify evidence-backed teaching completion separately from chapter/exam readiness.

Hashes make a recorded judgement stale when source, requirements or lessons change.
They verify review provenance, not educational correctness by themselves.
"""
import hashlib
import json
from datetime import date
from pathlib import Path
from note_io import read_note


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate_inventory_completion(root, inventory):
    root = Path(root)
    promoted = [p for p in inventory['points'] if p['teachingCoverage'] == 'complete' or p['substatementAuditComplete']]
    ref = inventory.get('completionReviewRef')
    if not promoted:
        require(not ref, 'Completion review without promoted teaching points')
        return []
    require(isinstance(ref, str) and ref.startswith('research/teaching-reviews/') and '..' not in Path(ref).parts,
            'Complete teaching requires a bounded review reference')
    target = root / ref
    require(not target.is_symlink() and (root / 'research/teaching-reviews').resolve() in target.resolve().parents,
            'Teaching review path escaped')
    review = json.loads(target.read_text())
    date.fromisoformat(review['reviewDate'])
    require(review['schemaVersion'] in [1, 2] and review['qualification'] == inventory['qualification']
            and review['documentId'] == inventory['specificationDocumentId']
            and review['specificationSha256'] == inventory['specificationSha256']
            and review['inventorySha256'] == digest(inventory), 'Teaching review source/inventory is stale')
    require(review['reviewerType'] == 'agent' and review['reviewer'] and review['humanReviewed'] is False
            and review['scope'] == 'authored-teaching-coverage' and review['policyVersion'] == 1
            and review['practicalTrialsPerformed'] is False and review['examTemplateCalibrationComplete'] is False,
            'Teaching review must preserve its actual reviewer and bounded scope')
    if review['schemaVersion'] == 1:
        sources = [{'ref': review['auditRef'], 'sha256': review['auditSha256']}]
        require('auditSources' not in review, 'Ambiguous teaching audit formats')
    else:
        sources = review['auditSources']
        require('auditRef' not in review and 'auditSha256' not in review, 'Ambiguous teaching audit formats')
    require(isinstance(sources, list) and sources and len({s['ref'] for s in sources}) == len(sources),
            'Teaching review needs distinct requirement audits')
    parents = []
    for source in sources:
        ref = source['ref']
        require(isinstance(ref, str) and ref.startswith('research/curriculum-audits/')
                and '..' not in Path(ref).parts, 'Teaching audit path escaped')
        audit_path = root / ref
        require(not audit_path.is_symlink() and (root / 'research/curriculum-audits').resolve() in audit_path.resolve().parents,
                'Teaching audit path escaped')
        audit = json.loads(audit_path.read_text())
        require(source['sha256'] == digest(audit) and audit['documentSha256'] == review['specificationSha256']
                and audit['qualification'] == inventory['qualification'], 'Teaching requirements review is stale')
        parents.extend(audit['parents'])
    require(len({p['parentId'] for p in parents}) == len(parents), 'Duplicate audited parent identities')
    note = read_note(root / review['noteRef'])
    promoted_sections = {id for point in promoted for id in point['noteSectionIds']}
    diagram_refs = {s['diagram']['src'] for s in note['sections'] if s['id'] in promoted_sections and s.get('diagram')}
    require(set(review['diagramSha256']) == diagram_refs, 'Reviewed diagram inventory differs')
    for src, sha in review['diagramSha256'].items():
        require(src.startswith('/diagrams/') and '..' not in Path(src).parts, 'Diagram path escaped')
        asset = root / 'public' / src.lstrip('/')
        require(not asset.is_symlink() and (root / 'public/diagrams').resolve() in asset.resolve().parents
                and hashlib.sha256(asset.read_bytes()).hexdigest() == sha, 'Reviewed diagram asset is stale: ' + src)
    decisions = review['points']
    require(len(decisions) == len(promoted) and {d['pointId'] for d in decisions} == {p['id'] for p in promoted},
            'Completion review point identities differ')
    for point in promoted:
        require(point['teachingCoverage'] == 'complete' and point['substatementAuditComplete'] is True,
                'Source audit and authored teaching completion must agree')
        matches = [p for p in parents if p['parentId'] == point['id']]
        require(len(matches) == 1, 'Teaching completion lacks a unique requirements audit')
        parent = matches[0]
        require(parent['officialReference'] == point['reference'] and parent['pdfPage'] == point['pdfPage']
                and parent['printedPage'] == point['printedPage'] and parent['components'] == point['components'],
                'Teaching audit differs from the exact source identity')
        require(parent['substatementAuditComplete'] is True and parent['teachingAuditStatus'] == 'complete',
                'Teaching completion lacks a finished requirement audit')
        decision = next(d for d in decisions if d['pointId'] == point['id'])
        requirements = parent['requirements']
        checks = decision['requirements']
        require(len(checks) == len(requirements) and len({c['id'] for c in checks}) == len(checks)
                and {c['id'] for c in checks} == {r['id'] for r in requirements}, 'Every requirement needs one review decision')
        for req in requirements:
            check = next(c for c in checks if c['id'] == req['id'])
            require(req['completionStatus'] == 'complete' and req['explanationStatus'] == 'present'
                    and not req['remainingChecks'] and check['verdict'] == 'approved'
                    and check['judgement'].strip() and check['assessmentSectionId'] in point['noteSectionIds'],
                    'Incomplete teaching requirement cannot be promoted')
            sections = {s['id']: s for s in note['sections']}
            question = sections.get(check['assessmentSectionId'])
            require(question and question.get('example') and question.get('practice'),
                    'Teaching completion needs original worked and unfamiliar practice evidence')
            require(all(e['sectionId'] in point['noteSectionIds'] and sections.get(e['sectionId'], {}).get(e['field'])
                        for e in req['teachingEvidence']), 'Completion explanation evidence missing')
        ids = point['noteSectionIds']
        require(set(decision['sectionSha256']) == set(ids), 'Teaching review section inventory differs')
        for section_id in ids:
            matches = [s for s in note['sections'] if s['id'] == section_id and point['reference'] in s.get('points', [])]
            require(len(matches) == 1 and digest(matches[0]) == decision['sectionSha256'][section_id],
                    'Reviewed teaching section is stale: ' + section_id)
    return [p['id'] for p in promoted]


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    completed = []
    for path in sorted((root / 'research/syllabus').glob('*.json')):
        completed.extend(validate_inventory_completion(root, json.loads(path.read_text())))
    print(json.dumps({'completeAuthoredTeachingPoints': len(completed), 'pointIds': completed,
                      'scope': 'Agent reviewed authored teaching; chapter, paper, learner and exam-template readiness are separate.'}))
