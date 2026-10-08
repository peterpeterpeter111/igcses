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
  [
    'Human Biology research rubric identifier',
    /4HB1-2024-May-01-standard\.Q\d+(?:\.[a-z]+)*:point-\d/,
  ],
  [
    'English private retrieval answer-group identifier',
    /4EB1-2024-(?:November-01|May-01-standard)\.Q\d+:group-\d/,
  ],
  ['English private level-grid identifier', /4EB1-2024-(?:November-01|May-01-standard):grid:/],
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
  if (/library-search-[^/]+\.js$/.test(file) && Buffer.byteLength(text) > 250000) {
    findings.push({ file, label: 'Library search client exceeds 250 kB; check for bundled full note documents' });
  }
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
