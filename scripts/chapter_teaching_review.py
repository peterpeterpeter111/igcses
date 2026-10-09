"""Validate whole authored-chapter scope without claiming exam readiness.

Completion decisions remain agent judgements. Hashes prevent a recorded review
from silently covering later source, lesson, diagram or goal changes.
"""
import json
from datetime import date
from pathlib import Path
from teaching_review import digest, require, validate_inventory_completion
from note_io import read_note


def read_bound(root, ref, folder):
    require(isinstance(ref, str) and ref.startswith(folder + '/') and '..' not in Path(ref).parts,
            'Chapter review reference escaped')
    target = root / ref
    require(not target.is_symlink() and (root / folder).resolve() in target.resolve().parents,
            'Chapter review path escaped')
    return json.loads(target.read_text())


def validate_chapters(root):
    root = Path(root)
    registry = read_bound(root, 'research/chapter-teaching-reviews/index.json', 'research/chapter-teaching-reviews')
    require(registry['schemaVersion'] == 1 and len(set(registry['reviews'])) == len(registry['reviews']),
            'Ambiguous chapter review registry')
    output = []
    for ref in registry['reviews']:
        r = read_bound(root, ref, 'research/chapter-teaching-reviews')
        date.fromisoformat(r['reviewDate'])
        require(r['schemaVersion'] == 1 and r['scope'] == 'whole-authored-chapter-teaching'
                and r['reviewerType'] == 'agent' and r['reviewer'] and r['humanReviewed'] is False
                and r['learnerTrialsPerformed'] is False and r['examReadinessCertified'] is False,
                'Chapter review inflated reviewer or readiness scope')
        require(r['qualification'] and r['subjectId'] and r['chapterId'], 'Missing chapter identity')
        boundary = r['sourceBoundary']
        require(boundary['visuallyReviewed'] is True and boundary['wholeTopicPointInventoryReviewed'] is True
                and boundary['firstPdfPage'] <= boundary['lastPdfPage']
                and boundary['nextTopicPdfPage'] == boundary['lastPdfPage'] + 1
                and boundary['topicHeading'] and boundary['nextTopicHeading'] and boundary['judgement'].strip(),
                'Whole chapter needs explicit publisher topic boundaries')
        sources = r['inventorySources']
        require(sources and len({s['ref'] for s in sources}) == len(sources), 'Duplicate chapter inventory sources')
        all_points = []
        for source in sources:
            inv = read_bound(root, source['ref'], 'research/syllabus')
            require(source['sha256'] == digest(inv) and inv['qualification'] == r['qualification']
                    and inv['specificationDocumentId'] == r['documentId']
                    and inv['specificationSha256'] == r['specificationSha256'], 'Chapter source inventory is stale')
            completed = set(validate_inventory_completion(root, inv))
            selected = [p for p in inv['points'] if p['chapterId'] == r['chapterId']]
            require(selected and all(p['id'] in completed for p in selected), 'Chapter has unfinished teaching statements')
            require(all(boundary['firstPdfPage'] <= p['pdfPage'] <= boundary['lastPdfPage'] for p in selected),
                    'Chapter statements differ from source boundaries')
            all_points.extend(selected)
        ids = [p['id'] for p in all_points]
        require(len(set(ids)) == len(ids) and set(ids) == set(r['sourcePointIds'])
                and len(ids) == len(r['sourcePointIds']), 'Chapter point inventory is incomplete or duplicated')
        observed = {p['id'] for path in (root / 'research/syllabus').glob('*.json')
                    for inv in [json.loads(path.read_text())] if inv.get('qualification') == r['qualification']
                    for p in inv.get('points', []) if p['chapterId'] == r['chapterId']}
        require(observed == set(ids), 'Chapter omitted a saved source identity')
        require(r['noteRef'].startswith('content/notes/') and '..' not in Path(r['noteRef']).parts
                and not (root / r['noteRef']).is_symlink()
                and (root / 'content/notes').resolve() in (root / r['noteRef']).resolve().parents, 'Chapter note path escaped')
        note = read_note(root / r['noteRef'])
        require(note['subjectId'] == r['subjectId'] and note['chapterId'] == r['chapterId']
                and note['sourceId'] == r['documentId'] and note['status'] == 'source-checked'
                and note['complete'] is False and note['humanReviewed'] is False
                and digest(note) == r['noteSha256'], 'Whole chapter note is stale or has inflated readiness')
        sections = {s['id']: s for s in note['sections']}
        require(len(sections) == len(note['sections']) and set(sections) == {s for p in all_points for s in p['noteSectionIds']},
                'Whole chapter has missing or unmapped teaching sections')
        require(all(s.get('example') and s.get('practice') for s in sections.values()),
                'Chapter lacks worked or original practice evidence')
        goals = r['goalDecisions']
        require(len(goals) == len(note['goals']) and [g['goal'] for g in goals] == note['goals'], 'Chapter goal review is stale')
        for g in goals:
            require(g['verdict'] == 'approved' and g['judgement'].strip() and g['sectionIds']
                    and set(g['sectionIds']).issubset(sections), 'Chapter goal lacks reviewed evidence')
        require(r['prerequisiteReview']['verdict'] == 'approved' and r['prerequisiteReview']['judgement'].strip(),
                'Chapter prerequisite review is unfinished')
        require(r['coherenceReview']['verdict'] == 'approved' and r['coherenceReview']['judgement'].strip(),
                'Chapter sequencing review is unfinished')
        output.append(dict(qualification=r['qualification'], subjectId=r['subjectId'], chapterId=r['chapterId'],
                           reviewedAt=r['reviewDate'], reviewedPoints=len(ids), scope=r['scope'],
                           humanReviewed=False, examReadinessCertified=False))
    require(len({(r['subjectId'], r['chapterId']) for r in output}) == len(output), 'Duplicate chapter completion')
    return output


if __name__ == '__main__':
    import sys
    root = Path(__file__).resolve().parents[1]
    result = validate_chapters(root)
    target = root / 'content/chapter-teaching-reviews.json'
    if '--write' in sys.argv:
        target.write_text(json.dumps(result, indent=2) + '\n')
    else:
        require(json.loads(target.read_text()) == result, 'Public chapter review projection is stale')
    print(json.dumps({'completeAuthoredChapters': len(result), 'examReadyChapters': 0}))
