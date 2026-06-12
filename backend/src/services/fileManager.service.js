const fs = require('fs');
const os = require('os');
const path = require('path');

const DOWNLOADS_DIR = path.join(os.tmpdir(), 'adshield-downloads');
const TEMP_DIR = path.join(__dirname, '../../temp');

// Ensure directories exist
const initDirs = () => {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
};

const getDownloadsDir = () => DOWNLOADS_DIR;
const getTempDir = () => TEMP_DIR;

// Generate safe filename
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
};

// Periodic clean-up task (removes files older than 1 hour)
const startCleanupTask = () => {
  setInterval(() => {
    const now = Date.now();
    const directories = [DOWNLOADS_DIR, TEMP_DIR];

    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) return;

      fs.readdir(dir, (err, files) => {
        if (err) return console.error(`Failed to read directory: ${dir}`, err);

        files.forEach((file) => {
          const filePath = path.join(dir, file);
          fs.stat(filePath, (err, stats) => {
            if (err) return;

            const ageMs = now - stats.mtimeMs;
            if (ageMs > 60 * 60 * 1000) { // 1 hour
              fs.unlink(filePath, (unlinkErr) => {
                if (!unlinkErr) {
                  console.log(`Cleaned up old file: ${filePath}`);
                }
              });
            }
          });
        });
      });
    });
  }, 15 * 60 * 1000); // run every 15 mins
};

module.exports = {
  initDirs,
  getDownloadsDir,
  getTempDir,
  sanitizeFilename,
  startCleanupTask
};
