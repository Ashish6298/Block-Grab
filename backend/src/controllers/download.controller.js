const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ytdl = require('ytdl-core');
const youtubeDl = require('youtube-dl-exec');
const { extractVideoInfo } = require('../services/videoExtractor.service');
const { convertToMp3, mergeVideoAndAudio } = require('../services/audioConverter.service');
const { getDownloadsDir, getTempDir, sanitizeFilename } = require('../services/fileManager.service');
const { AppError } = require('../middleware/errorHandler');

// In-memory job state store
const jobs = {};

const getPublicJob = (job) => ({
  id: job.id,
  title: job.title,
  status: job.status,
  progress: job.progress,
  fileUrl: job.fileUrl,
  error: job.error
});

// Download helper function that tracks progress
const removeJobFiles = (job) => {
  const directories = [getTempDir(), getDownloadsDir()];
  directories.forEach((directory) => {
    fs.readdir(directory, (error, files) => {
      if (error) return;
      files
        .filter((file) => file.includes(job.id))
        .forEach((file) => fs.unlink(path.join(directory, file), () => {}));
    });
  });
};

const downloadStream = (url, destPath, onProgress, job) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;
    job.activeFile = file;

    const request = client.get(url, (response) => {
      job.activeRequest = request;
      job.activeResponse = response;
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download stream: Status Code ${response.statusCode}`));
      }

      const totalSize = parseInt(response.headers['content-length'], 10) || 0;
      let downloaded = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        file.write(chunk);
        if (totalSize > 0 && onProgress) {
          const percent = Math.round((downloaded / totalSize) * 100);
          onProgress(percent);
        }
      });

      response.on('end', () => {
        file.end();
        resolve();
      });

      response.on('error', (err) => {
        file.destroy();
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      file.destroy();
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
};

// ytdl direct download helper
const downloadYtdl = (videoUrl, options, destPath, onProgress) => {
  return new Promise((resolve, reject) => {
    const stream = ytdl(videoUrl, options);
    const file = fs.createWriteStream(destPath);

    stream.pipe(file);

    stream.on('progress', (chunkLength, downloaded, total) => {
      if (total && onProgress) {
        const percent = Math.round((downloaded / total) * 100);
        onProgress(percent);
      }
    });

    file.on('finish', () => {
      resolve();
    });

    stream.on('error', (err) => {
      file.destroy();
      fs.unlink(destPath, () => {});
      reject(err);
    });

    file.on('error', (err) => {
      file.destroy();
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
};

const downloadWithYoutubeDl = (videoUrl, flags, onProgress, job) => {
  const subprocess = youtubeDl.exec(videoUrl, {
    noPlaylist: true,
    noWarnings: true,
    newline: true,
    continue: true,
    ...flags
  });
  job.activeProcess = subprocess;

  subprocess.stderr?.on('data', (chunk) => {
    const match = chunk.toString().match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
    if (match && onProgress) {
      onProgress(Math.round(Number(match[1])));
    }
  });

  return subprocess.finally(() => {
    if (job.activeProcess === subprocess) job.activeProcess = null;
  });
};

const getVideoInfo = async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) {
      return next(new AppError('Video URL is required', 400));
    }

    const info = await extractVideoInfo(url);
    res.status(200).json({
      status: 'success',
      data: info
    });
  } catch (error) {
    next(new AppError(`Error extracting video: ${error.message}`, 500));
  }
};

const createDownloadJob = async (req, res, next) => {
  try {
    const { url, title, quality, format, downloadUrl, audioBitrate } = req.body;
    if (!url) {
      return next(new AppError('Video URL is required', 400));
    }

    const jobId = crypto.randomUUID();
    const isAudioOnly = format === 'audio';

    jobs[jobId] = {
      id: jobId,
      title: title || 'Download',
      status: 'pending',
      progress: 0,
      fileUrl: null,
      error: null,
      request: { url, title, quality, isAudioOnly, downloadUrl, audioBitrate },
      activeProcess: null,
      activeRequest: null,
      activeResponse: null,
      activeFile: null
    };

    // Respond immediately with Job ID
    res.status(202).json({
      status: 'success',
      data: {
        jobId,
        message: 'Download job started.'
      }
    });

    // Run processing asynchronously
    processDownloadAsync(jobId, url, title, quality, isAudioOnly, downloadUrl, audioBitrate).catch((err) => {
      if (jobs[jobId].status === 'paused' || jobs[jobId].status === 'cancelled') return;
      console.error(`Async download job error for ${jobId}:`, err);
      jobs[jobId].status = 'failed';
      jobs[jobId].error = err.message;
    });

  } catch (error) {
    next(new AppError(`Failed to start download job: ${error.message}`, 500));
  }
};

const processDownloadAsync = async (jobId, videoUrl, title, quality, isAudioOnly, directDownloadUrl, audioBitrate = 192) => {
  const job = jobs[jobId];
  if (!job || job.status === 'cancelled') return;
  job.status = 'downloading';
  job.progress = Math.max(job.progress || 0, 5);

  const safeTitle = sanitizeFilename(title || 'video');
  const tempDir = getTempDir();
  const downloadsDir = getDownloadsDir();

  // Direct media URLs are downloaded as source media, then converted if needed.
  if (directDownloadUrl && (directDownloadUrl.startsWith('http://') || directDownloadUrl.startsWith('https://'))) {
    const ext = isAudioOnly ? 'mp3' : 'mp4';
    const tempFile = path.join(tempDir, `${jobId}_source.media`);
    const finalFile = path.join(downloadsDir, `${safeTitle}_${quality || 'download'}.${ext}`);

    console.log(`Downloading direct stream: ${directDownloadUrl}`);
    await downloadStream(directDownloadUrl, tempFile, (percent) => {
      job.progress = Math.round(5 + (percent * 0.85)); // 5% to 90%
    }, job);

    if (job.status === 'cancelled') return;

    job.status = 'processing';
    job.progress = 92;

    if (isAudioOnly) {
      await convertToMp3(tempFile, finalFile, audioBitrate);
    } else {
      fs.copyFileSync(tempFile, finalFile);
    }

    // Clean up temp
    fs.unlink(tempFile, () => {});

    job.fileUrl = `/downloads/${path.basename(finalFile)}`;
    job.progress = 100;
    job.status = 'completed';
    return;
  }

  // Otherwise treat as a YouTube URL
  const isYouTube = ytdl.validateURL(videoUrl);
  if (isYouTube) {
    const ext = isAudioOnly ? 'mp3' : 'mp4';
    const finalFile = path.join(downloadsDir, `${safeTitle}_${quality || 'youtube'}_${jobId.slice(0, 8)}.${ext}`);

    if (isAudioOnly) {
      await downloadWithYoutubeDl(videoUrl, {
        format: 'bestaudio/best',
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: `${Math.min(320, Math.max(64, Number(audioBitrate) || 192))}K`,
        output: finalFile
      }, (percent) => {
        job.progress = Math.round(5 + (percent * 0.85));
      }, job);
      if (job.status === 'cancelled' || job.status === 'paused') return;
      job.status = 'processing';
      job.progress = 98;
    } else {
      const requestedHeight = parseInt(quality, 10) || 1080;
      await downloadWithYoutubeDl(videoUrl, {
        format: `bestvideo[height<=${requestedHeight}][ext=mp4]+bestaudio/best[height<=${requestedHeight}][ext=mp4]`,
        mergeOutputFormat: 'mp4',
        output: finalFile
      }, (percent) => {
        job.progress = Math.round(5 + (percent * 0.90));
      }, job);
      if (job.status === 'cancelled' || job.status === 'paused') return;
      job.status = 'processing';
      job.progress = 98;
    }

    job.fileUrl = `/downloads/${path.basename(finalFile)}`;
    job.progress = 100;
    job.status = 'completed';
  } else {
    throw new Error('This page does not expose a downloadable media URL.');
  }
};

const getJobStatus = (req, res, next) => {
  const { jobId } = req.params;
  const job = jobs[jobId];

  if (!job) {
    return next(new AppError('Job not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: getPublicJob(job)
  });
};

const pauseDownloadJob = (req, res, next) => {
  const job = jobs[req.params.jobId];
  if (!job) return next(new AppError('Job not found', 404));
  if (job.status !== 'downloading') {
    return next(new AppError('Only an active download can be paused', 409));
  }

  if (job.activeResponse) {
    job.activeResponse.pause();
    job.status = 'paused';
  } else if (job.activeProcess) {
    job.status = 'paused';
    job.activeProcess.kill();
  } else {
    return next(new AppError('This download cannot be paused right now', 409));
  }

  res.status(200).json({ status: 'success', data: getPublicJob(job) });
};

const resumeDownloadJob = (req, res, next) => {
  const job = jobs[req.params.jobId];
  if (!job) return next(new AppError('Job not found', 404));
  if (job.status !== 'paused') {
    return next(new AppError('Job is not paused', 409));
  }

  if (job.activeResponse) {
    job.status = 'downloading';
    job.activeResponse.resume();
  } else {
    const request = job.request;
    job.status = 'pending';
    processDownloadAsync(
      job.id,
      request.url,
      request.title,
      request.quality,
      request.isAudioOnly,
      request.downloadUrl,
      request.audioBitrate
    ).catch((error) => {
      if (job.status === 'paused' || job.status === 'cancelled') return;
      job.status = 'failed';
      job.error = error.message;
    });
  }

  res.status(200).json({ status: 'success', data: getPublicJob(job) });
};

const cancelDownloadJob = (req, res, next) => {
  const job = jobs[req.params.jobId];
  if (!job) return next(new AppError('Job not found', 404));
  if (['completed', 'failed', 'cancelled'].includes(job.status)) {
    return next(new AppError('Job can no longer be cancelled', 409));
  }

  job.status = 'cancelled';
  job.error = null;
  job.activeProcess?.kill();
  job.activeRequest?.destroy();
  job.activeResponse?.destroy();
  job.activeFile?.destroy();
  removeJobFiles(job);

  res.status(200).json({ status: 'success', data: getPublicJob(job) });
};

module.exports = {
  getVideoInfo,
  createDownloadJob,
  getJobStatus,
  pauseDownloadJob,
  resumeDownloadJob,
  cancelDownloadJob
};
