const fs = require('fs');
const path = require('path');

const copyFileSync = (src, dest) => {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
};

const copyDirSync = (src, dest) => {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  console.log(`Copied Directory: ${src} -> ${dest}`);
};

// Files to copy
copyFileSync('manifest.json', 'dist/manifest.json');
copyFileSync('src/adblock/rules.json', 'dist/src/adblock/rules.json');
copyFileSync('src/adblock/cosmeticFilters.css', 'dist/src/adblock/cosmeticFilters.css');
copyDirSync('src/assets/icons', 'dist/src/assets/icons');

console.log('Post-build assets copy finished!');
