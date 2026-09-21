import fs from 'fs';
import path from 'path';

function rewrite(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      rewrite(p);
    } else {
      const buf = fs.readFileSync(p);
      fs.unlinkSync(p);
      fs.writeFileSync(p, buf);
    }
  }
}

rewrite('android/app/src/main/assets/public');
console.log('Assets successfully rewritten as regular files.');
