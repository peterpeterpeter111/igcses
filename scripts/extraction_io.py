"""Read a source overlay and its explicitly declared question partitions.

Legacy single-file overlays remain readable. Partitioned overlays have an empty
root task array; content, order, ownership and declared counts are validated
before returning the same logical object as the single-file representation.
"""
import json
from pathlib import Path


def read_extraction(path):
    path = Path(path)
    model = json.loads(path.read_text())
    partitioning = model.get('taskPartitions')
    if partitioning is None:
        return model
    if (partitioning.get('schemaVersion') != 1 or model.get('tasks') != []
            or not isinstance(partitioning.get('parts'), list) or not partitioning['parts']):
        raise ValueError('Invalid extraction partition declaration')
    expected_directory = path.with_suffix('')
    if expected_directory.is_symlink() or not expected_directory.is_dir():
        raise ValueError('Missing or linked extraction partition directory')
    declared, tasks, questions, ids = [], [], [], set()
    for part in partitioning['parts']:
        question = part['question']
        if not isinstance(question, str) or not question.isdigit() or str(int(question)) != question or question in questions:
            raise ValueError('Duplicate or noncanonical extraction question')
        relative = path.stem + '/Q' + question + '.json'
        if part['path'] != relative:
            raise ValueError('Unsafe or noncanonical extraction partition path')
        child = path.parent / relative
        if child.is_symlink() or not child.is_file():
            raise ValueError('Missing or linked extraction question')
        data = json.loads(child.read_text())
        if (data.get('schemaVersion') != 1 or data.get('paperId') != model['paperId']
                or data.get('question') != question or not isinstance(data.get('tasks'), list) or not data['tasks']):
            raise ValueError('Wrong extraction partition identity')
        for task in data['tasks']:
            label = task.get('questionPath', '')
            tid = model['paperId'] + '.Q' + label
            if (label.split('.')[0] != question or task.get('paperId') != model['paperId']
                    or task.get('taskId') != tid or tid in ids):
                raise ValueError('Wrong question, duplicate or foreign extraction task')
            ids.add(tid)
        tasks += data['tasks']; declared.append(child); questions.append(question)
    if questions != sorted(questions, key=int) or set(expected_directory.iterdir()) != set(declared):
        raise ValueError('Unordered or undeclared extraction partitions')
    if (len(tasks) != model['detailedLeafTasks'] or sum(t['originalMarks'] for t in tasks) != model['detailedOriginalMarks']
            or questions != list(model['reviewedQuestionTotals'])):
        raise ValueError('Extraction partition count/allocation mismatch')
    model['tasks'] = tasks
    return model
