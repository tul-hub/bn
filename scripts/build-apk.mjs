import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const scriptPath = path.join(__dirname, 'make_apk.py');

console.log('🚀 Running APK builder in project root directory...');

const proc = spawn('python3', [scriptPath], {
  cwd: ROOT,
  stdio: 'inherit'
});

proc.on('close', (code) => {
  if (code === 0) {
    const apkPath = path.join(ROOT, 'omnigame-room.apk');
    if (fs.existsSync(apkPath)) {
      const stats = fs.statSync(apkPath);
      console.log(`🎉 APK creation verified!`);
      console.log(`📍 Location: ${apkPath}`);
      console.log(`📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);
    } else {
      console.error('❌ Error: APK file was not found after builder completed');
      process.exit(1);
    }
  } else {
    console.error(`❌ APK generation failed with exit code ${code}`);
    process.exit(code || 1);
  }
});
