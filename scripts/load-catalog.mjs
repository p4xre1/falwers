/**
 * Loads the live catalog defaults (public/assets/js/data.js) inside a Node vm
 * so generators always read the REAL products/colors/tiers — no duplication.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadCatalog() {
  const code = fs.readFileSync(path.join(ROOT, 'public/assets/js/data.js'), 'utf8');
  const ctx = vm.createContext({ window: {}, console, setTimeout, clearTimeout });
  vm.runInContext(code, ctx, { filename: 'data.js' });
  // normalize through migrate() so computed fields (slugs, tangier-only zones) exist
  vm.runInContext('S = migrate(defaultState())', ctx, { filename: 'data.js#migrate' });
  return { S: ctx.S, defaultState: ctx.defaultState, slugify: ctx.slugify };
}
export { ROOT };
