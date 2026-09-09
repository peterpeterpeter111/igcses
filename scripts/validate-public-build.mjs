import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'dist/client';
const forbidden = [
  ['OpenAI API key environment name', /OPENAI_API_KEY/],
  ['OpenAI secret token pattern', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  [
    'synthetic private solution fixture',
    /(?:SECRET_SOLUTION|SECRET_RUBRIC|PRIVATE_SOLUTION)/,
  ],
];

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}

const files = filesIn(root);
const findings = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const [label, pattern] of forbidden) {
    if (pattern.test(text)) findings.push({ file, label });
  }
}

if (findings.length) {
  console.error(
    JSON.stringify({ checkedFiles: files.length, findings }, null, 2),
  );
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify({ checkedFiles: files.length, findings: [] }, null, 2),
  );
}
