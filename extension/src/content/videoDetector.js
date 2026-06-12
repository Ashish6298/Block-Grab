import { downloaderApi } from '../services/downloaderApi';

export const videoDetector = {
  onDetected: null,
  lastSignature: '',
  scanTimer: null,
  requestToken: 0,

  init(callback) {
    this.onDetected = callback;
    this.scheduleScan(250);
    this.setupListeners();
  },

  scheduleScan(delay = 0) {
    clearTimeout(this.scanTimer);
    this.scanTimer = setTimeout(() => this.scanForVideos(), delay);
  },

  async scanForVideos() {
    const hostname = window.location.hostname;

    if (hostname === 'youtu.be' || hostname.endsWith('youtube.com')) {
      const urlParams = new URLSearchParams(window.location.search);
      const pathVideoId = hostname === 'youtu.be' ? window.location.pathname.slice(1) : '';
      const videoId = urlParams.get('v') || pathVideoId;
      
      if (videoId) {
        const player = document.querySelector('video');
        const title =
          document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent?.trim() ||
          document.querySelector('meta[name="title"]')?.content ||
          document.title.replace(/\s*-\s*YouTube\s*$/, '') ||
          'YouTube video';

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const requestToken = ++this.requestToken;
        const baseDetails = {
          title,
          url: videoUrl,
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          source: 'youtube',
          isPlaying: Boolean(player && !player.paused),
          formats: [],
          formatsLoading: true
        };

        this.notify(baseDetails, true);
        try {
          const extracted = await downloaderApi.fetchVideoInfo(videoUrl);
          if (requestToken !== this.requestToken) return;
          this.notify({
            ...baseDetails,
            ...extracted,
            source: 'youtube',
            formatsLoading: false
          }, true);
        } catch (error) {
          if (requestToken !== this.requestToken) return;
          this.notify({
            ...baseDetails,
            formatsLoading: false,
            formatsError: error.message || 'Could not load available formats.'
          }, true);
        }
        return;
      }
    }

    const videos = document.querySelectorAll('video');
    for (const video of videos) {
      if (video.src || video.querySelector('source')) {
        this.handleGenericVideo(video);
      }
    }
  },

  async handleGenericVideo(videoElement) {
    const src = videoElement.src || videoElement.querySelector('source')?.src;
    if (!src || src.startsWith('blob:')) return;

    const requestToken = ++this.requestToken;
    const details = {
      title: document.title || 'Web Video',
      url: src,
      thumbnail: videoElement.poster || '',
      source: 'direct',
      formats: [],
      formatsLoading: true
    };

    this.notify(details, true);
    try {
      const extracted = await downloaderApi.fetchVideoInfo(src);
      if (requestToken !== this.requestToken) return;
      this.notify({
        ...details,
        ...extracted,
        source: 'direct',
        formatsLoading: false
      }, true);
    } catch (error) {
      if (requestToken !== this.requestToken) return;
      this.notify({
        ...details,
        formatsLoading: false,
        formatsError: error.message || 'Could not load available formats.'
      }, true);
    }
  },

  setupListeners() {
    document.addEventListener('play', (e) => {
      if (e.target && e.target.tagName === 'VIDEO') {
        this.scheduleScan(100);
      }
    }, true);

    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        this.lastSignature = '';
        this.scheduleScan(500);
      }
    }).observe(document, { subtree: true, childList: true });

    window.addEventListener('yt-navigate-finish', () => {
      this.lastSignature = '';
      this.scheduleScan(300);
    });
  },

  notify(videoDetails, force = false) {
    const signature = `${videoDetails.url}|${videoDetails.title}`;
    if (!force && signature === this.lastSignature && document.getElementById('adshield-download-root')) return;
    this.lastSignature = signature;
    this.onDetected?.(videoDetails);
  }
};
