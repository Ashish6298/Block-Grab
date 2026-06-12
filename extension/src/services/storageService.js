/**
 * storageService.js
 * Wraps chrome.storage.local with clean Promise API and handles web browser fallback.
 */

const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

export const storageService = {
  get: (key, defaultValue = null) => {
    return new Promise((resolve) => {
      if (isExtension) {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] !== undefined ? result[key] : defaultValue);
        });
      } else {
        const value = localStorage.getItem(key);
        try {
          resolve(value !== null ? JSON.parse(value) : defaultValue);
        } catch {
          resolve(value || defaultValue);
        }
      }
    });
  },

  set: (key, value) => {
    return new Promise((resolve) => {
      if (isExtension) {
        chrome.storage.local.set({ [key]: value }, () => {
          resolve(true);
        });
      } else {
        localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
        resolve(true);
      }
    });
  },

  remove: (key) => {
    return new Promise((resolve) => {
      if (isExtension) {
        chrome.storage.local.remove(key, () => {
          resolve(true);
        });
      } else {
        localStorage.removeItem(key);
        resolve(true);
      }
    });
  },

  clear: () => {
    return new Promise((resolve) => {
      if (isExtension) {
        chrome.storage.local.clear(() => {
          resolve(true);
        });
      } else {
        localStorage.clear();
        resolve(true);
      }
    });
  }
};
