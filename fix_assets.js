import { execSync } from 'child_process';
import fs from 'fs';

try {
  execSync(`powershell -Command "Remove-Item -Recurse -Force 'android/app/src/main/assets/public' -ErrorAction SilentlyContinue; New-Item -ItemType Directory -Force 'android/app/src/main/assets/public' | Out-Null; Copy-Item -Recurse -Force 'dist/*' 'android/app/src/main/assets/public/'"`, { stdio: 'inherit' });
  console.log('Assets successfully rewritten as regular files.');
} catch (e) {
  console.error('fix_assets error:', e);
}

