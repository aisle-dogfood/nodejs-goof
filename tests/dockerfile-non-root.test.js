const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dockerfilePath = path.join(__dirname, '..', 'Dockerfile');
const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
const lines = dockerfile.split(/\r?\n/);

const entrypointIndex = lines.findIndex((line) => /^\s*ENTRYPOINT\b/i.test(line));
assert.notStrictEqual(entrypointIndex, -1, 'Dockerfile must define an ENTRYPOINT');

const lastUserBeforeEntrypoint = lines
  .slice(0, entrypointIndex)
  .filter((line) => /^\s*USER\b/i.test(line))
  .pop();

assert.ok(
  lastUserBeforeEntrypoint,
  'Dockerfile must set a non-root USER before ENTRYPOINT'
);
assert.ok(
  !/^\s*USER\s+root\s*$/i.test(lastUserBeforeEntrypoint),
  'The last USER before ENTRYPOINT must not be root'
);

console.log('Dockerfile uses a non-root USER before ENTRYPOINT.');
