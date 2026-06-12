/**
 * messageService.js
 * Standardized messaging wrapper for Chrome Runtime API.
 */

const isExtension = typeof chrome !== 'undefined' && chrome.runtime;

export const messageService = {
  // Send a message to background service worker or open popups
  send: (action, payload = {}) => {
    return new Promise((resolve, reject) => {
      if (!isExtension) {
        console.warn(`[Mock Send] Action: ${action}`, payload);
        return resolve({ status: 'mocked', data: null });
      }

      chrome.runtime.sendMessage({ action, payload }, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.warn('Chrome runtime sendMessage error:', lastError.message);
          return resolve({ error: lastError.message });
        }
        resolve(response);
      });
    });
  },

  // Send a message to a specific active tab's content script
  sendToTab: (tabId, action, payload = {}) => {
    return new Promise((resolve) => {
      if (!isExtension) {
        console.warn(`[Mock SendToTab] Tab: ${tabId}, Action: ${action}`, payload);
        return resolve({ status: 'mocked' });
      }

      chrome.tabs.sendMessage(tabId, { action, payload }, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.warn(`Chrome runtime sendToTab error on tab ${tabId}:`, lastError.message);
          return resolve({ error: lastError.message });
        }
        resolve(response);
      });
    });
  },

  // Listen for incoming messages
  addListener: (callback) => {
    if (!isExtension) {
      return () => {};
    }

    const handler = (message, sender, sendResponse) => {
      const { action, payload } = message;
      // We wrap callback response execution
      const promise = callback(action, payload, sender);
      if (promise && typeof promise.then === 'function') {
        promise.then(sendResponse).catch(err => sendResponse({ error: err.message }));
        return true; // Keep channel open for async response
      } else if (promise !== undefined) {
        sendResponse(promise);
      }
      return false;
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => {
      chrome.runtime.onMessage.removeListener(handler);
    };
  }
};
