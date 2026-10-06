import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Real isolated snapshots catch the missing-file failure that matching tree
// hashes alone cannot detect. No network, user Git settings or project mutations.
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'igcses-sync-test-'));
  const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' };
  const git = (...args: string[]) => {
    const result = spawnSync('git', ['-c', 'user.name=Sync fixture', '-c', 'user.email=fixture@example.invalid', ...args], { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  mkdirSync(join(root, 'scripts'));
  copyFileSync('scripts/prepare-github-sync.py', join(root, 'scripts/prepare-github-sync.py'));
  writeFileSync(join(root, '.gitignore'), '/work/\n');
  writeFileSync(join(root, 'source.txt'), 'base\n');
  git('init', '-q');
  git('add', '.');
  git('commit', '-qm', 'base fixture');
  const base = git('rev-parse', 'HEAD');
  const prepare = () => spawnSync('python3', ['scripts/prepare-github-sync.py', '--base', base, '--output-dir', 'work/sync'], { cwd: root, env, encoding: 'utf8' });
  return { root, git, prepare, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

void test('source sync refuses an untracked diagram instead of publishing an incomplete snapshot', () => {
  const f = fixture();
  try {
    mkdirSync(join(f.root, 'public'));
    writeFileSync(join(f.root, 'public/new-diagram.svg'), '<svg/>');
    const result = f.prepare();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unsaved or untracked files would be omitted/);
    assert.equal(existsSync(join(f.root, 'work/sync')), false);
    assert.equal(f.git('status', '--porcelain'), '?? public/');
  } finally { f.cleanup(); }
});

void test('source sync refuses both unstaged and staged changes without creating a plan', () => {
  const f = fixture();
  try {
    writeFileSync(join(f.root, 'source.txt'), 'unsaved revision\n');
    assert.notEqual(f.prepare().status, 0);
    f.git('add', 'source.txt');
    assert.notEqual(f.prepare().status, 0);
    assert.equal(existsSync(join(f.root, 'work/sync')), false);
    assert.equal(readFileSync(join(f.root, 'source.txt'), 'utf8'), 'unsaved revision\n');
  } finally { f.cleanup(); }
});

void test('committed source sync includes new diagrams and allows ignored local proof files', () => {
  const f = fixture();
  try {
    mkdirSync(join(f.root, 'public'));
    writeFileSync(join(f.root, 'public/new-diagram.svg'), '<svg><title>✿ diagram</title></svg>\n');
    writeFileSync(join(f.root, 'source.txt'), 'saved revision\n');
    f.git('add', '.');
    f.git('commit', '-qm', 'save revision and diagram');
    mkdirSync(join(f.root, 'work'));
    writeFileSync(join(f.root, 'work/proof.png'), 'ignored local proof');
    const result = f.prepare();
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(readFileSync(join(f.root, 'work/sync/plan.json'), 'utf8'));
    assert.equal(plan.targetTree, f.git('rev-parse', 'HEAD^{tree}'));
    const batch = JSON.parse(readFileSync(join(f.root, 'work/sync/batch-001.json'), 'utf8'));
    const paths = batch.tree_elements.map((entry: { path: string }) => entry.path);
    assert.deepEqual(paths, ['public/new-diagram.svg', 'source.txt']);
    assert.equal(batch.tree_elements[0].content, '<svg><title>✿ diagram</title></svg>\n');
    assert.equal(f.git('status', '--porcelain'), '');
  } finally { f.cleanup(); }
});

void test('source sync represents a rename as deletion and addition', () => {
  const f = fixture();
  try {
    f.git('mv', 'source.txt', 'renamed-source.txt');
    f.git('commit', '-qm', 'rename saved source');
    const result = f.prepare();
    assert.equal(result.status, 0, result.stderr);
    const batch = JSON.parse(readFileSync(join(f.root, 'work/sync/batch-001.json'), 'utf8'));
    assert.deepEqual(batch.tree_elements, [
      { path: 'renamed-source.txt', mode: '100644', type: 'blob', content: 'base\n' },
      { path: 'source.txt', mode: '100644', type: 'blob', sha: null },
    ]);
    assert.equal(f.git('status', '--porcelain'), '');
  } finally { f.cleanup(); }
});
