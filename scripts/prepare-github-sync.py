"""Prepare bounded, reviewable GitHub tree requests from committed source.

Offline only: no credentials, network writes, branch updates or content changes.
Submit each request through the GitHub connector, chaining returned tree SHAs.
Verify the final tree equals targetTree before creating/updating any commit/ref.
"""
import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_REQUEST_BYTES = 195000


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def encode(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', required=True, help='Fetched remote commit/ref')
    parser.add_argument('--head', default='HEAD', help='Committed local snapshot')
    parser.add_argument('--blob-map', type=Path, help='JSON map of paths to previously uploaded GitHub blob SHAs')
    parser.add_argument('--output-dir', type=Path, required=True, help='New directory under work/')
    args = parser.parse_args()
    output = (ROOT / args.output_dir).resolve()
    if ROOT / 'work' not in output.parents or output.exists():
        parser.error('Choose a new directory inside ignored work/')
    # A matching committed tree cannot prove that the working site was saved.
    # Refuse to silently omit a new diagram or another unsaved source file.
    if git('status', '--porcelain=v1', '-z', '--untracked-files=all'):
        parser.error('Commit all intended source changes before preparing a GitHub sync; '
                     'unsaved or untracked files would be omitted. Ignored work files are allowed.')
    base = git('rev-parse', args.base + '^{commit}').decode().strip()
    head = git('rev-parse', args.head + '^{commit}').decode().strip()
    tree = git('rev-parse', head + '^{tree}').decode().strip()
    uploaded = json.loads(args.blob_map.read_text()) if args.blob_map else {}
    if not isinstance(uploaded, dict):
        parser.error('Blob map must contain path-to-SHA entries')
    used_blobs = set()
    entries = {}
    for item in git('ls-tree', '-rz', head).split(b'\0'):
        if not item:
            continue
        metadata, name = item.split(b'\t', 1)
        mode, kind, sha = metadata.decode().split()
        entries[name.decode()] = (mode, kind, sha)
    # Tree requests need both the removed path and the replacement. Git's rename
    # detection otherwise returns only the destination with --name-only.
    changed = git('diff', '--no-renames', '--name-only', '-z', base, head).decode().split('\0')
    batches, current = [], []

    def request(elements):
        return {'repository_full_name': 'peterpeterpeter111/igcses',
                'base_tree_sha': '0' * 40, 'tree_elements': elements}

    for path in filter(None, changed):
        if path not in entries:
            element = {'path': path, 'mode': '100644', 'type': 'blob', 'sha': None}
        else:
            mode, kind, sha = entries[path]
            if kind != 'blob' or mode not in ['100644', '100755']:
                raise ValueError('Manual review required for non-text file mode: ' + path)
            content = git('cat-file', 'blob', sha).decode('utf-8')
            if '\0' in content:
                raise ValueError('Manual review required for binary content: ' + path)
            if path in uploaded:
                if uploaded[path] != sha:
                    raise ValueError('Uploaded blob does not match committed source: ' + path)
                element = {'path': path, 'mode': mode, 'type': kind, 'sha': sha}
                used_blobs.add(path)
            else:
                element = {'path': path, 'mode': mode, 'type': kind, 'content': content}
        if len(encode(request([element]))) > MAX_REQUEST_BYTES:
            raise ValueError('Single file exceeds reviewable request size; stop and review: ' + path)
        if current and len(encode(request(current + [element]))) > MAX_REQUEST_BYTES:
            batches.append(request(current))
            current = []
        current.append(element)
    if current:
        batches.append(request(current))
    if used_blobs != set(uploaded):
        raise ValueError('Blob map includes unchanged or missing source paths')
    summary = {'baseCommit': base, 'baseTree': git('rev-parse', base + '^{tree}').decode().strip(),
               'localCommit': head, 'targetTree': tree, 'maxRequestBytes': MAX_REQUEST_BYTES,
               'changedFiles': sum(len(b['tree_elements']) for b in batches),
               'batches': [{'file': f'batch-{i:03}.json', 'bytes': len(encode(b)),
                            'paths': [e['path'] for e in b['tree_elements']]}
                           for i, b in enumerate(batches, 1)]}
    output.mkdir(parents=True)
    for item, batch in zip(summary['batches'], batches):
        (output / item['file']).write_bytes(encode(batch))
    (output / 'plan.json').write_bytes(encode(summary))
    print(json.dumps({k: v for k, v in summary.items() if k != 'batches'}))
    print(json.dumps({'batches': len(batches), 'largestRequest': max((len(encode(b)) for b in batches), default=0)}))
