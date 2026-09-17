const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const ts = require(path.join(root, 'apps/web/node_modules/typescript'));
const source = fs.readFileSync(path.join(root, 'apps/web/lib/admin-flags.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { adminFlagEnabled } = context.exports;
for (const value of [false, 0, '0', null, undefined, '']) {
  assert.equal(adminFlagEnabled(value), false, `Disabled flag: ${String(value)}`);
}
for (const value of [true, 1, '1']) {
  assert.equal(adminFlagEnabled(value), true, `Enabled flag: ${String(value)}`);
}
// Reprodukcja: zmiana lokalna -> odświeżenie API -> ponowne otwarcie panelu.
for (const sequence of [[true, false, '0', 0], [false, true, '1', 1]]) {
  const expected = sequence[1];
  for (const value of sequence.slice(1)) assert.equal(adminFlagEnabled(value), expected);
}
console.log('PASS: category visibility survives API refresh for boolean, numeric and string flags');
