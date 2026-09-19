import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(import.meta.dirname, '..', 'tests');
const files = fs.readdirSync(dir).filter(f => f.startsWith('test-') && f.endsWith('.mjs')).sort();
let pass = 0, fail = 0, bad = [];
for (const f of files) {
  try {
    const out = execFileSync('node', [path.join(dir, f)], { encoding: 'utf8', timeout: 600000 });
    const p = (out.match(/^PASS/gm) || []).length;
    const fl = (out.match(/^FAIL/gm) || []).length;
    pass += p; fail += fl;
    if (fl || !p) bad.push(f);
    console.log((fl ? '✗ ' : '✓ ') + f.replace(/^test-|\.mjs$/g, '') + '  ' + p + ' pass / ' + fl + ' fail');
  } catch (e) {
    fail++; bad.push(f);
    console.log('✗ ' + f + '  CRASHED');
  }
}
console.log('\nTOTAL: ' + pass + ' pass / ' + fail + ' fail' + (bad.length ? '  [' + bad.join(', ') + ']' : '  — ALL GREEN'));
process.exit(fail ? 1 : 0);
