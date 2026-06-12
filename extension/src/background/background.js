/**
 * background.js
 * Service Worker for Manifest V3 extension.
 */

const detectedVideos = {};
let countUpdate = Promise.resolve();

const incrementBlockedCount = (amount = 1) => {
  const safeAmount = Math.max(0, Number(amount) || 0);
  if (!safeAmount) return Promise.resolve();

  countUpdate = countUpdate.then(() => new Promise((resolve) => {
    chrome.storage.local.get(['blockedCount'], (result) => {
      chrome.storage.local.set({
        blockedCount: (result.blockedCount || 0) + safeAmount
      }, resolve);
    });
  }));

  return countUpdate;
};

const setRulesetEnabled = (enabled, callback = () => {}) => {
  chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabled ? ['adblock_rules'] : [],
    disableRulesetIds: enabled ? [] : ['adblock_rules']
  }, callback);
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['adBlockEnabled', 'blockedCount', 'cosmeticHiding'], (result) => {
    if (result.adBlockEnabled === undefined) {
      chrome.storage.local.set({ adBlockEnabled: true });
    }
    if (result.blockedCount === undefined) {
      chrome.storage.local.set({ blockedCount: 0 });
    }
    if (result.cosmeticHiding === undefined) {
      chrome.storage.local.set({ cosmeticHiding: true });
    }

    setRulesetEnabled(result.adBlockEnabled !== false);
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['adBlockEnabled'], (result) => {
    setRulesetEnabled(result.adBlockEnabled !== false);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, payload = {} } = message;

  if (action === 'TOGGLE_ADBLOCK') {
    const enable = Boolean(payload.enabled);
    chrome.storage.local.set({ adBlockEnabled: enable }, () => {
      setRulesetEnabled(enable, () => {
        sendResponse({ success: true, enabled: enable });
      });
    });
    return true;
  }

  if (action === 'RESET_BLOCKED_COUNT') {
    chrome.storage.local.set({ blockedCount: 0 }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (action === 'RECORD_COSMETIC_BLOCKS') {
    incrementBlockedCount(payload.count).then(() => sendResponse({ success: true }));
    return true;
  }

  if (action === 'VIDEO_DETECTED') {
    const tabId = sender.tab ? sender.tab.id : payload.tabId;
    if (tabId) {
      detectedVideos[tabId] = {
        title: payload.title,
        url: payload.url,
        formats: payload.formats || [],
        thumbnail: payload.thumbnail || '',
        detectedAt: Date.now()
      };
      
      chrome.action.setBadgeText({ tabId, text: 'DL' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#6d5dfc' });
      chrome.action.setTitle({ tabId, title: 'Video detected - download options available' });
    }
    sendResponse({ success: true });
    return false;
  }

  if (action === 'GET_DETECTED_VIDEO') {
    const tabId = payload.tabId;
    const info = detectedVideos[tabId] || null;
    sendResponse({ video: info });
    return false;
  }

  if (action === 'DOWNLOAD_TO_DEVICE') {
    chrome.downloads.download({
      url: payload.url,
      filename: payload.filename,
      saveAs: true,
      conflictAction: 'uniquify'
    }, (downloadId) => {
      const error = chrome.runtime.lastError;
      if (error) {
        sendResponse({ success: false, error: error.message });
        return;
      }

      sendResponse({ success: true, downloadId });
    });
    return true;
  }
});

if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(() => {
    incrementBlockedCount(1);
  });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  delete detectedVideos[tabId];
});
