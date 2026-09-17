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
// Normalizacja odpowiedzi API nie może zmieniać cen, identyfikatorów ani pustych pól.
const { spawnSync } = require('node:child_process');
const fields = ['is_published', 'is_required', 'is_default', 'is_customer_configurable',
  'customer_supplied_allowed', 'customer_part_allowed', 'is_active', 'paint_available', 'is_recommended'];
const values = [false, 0, '0', true, 1, '1'];
const rows = values.map(value => ({ ...Object.fromEntries(fields.map(field => [field, value])),
  id: '0', price: '0.00', description: null }));
rows.push({ id: 99 });
const php = spawnSync('php', ['-r',
  'require $argv[1]; $data = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR); echo json_encode(normalizeAdminFlags($data["rows"], $data["fields"]), JSON_THROW_ON_ERROR);',
  path.join(root, 'apps/api/src/AdminService.php')], {
  input: JSON.stringify({ rows, fields }), encoding: 'utf8',
});
assert.equal(php.status, 0, php.stderr);
const result = JSON.parse(php.stdout);
for (let i = 0; i < values.length; i++) {
  for (const field of fields) assert.equal(result[i][field], adminFlagEnabled(values[i]));
  assert.equal(result[i].id, '0');
  assert.equal(result[i].price, '0.00');
  assert.equal(result[i].description, null);
}
assert.deepEqual(result.at(-1), { id: 99 });
console.log('PASS: all admin flags preserve enabled/disabled states across frontend and API refresh; unrelated fields unchanged');
