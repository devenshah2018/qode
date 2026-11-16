import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const create = (await import(pathToFileURL(path.join(root, 'build/wasm/qode.js')).href)).default;
const m = await create({ wasmBinary: fs.readFileSync(path.join(root, 'build/wasm/qode.wasm')) });
const call = (name, types, args) => m.ccall(`qode_web_${name}`, 'number', types, args);
function json(name, types, args) { const p = call(name, types, args); assert(p); try { return JSON.parse(m.UTF8ToString(p)); } finally { m._free(p); } }
const sources = fs.readdirSync(path.join(root, 'examples')).filter(p => p.endsWith('.qc')).map(p => fs.readFileSync(path.join(root, 'examples', p), 'utf8'));
sources.push('qubit a;qubit b;bit x;bit y;h a;measure a->x;if x==1{x b;}measure b->y;');
let cases = 0;
for (const source of sources) for (const seed of ['0', '42', '18446744073709551615']) {
  const out = m._malloc(4);
  const compiled = json('compile', ['string', 'string', 'number'], [source, seed, out]); assert(compiled.ok);
  const session = m.getValue(out, '*'); m._free(out);
  try {
    let status; do { status = call('step', ['number'], [session]); assert(status <= 1); } while (status === 0);
    const actual = json('state', ['number'], [session]);
    const native = spawnSync(path.join(root, 'build/native/qode'), ['run', '-', '--json', '--seed', seed], { input: source, encoding: 'utf8' }); assert.equal(native.status, 0, native.stderr);
    const expected = JSON.parse(native.stdout);
    assert.deepEqual(actual.bits, expected.bits);
    for (const amplitude of actual.amplitudes) {
      const e = expected.amplitudes.find(a => a.basis === amplitude.basis); assert(e);
      for (const key of ['re', 'im', 'probability']) assert(Math.abs(e[key] - amplitude[key]) < 1e-10);
    }
    if (/\bmeasure\s+\w+\s*->/.test(source)) {
      const a = json('sample', ['number', 'number', 'string'], [session, 4096, seed]);
      const b = spawnSync(path.join(root, 'build/native/qode'), ['sample', '-', '--json', '--shots', '4096', '--seed', seed], { input: source, encoding: 'utf8' }); assert.equal(b.status, 0, b.stderr);
      assert.deepEqual(a, JSON.parse(b.stdout));
    }
    cases++;
  } finally { call('destroy', ['number'], [session]); }
}
console.log(`Native/WebAssembly parity passed: ${cases} seeded circuit cases`);
