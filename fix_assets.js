import fs from 'fs';
import path from 'path';
import os from 'os';

function rewrite(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      rewrite(p);
    } else {
      try {
        const buf = fs.readFileSync(p);
        fs.unlinkSync(p);
        fs.writeFileSync(p, buf);
      } catch (e) {
        console.warn('rewrite error for', p, e.message);
      }
    }
  }
}

rewrite('android/app/src/main/assets');

const tempDir = path.join(os.tmpdir(), 'animex_android_assets');
try {
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.cpSync('android/app/src/main/assets', tempDir, { recursive: true });
  console.log('Assets synced to temp dir:', tempDir);
} catch (e) {
  console.warn('Temp sync error:', e.message);
}

console.log('Assets successfully rewritten as regular files.');

