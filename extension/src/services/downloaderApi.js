/**
 * downloaderApi.js
 * Communicates with the Node.js/Express backend service.
 */

const DEFAULT_BACKEND_URL = 'http://localhost:5000';

const getConfiguredBackendUrl = async () => {
  const configured = await new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['backendUrl'], (result) => {
        resolve(result.backendUrl || DEFAULT_BACKEND_URL);
      });
      return;
    }
    resolve(DEFAULT_BACKEND_URL);
  });
  return String(configured).replace(/\/+$/, '');
};

const requestBackend = async (path, options) => {
  const configured = await getConfiguredBackendUrl();
  const candidates = [configured];
  let lastError = null;

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}/api/download${path}`, options);
      if (response.ok) {
        return { response, baseUrl };
      }

      const contentType = response.headers.get('content-type') || '';
      const body = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
      const message = typeof body === 'string' ? body : body.message;
      lastError = new Error(message || `Backend returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Download backend is unavailable.');
};

export const downloaderApi = {
  resolveFileUrl: async (fileUrl) => {
    const configured = await getConfiguredBackendUrl();
    return `${configured}${fileUrl}`;
  },

  fetchVideoInfo: async (videoUrl) => {
    try {
      const { response } = await requestBackend('/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: videoUrl })
      });

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('API Error (fetchVideoInfo):', error);
      throw error;
    }
  },

  requestDownload: async ({ url, title, quality, format, downloadUrl, audioBitrate }) => {
    try {
      const { response } = await requestBackend('/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, title, quality, format, downloadUrl, audioBitrate })
      });

      const result = await response.json();
      return result.data; // contains jobId
    } catch (error) {
      console.error('API Error (requestDownload):', error);
      throw error;
    }
  },

  checkJobStatus: async (jobId) => {
    try {
      const { response } = await requestBackend(`/status/${jobId}`);

      const result = await response.json();
      return result.data; // contains status, progress, fileUrl, error
    } catch (error) {
      console.error('API Error (checkJobStatus):', error);
      throw error;
    }
  },

  pauseJob: async (jobId) => {
    const { response } = await requestBackend(`/pause/${jobId}`, { method: 'POST' });
    return (await response.json()).data;
  },

  resumeJob: async (jobId) => {
    const { response } = await requestBackend(`/resume/${jobId}`, { method: 'POST' });
    return (await response.json()).data;
  },

  cancelJob: async (jobId) => {
    const { response } = await requestBackend(`/cancel/${jobId}`, { method: 'POST' });
    return (await response.json()).data;
  }
};
