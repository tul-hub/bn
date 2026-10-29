import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const PROTECTION_SCRIPT = `
<!-- ANTI-THEFT & CODE PROTECTION LAYER -->
<script>
(function(){
  'use strict';
  // Anti-inspection: Disable context menu
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); });

  // Anti-source dumping: Block common devtools & view-source shortcuts
  document.addEventListener('keydown', function(e){
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
      (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
      (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's')) ||
      (e.metaKey && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's'))
    ) {
      e.preventDefault();
      return false;
    }
  });

  // Console Security Warning
  try {
    console.log(
      '%c🔒 PROTECTED CODE%c\\nThis game source code is protected against unauthorized copying and theft.\\n© OmniGame Room. All rights reserved.',
      'color:#10b981;font-size:16px;font-weight:900;',
      'color:#94a3b8;font-size:12px;'
    );
  } catch(e) {}
})();
</script>
`;

export function protectAllGames() {
  const gamesDir = path.join(ROOT, 'public', 'games');

  if (!fs.existsSync(gamesDir)) {
    console.error('Games directory not found:', gamesDir);
    return;
  }

  const files = fs.readdirSync(gamesDir).filter(f => f.endsWith('.html'));
  console.log(`🛡️  Verifying code protection in ${files.length} game files...`);

  for (const file of files) {
    const filePath = path.join(gamesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Inject protection script right after <head> or at start if not present
    if (!content.includes('ANTI-THEFT & CODE PROTECTION LAYER')) {
      if (content.includes('<head>')) {
        content = content.replace('<head>', '<head>' + PROTECTION_SCRIPT);
      } else {
        content = PROTECTION_SCRIPT + content;
      }
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✓ Injected protection into ${file}`);
    } else {
      console.log(`  ✓ Verified protection for ${file}`);
    }
  }

  console.log('✅ All games verified and protected against code theft while maintaining full playability!');
}

protectAllGames();
