// A lint that needs no extra dependencies: every source file must parse.
import { readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });

const files = [...walk('src'), ...walk('test'), ...walk('scripts')];
for (const f of files) execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' });
console.log(`syntax ok (${files.length} files)`);
