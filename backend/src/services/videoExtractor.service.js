const ytdl = require('ytdl-core');
const youtubeDl = require('youtube-dl-exec');

const AUDIO_BITRATES = [320, 256, 192, 128];

const getAudioOptions = (durationSeconds = 0) => AUDIO_BITRATES.map((bitrate) => ({
  quality: `${bitrate}kbps`,
  label: bitrate >= 256 ? 'High quality MP3' : bitrate === 192 ? 'Balanced MP3' : 'Smaller MP3',
  container: 'mp3',
  mimeType: 'audio/mpeg',
  hasVideo: false,
  hasAudio: true,
  audioBitrate: bitrate,
  contentLength: durationSeconds ? Math.round((durationSeconds * bitrate * 1000) / 8) : null
}));

const extractVideoInfo = async (videoUrl) => {
  try {
    const isYouTube = ytdl.validateURL(videoUrl);

    if (isYouTube) {
      const info = await youtubeDl(videoUrl, {
        dumpSingleJson: true,
        noWarnings: true,
        noPlaylist: true,
        skipDownload: true
      });
      const qualities = new Map();
      const duration = Number(info.duration) || 0;
      const audioCandidates = info.formats.filter((format) =>
        format.acodec !== 'none' &&
        format.vcodec === 'none' &&
        (format.filesize || format.filesize_approx)
      );
      const bestAudioSize = audioCandidates.reduce((largest, format) => {
        return Math.max(largest, Number(format.filesize || format.filesize_approx) || 0);
      }, 0);

      info.formats
        .filter((format) => format.vcodec !== 'none' && format.height && format.ext === 'mp4')
        .forEach((format) => {
          const existing = qualities.get(format.height);
          const candidate = {
            quality: `${format.height}p`,
            label: format.format_note || `${format.height}p`,
            container: 'mp4',
            mimeType: 'video/mp4',
            hasVideo: true,
            hasAudio: format.acodec !== 'none',
            width: format.width,
            height: format.height,
            fps: format.fps || null,
            contentLength: (Number(format.filesize || format.filesize_approx) || 0) +
              (format.acodec === 'none' ? bestAudioSize : 0)
          };

          if (!existing || (!existing.hasAudio && candidate.hasAudio) || (candidate.fps || 0) > (existing.fps || 0)) {
            qualities.set(format.height, candidate);
          }
        });

      const videoFormats = [...qualities.values()].sort((a, b) => b.height - a.height);
      if (!videoFormats.length) {
        throw new Error('No downloadable video qualities were returned by YouTube.');
      }

      return {
        title: info.title || 'YouTube Video',
        url: videoUrl,
        thumbnail: info.thumbnail || '',
        source: 'youtube',
        duration,
        formats: [...videoFormats, ...getAudioOptions(duration)]
      };
    }

    // Direct video link or generic site
    if (videoUrl.match(/\.(mp4|webm|ogv|mov|mkv)(\?.*)?$/i)) {
      const filename = videoUrl.split('/').pop().split('?')[0] || 'Direct Video';
      return {
        title: filename,
        url: videoUrl,
        thumbnail: '',
        source: 'direct',
        formats: [
          {
            url: videoUrl,
            mimeType: 'video/mp4',
            quality: 'Source Quality',
            container: 'mp4',
            hasVideo: true,
            hasAudio: true,
            contentLength: null
          },
          ...getAudioOptions().map((format) => ({ ...format, url: videoUrl }))
        ]
      };
    }

    throw new Error('This page does not expose a supported media URL.');
  } catch (error) {
    console.error('Extraction error:', error);
    throw error;
  }
};

module.exports = {
  extractVideoInfo
};
