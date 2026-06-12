let ffmpegPath = null;
try {
  ffmpegPath = require('@ffmpeg-installer/ffmpeg');
} catch (e) {
  console.log('@ffmpeg-installer/ffmpeg not installed. Using system ffmpeg if available.');
}
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

try {
  if (ffmpegPath && ffmpegPath.path) {
    ffmpeg.setFfmpegPath(ffmpegPath.path);
  }
} catch (e) {
  console.warn('ffmpeg installer path not set. Ffmpeg must be installed globally on PATH.');
}

/**
 * Converts a video or audio input file to MP3 format.
 * Requires ffmpeg so the output is always a valid MP3.
 */
const convertToMp3 = (inputPath, outputPath, bitrate = 192) => {
  return new Promise((resolve, reject) => {
    // Check if ffmpeg is available and working
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioBitrate(Math.min(320, Math.max(64, Number(bitrate) || 192)))
      .on('end', () => {
        console.log(`Audio conversion completed: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(new Error(`MP3 conversion failed: ${err.message}`));
      })
      .save(outputPath);
  });
};

/**
 * Merges a video stream file and audio stream file into a single output file.
 */
const mergeVideoAndAudio = (videoPath, audioPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions('-c:v copy')
      .outputOptions('-c:a aac')
      .on('end', () => {
        console.log(`Merge completed: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(new Error(`Video and audio merge failed: ${err.message}`));
      })
      .save(outputPath);
  });
};

module.exports = {
  convertToMp3,
  mergeVideoAndAudio
};
