import { downloaderApi } from '../services/downloaderApi';

const DOWNLOAD_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 20h14"/>
  </svg>
`;

const formatBytes = (bytes) => {
  if (!bytes) return 'Size unavailable';
  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 1024
    ? `${(megabytes / 1024).toFixed(1)} GB`
    : `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
};

export const floatingDownloadButton = {
  host: null,
  shadow: null,
  launcher: null,
  panel: null,
  videoData: null,
  pollTimer: null,
  selectedFormat: 'video',
  selectedQuality: '',
  selectedAudioBitrate: 192,
  activeJobId: null,

  inject(videoData) {
    this.videoData = videoData;
    const videoFormats = videoData.formats?.filter((format) => format.hasVideo) || [];
    const audioFormats = videoData.formats?.filter((format) => !format.hasVideo && format.hasAudio) || [];
    if (!videoFormats.some((format) => format.quality === this.selectedQuality)) {
      this.selectedQuality = videoFormats[0]?.quality || '';
    }
    if (!audioFormats.some((format) => Number(format.audioBitrate) === this.selectedAudioBitrate)) {
      this.selectedAudioBitrate = Number(audioFormats[0]?.audioBitrate) || 192;
    }

    if (!this.host || !document.documentElement.contains(this.host)) {
      this.create();
    }

    this.renderPanel();
    this.launcher.classList.add('visible');
  },

  create() {
    document.getElementById('adshield-download-root')?.remove();
    this.host = document.createElement('div');
    this.host.id = 'adshield-download-root';
    this.host.style.cssText = 'all:initial;position:fixed;right:22px;bottom:88px;z-index:2147483647;';
    this.shadow = this.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      * { box-sizing: border-box; }
      .launcher, .panel, button, select, a { font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
      .launcher {
        width: 58px;
        height: 58px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(255,255,255,.24);
        border-radius: 18px;
        color: white;
        background: linear-gradient(145deg, #8c7df8, #5d4fd5);
        box-shadow: 0 15px 38px rgba(45,36,120,.48), inset 0 1px rgba(255,255,255,.25);
        cursor: pointer;
        opacity: 0;
        transform: translateY(14px) scale(.88);
        transition: opacity .25s, transform .25s, filter .2s;
      }
      .launcher.visible { opacity: 1; transform: translateY(0) scale(1); animation: arrive .45s ease-out; }
      .launcher:hover { filter: brightness(1.1); transform: translateY(-2px) scale(1.03); }
      .launcher svg { width: 26px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .launcher::after {
        content: "VIDEO";
        position: absolute;
        top: -8px;
        right: -9px;
        padding: 3px 6px;
        border: 2px solid #11162a;
        border-radius: 99px;
        color: #09251c;
        background: #53ddb1;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .5px;
      }
      .panel {
        position: fixed;
        top: 50%;
        left: 50%;
        width: min(430px, calc(100vw - 32px));
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        border: 1px solid rgba(255,255,255,.11);
        border-radius: 20px;
        color: #f3f5ff;
        background: rgba(13,17,31,.97);
        box-shadow: 0 24px 70px rgba(0,0,0,.5);
        backdrop-filter: blur(20px);
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, -46%) scale(.96);
        transform-origin: center;
        transition: .2s ease;
      }
      .panel.open { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%) scale(1); }
      .panel-head { position: relative; padding: 20px; background: linear-gradient(135deg, rgba(124,109,242,.3), rgba(18,23,41,.5)); cursor: grab; user-select: none; touch-action: none; }
      .panel-head.dragging { cursor: grabbing; }
      .eyebrow { color: #9e94ff; font-size: 9px; font-weight: 900; letter-spacing: .8px; text-transform: uppercase; }
      .title { max-width: 350px; margin: 7px 0 0; overflow: hidden; color: white; font-size: 16px; font-weight: 750; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
      .close { position: absolute; top: 13px; right: 13px; width: 29px; height: 29px; border: 1px solid rgba(255,255,255,.08); border-radius: 9px; color: #9ba4ba; background: rgba(255,255,255,.04); cursor: pointer; }
      .content { display: flex; flex-direction: column; gap: 15px; padding: 18px; }
      .format { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .format button { min-height: 54px; padding: 10px; border: 1px solid rgba(255,255,255,.08); border-radius: 13px; color: #98a2ba; background: rgba(255,255,255,.025); font-size: 11px; font-weight: 800; cursor: pointer; transition: .18s; }
      .format button:hover { border-color: rgba(151,137,255,.45); background: rgba(124,109,242,.09); }
      .format button.active { color: white; border-color: rgba(151,137,255,.65); background: linear-gradient(135deg, rgba(124,109,242,.32), rgba(98,82,217,.18)); }
      label { color: #8791aa; font-size: 9px; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; }
      select { width: 100%; margin-top: 8px; padding: 13px; border: 1px solid rgba(151,137,255,.28); border-radius: 12px; outline: none; color: white; background: #191f35; font-size: 12px; cursor: pointer; }
      select:hover, select:focus { border-color: #8f80f7; box-shadow: 0 0 0 3px rgba(124,109,242,.12); }
      .selection-info { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 12px; border: 1px solid rgba(255,255,255,.07); border-radius: 11px; background: rgba(255,255,255,.025); }
      .selection-info span { color: #909ab2; font-size: 10px; }
      .selection-info strong { color: #dcd8ff; font-size: 11px; }
      .audio-note { padding: 12px; border: 1px solid rgba(83,221,177,.12); border-radius: 11px; color: #a9b3c9; background: rgba(83,221,177,.055); font-size: 11px; line-height: 1.45; }
      .loading { padding: 22px 12px; color: #aab3c8; font-size: 11px; line-height: 1.5; text-align: center; }
      .spinner { width: 24px; height: 24px; margin: 0 auto 11px; border: 3px solid rgba(255,255,255,.1); border-top-color: #9283ff; border-radius: 50%; animation: spin .8s linear infinite; }
      .primary, .save {
        width: 100%;
        min-height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 0;
        border-radius: 11px;
        color: white;
        background: linear-gradient(135deg, #8b7cf6, #6252d9);
        box-shadow: 0 8px 20px rgba(98,82,217,.25);
        font-size: 11px;
        font-weight: 850;
        text-decoration: none;
        cursor: pointer;
      }
      .primary svg, .save svg { width: 17px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .progress { padding: 12px; border: 1px solid rgba(255,255,255,.07); border-radius: 12px; background: rgba(255,255,255,.025); }
      .progress-copy { display: flex; justify-content: space-between; color: #b3bad0; font-size: 10px; }
      .track { height: 7px; margin-top: 9px; overflow: hidden; border-radius: 99px; background: rgba(255,255,255,.07); }
      .track span { display: block; width: 0; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #6e5ee4, #a396ff); transition: width .3s; }
      .message { color: #aab3c8; font-size: 10px; line-height: 1.45; text-align: center; }
      .message.error { color: #ff9bad; }
      .job-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
      .job-button { min-height: 38px; border: 1px solid rgba(255,255,255,.09); border-radius: 10px; color: #d9dded; background: rgba(255,255,255,.045); font-size: 10px; font-weight: 800; cursor: pointer; }
      .job-button:hover { background: rgba(255,255,255,.09); }
      .job-button.cancel { color: #ff9bad; border-color: rgba(255,102,127,.2); background: rgba(255,102,127,.07); }
      .job-button:disabled { opacity: .45; cursor: not-allowed; }
      @keyframes arrive { 0% { transform: translateY(14px) scale(.75); } 65% { transform: translateY(-4px) scale(1.06); } 100% { transform: none; } }
      @keyframes spin { to { transform: rotate(360deg); } }
    `;

    this.launcher = document.createElement('button');
    this.launcher.className = 'launcher';
    this.launcher.title = 'Download this video';
    this.launcher.setAttribute('aria-label', 'Open video download options');
    this.launcher.innerHTML = DOWNLOAD_ICON;

    this.panel = document.createElement('section');
    this.panel.className = 'panel';

    this.shadow.append(style, this.panel, this.launcher);
    document.documentElement.appendChild(this.host);

    this.launcher.addEventListener('click', () => {
      this.panel.classList.toggle('open');
    });
  },

  renderPanel() {
    if (!this.panel || !this.videoData) return;
    this.panel.replaceChildren();

    const head = document.createElement('header');
    head.className = 'panel-head';
    const eyebrow = document.createElement('div');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = this.videoData.source === 'youtube' ? 'YouTube video detected' : 'Playable video detected';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = this.videoData.title;
    const close = document.createElement('button');
    close.className = 'close';
    close.textContent = '×';
    close.addEventListener('click', () => this.panel.classList.remove('open'));
    head.append(eyebrow, title, close);
    this.setupPanelDrag(head);

    const content = document.createElement('div');
    content.className = 'content';

    if (this.videoData.formatsLoading) {
      const loading = document.createElement('div');
      loading.className = 'loading';
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      const message = document.createElement('div');
      message.textContent = 'Checking available video and audio formats...';
      loading.append(spinner, message);
      content.appendChild(loading);
      this.panel.append(head, content);
      return;
    }

    if (this.videoData.formatsError || !this.videoData.formats?.length) {
      const error = document.createElement('div');
      error.className = 'message error';
      error.textContent = this.videoData.formatsError || 'No downloadable formats are available for this video.';
      content.appendChild(error);
      this.panel.append(head, content);
      return;
    }

    const videoFormats = this.videoData.formats.filter((item) => item.hasVideo);
    const audioFormats = this.videoData.formats.filter((item) => !item.hasVideo && item.hasAudio);
    const format = document.createElement('div');
    format.className = 'format';
    const videoButton = document.createElement('button');
    videoButton.textContent = 'Video (MP4)';
    videoButton.className = this.selectedFormat === 'video' ? 'active' : '';
    const audioButton = document.createElement('button');
    audioButton.textContent = 'Audio (MP3)';
    audioButton.className = this.selectedFormat === 'audio' ? 'active' : '';
    videoButton.addEventListener('click', () => {
      this.selectedFormat = 'video';
      this.renderPanel();
    });
    audioButton.addEventListener('click', () => {
      this.selectedFormat = 'audio';
      this.renderPanel();
    });
    format.append(videoButton, audioButton);
    content.append(format);

    if (this.selectedFormat === 'video' && videoFormats.length) {
      const field = document.createElement('label');
      field.textContent = 'Available video quality';
      const select = document.createElement('select');
      videoFormats.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.quality;
        const fps = item.fps && item.fps > 30 ? `, ${item.fps}fps` : '';
        option.textContent = `${item.quality}${fps} + audio (${formatBytes(item.contentLength)})`;
        option.selected = item.quality === this.selectedQuality;
        select.appendChild(option);
      });
      select.addEventListener('change', () => {
        this.selectedQuality = select.value;
        this.renderPanel();
      });
      field.appendChild(select);
      content.appendChild(field);
      const selected = videoFormats.find((item) => item.quality === this.selectedQuality) || videoFormats[0];
      content.appendChild(this.createSelectionInfo(
        `${selected.quality} video with audio`,
        `Estimated ${formatBytes(selected.contentLength)}`
      ));
    } else if (this.selectedFormat === 'audio' && audioFormats.length) {
      const field = document.createElement('label');
      field.textContent = 'MP3 audio quality';
      const select = document.createElement('select');
      audioFormats.forEach((item) => {
        const option = document.createElement('option');
        option.value = String(item.audioBitrate || parseInt(item.quality, 10));
        option.textContent = `${item.quality}${item.label ? ` - ${item.label}` : ''}`;
        option.selected = Number(option.value) === this.selectedAudioBitrate;
        select.appendChild(option);
      });
      select.addEventListener('change', () => {
        this.selectedAudioBitrate = Number(select.value);
        this.renderPanel();
      });
      field.appendChild(select);
      content.appendChild(field);

      const note = document.createElement('div');
      note.className = 'audio-note';
      note.textContent = 'The audio track will be extracted and converted to an MP3 file.';
      content.appendChild(note);
      const selected = audioFormats.find((item) => Number(item.audioBitrate) === this.selectedAudioBitrate) || audioFormats[0];
      content.appendChild(this.createSelectionInfo(
        `${selected.quality} MP3 audio`,
        `Estimated ${formatBytes(selected.contentLength)}`
      ));
    }

    const action = document.createElement('div');
    action.id = 'action';
    const start = document.createElement('button');
    start.className = 'primary';
    start.innerHTML = `${DOWNLOAD_ICON}<span>Start download</span>`;
    start.addEventListener('click', () => this.startDownload(action));
    action.appendChild(start);
    content.appendChild(action);
    this.panel.append(head, content);
  },

  createSelectionInfo(label, size) {
    const info = document.createElement('div');
    info.className = 'selection-info';
    const description = document.createElement('span');
    description.textContent = label;
    const sizeLabel = document.createElement('strong');
    sizeLabel.textContent = size;
    info.append(description, sizeLabel);
    return info;
  },

  setupPanelDrag(handle) {
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('.close')) return;

      const rect = this.panel.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      handle.classList.add('dragging');
      handle.setPointerCapture(event.pointerId);

      const move = (moveEvent) => {
        const left = Math.max(
          0,
          Math.min(window.innerWidth - this.panel.offsetWidth, moveEvent.clientX - offsetX)
        );
        const top = Math.max(
          0,
          Math.min(window.innerHeight - this.panel.offsetHeight, moveEvent.clientY - offsetY)
        );

        this.panel.style.left = `${left}px`;
        this.panel.style.top = `${top}px`;
        this.panel.style.transform = 'none';
      };

      const stop = () => {
        handle.classList.remove('dragging');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', stop);
        handle.removeEventListener('pointercancel', stop);
      };

      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', stop);
      handle.addEventListener('pointercancel', stop);
    });
  },

  async startDownload(action) {
    action.replaceChildren();
    const progress = document.createElement('div');
    progress.className = 'progress';
    const copy = document.createElement('div');
    copy.className = 'progress-copy';
    const status = document.createElement('span');
    status.textContent = 'Sending request...';
    const percent = document.createElement('strong');
    percent.textContent = '0%';
    copy.append(status, percent);
    const track = document.createElement('div');
    track.className = 'track';
    const fill = document.createElement('span');
    track.appendChild(fill);
    progress.append(copy, track);
    action.appendChild(progress);

    try {
      const target = this.selectedFormat === 'audio'
        ? this.videoData.formats.find((format) =>
            !format.hasVideo &&
            format.hasAudio &&
            Number(format.audioBitrate) === this.selectedAudioBitrate
          )
        : this.videoData.formats.find((format) => format.hasVideo && format.quality === this.selectedQuality);

      const job = await downloaderApi.requestDownload({
        url: this.videoData.url,
        title: this.videoData.title,
        quality: this.selectedFormat === 'audio' ? `${this.selectedAudioBitrate}kbps` : this.selectedQuality,
        format: this.selectedFormat,
        downloadUrl: target?.url || null,
        audioBitrate: this.selectedAudioBitrate
      });
      this.activeJobId = job.jobId;
      this.addJobControls(action, job.jobId, status);
      this.pollJob(job.jobId, action, status, percent, fill);
    } catch (error) {
      this.showError(action, error.message || 'Could not contact the download server.');
    }
  },

  addJobControls(action, jobId, statusLabel) {
    const controls = document.createElement('div');
    controls.className = 'job-actions';
    const pause = document.createElement('button');
    pause.className = 'job-button';
    pause.textContent = 'Pause download';
    const cancel = document.createElement('button');
    cancel.className = 'job-button cancel';
    cancel.textContent = 'Cancel download';

    pause.addEventListener('click', async () => {
      pause.disabled = true;
      try {
        if (pause.dataset.paused === 'true') {
          await downloaderApi.resumeJob(jobId);
          pause.dataset.paused = 'false';
          pause.textContent = 'Pause download';
          statusLabel.textContent = 'Resuming download...';
        } else {
          await downloaderApi.pauseJob(jobId);
          pause.dataset.paused = 'true';
          pause.textContent = 'Resume download';
          statusLabel.textContent = 'Download paused';
        }
      } catch (error) {
        statusLabel.textContent = error.message;
      } finally {
        pause.disabled = false;
      }
    });

    cancel.addEventListener('click', async () => {
      pause.disabled = true;
      cancel.disabled = true;
      try {
        await downloaderApi.cancelJob(jobId);
        clearInterval(this.pollTimer);
        this.activeJobId = null;
        action.replaceChildren();
        const message = document.createElement('div');
        message.className = 'message';
        message.textContent = 'Download cancelled. Partial files were removed.';
        action.appendChild(message);
      } catch (error) {
        pause.disabled = false;
        cancel.disabled = false;
        statusLabel.textContent = error.message;
      }
    });

    controls.append(pause, cancel);
    action.appendChild(controls);
  },

  pollJob(jobId, action, status, percent, fill) {
    clearInterval(this.pollTimer);
    this.pollTimer = setInterval(async () => {
      try {
        const job = await downloaderApi.checkJobStatus(jobId);
        const progress = job.progress || 0;
        percent.textContent = `${progress}%`;
        fill.style.width = `${progress}%`;
        if (job.status === 'paused') status.textContent = 'Download paused';
        else if (job.status === 'processing') status.textContent = 'Processing format...';
        else status.textContent = 'Downloading media...';

        if (job.status === 'completed') {
          clearInterval(this.pollTimer);
          this.activeJobId = null;
          const url = await downloaderApi.resolveFileUrl(job.fileUrl);
          action.replaceChildren();
          const message = document.createElement('div');
          message.className = 'message';
          message.textContent = 'Your file is ready.';
          const save = document.createElement('a');
          save.className = 'save';
          save.href = '#';
          save.innerHTML = `${DOWNLOAD_ICON}<span>Save file</span>`;
          save.addEventListener('click', async (event) => {
            event.preventDefault();
            const filename = decodeURIComponent(job.fileUrl.split('/').pop());
            const response = await chrome.runtime.sendMessage({
              action: 'DOWNLOAD_TO_DEVICE',
              payload: { url, filename }
            });

            if (!response?.success) {
              message.textContent = response?.error || 'Unable to start the device download.';
              return;
            }

            message.textContent = 'Choose where to save the file on your device.';
          });
          action.append(message, save);
        } else if (job.status === 'failed') {
          clearInterval(this.pollTimer);
          this.activeJobId = null;
          this.showError(action, job.error || 'The server could not process this video.');
        } else if (job.status === 'cancelled') {
          clearInterval(this.pollTimer);
          this.activeJobId = null;
        }
      } catch (error) {
        clearInterval(this.pollTimer);
        this.showError(action, error.message);
      }
    }, 1000);
  },

  showError(action, text) {
    action.replaceChildren();
    const message = document.createElement('div');
    message.className = 'message error';
    message.textContent = text;
    const retry = document.createElement('button');
    retry.className = 'primary';
    retry.textContent = 'Try again';
    retry.addEventListener('click', () => this.startDownload(action));
    action.append(message, retry);
  }
};
