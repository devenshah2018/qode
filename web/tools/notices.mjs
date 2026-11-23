import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const notices = [
  'Qode playground — third-party runtime licenses',
  'Qode source is distributed under its repository GPL-2.0 license.',
  '',
];
notices.push(fs.readFileSync(path.join(root, '../docs/TOOLCHAIN-LICENSES.txt'), 'utf8'));
for (const [location, metadata] of Object.entries(lock.packages)) {
  if (!location || metadata.dev) continue;
  const directory = path.join(root, location);
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  const files = fs
    .readdirSync(directory)
    .filter((name) => /^(licen[sc]e|copying|ofl)(\.|$)/i.test(name));
  if (!files.length) throw new Error(`Missing runtime license: ${pkg.name}`);
  notices.push(`=== ${pkg.name} ${pkg.version} (${pkg.license ?? 'see license'}) ===`);
  for (const file of files) notices.push(fs.readFileSync(path.join(directory, file), 'utf8'));
}
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.writeFileSync(path.join(root, 'public/THIRD_PARTY_NOTICES.txt'), notices.join('\n\n') + '\n');
fs.copyFileSync(path.join(root, '../LICENSE'), path.join(root, 'public/LICENSE.txt'));
