/**
 * contentScript.js
 * Injected content script executing page scanners.
 */

import { videoDetector } from './videoDetector';
import { floatingDownloadButton } from './floatingDownloadButton';

const AD_SELECTORS = [
  '.ad-banner',
  '.ad-container',
  '.ad-slot',
  '.ad-wrapper',
  '.ad-unit',
  '.advertisement',
  '.adsbygoogle',
  '.banner-ad',
  '.display-ad',
  '.native-ad',
  '.sponsored-ad',
  '.sponsored-content',
  '.sponsored-links',
  '[data-ad]',
  '[data-ad-slot]',
  '[data-ad-unit]',
  '[id^="google_ads_"]',
  '[id^="div-gpt-ad"]',
  '.ytp-ad-overlay-container',
  '.ytp-ad-message-container',
  '.ytp-ad-module',
  '.ytp-ad-player-overlay',
  'ytd-ad-slot-renderer',
  'ytd-action-companion-ad-renderer',
  'ytd-companion-slot-renderer',
  'ytd-display-ad-renderer',
  'ytd-in-feed-ad-layout-renderer',
  'ytd-promoted-sparkles-web-renderer',
  'ytd-promoted-video-renderer',
  '#masthead-ad',
  '#player-ads',
  '#ad-banner',
  '#ad-container',
  '#ad-slot',
  '#ad-placement',
  '#header-ads',
  '#footer-ads',
  '#sidebar-ads',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googleads"]',
  'iframe[src*="adservice"]'
];

const handleYouTubeAd = () => {
  if (!location.hostname.endsWith('youtube.com')) return;

  const skipButton = document.querySelector(
    '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button[id^="skip-button"]'
  );
  if (skipButton instanceof HTMLElement) {
    skipButton.click();
  }

  const player = document.querySelector('.html5-video-player.ad-showing');
  const video = player?.querySelector('video');
  if (video && Number.isFinite(video.duration) && video.duration > 0) {
    video.currentTime = video.duration;
  }
};

const countedAds = new WeakSet();
let pendingCount = 0;
let countTimer = null;

const reportCount = () => {
  if (!pendingCount) return;
  const count = pendingCount;
  pendingCount = 0;
  chrome.runtime.sendMessage({
    action: 'RECORD_COSMETIC_BLOCKS',
    payload: { count }
  });
};

const countAdsIn = (root) => {
  if (!(root instanceof Element) && root !== document) return;

  let newlyFound = 0;
  AD_SELECTORS.forEach((selector) => {
    const matches = [];
    if (root instanceof Element && root.matches(selector)) matches.push(root);
    root.querySelectorAll?.(selector).forEach((element) => matches.push(element));

    matches.forEach((element) => {
      if (!countedAds.has(element)) {
        countedAds.add(element);
        newlyFound += 1;
      }
    });
  });

  if (newlyFound) {
    pendingCount += newlyFound;
    clearTimeout(countTimer);
    countTimer = setTimeout(reportCount, 250);
  }
};

const applyCosmeticState = (enabled) => {
  const existing = document.getElementById('adshield-cosmetic-filters');
  if (!enabled) {
    existing?.remove();
    return;
  }

  countAdsIn(document);
  if (!existing) {
    const link = document.createElement('link');
    link.id = 'adshield-cosmetic-filters';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('src/adblock/cosmeticFilters.css');
    (document.head || document.documentElement).appendChild(link);
  }
};

const initCosmeticBlocker = () => {
  chrome.storage.local.get(['adBlockEnabled', 'cosmeticHiding'], (settings) => {
    applyCosmeticState(settings.adBlockEnabled !== false && settings.cosmeticHiding !== false);
  });

  new MutationObserver((mutations) => {
    chrome.storage.local.get(['adBlockEnabled', 'cosmeticHiding'], (settings) => {
      if (settings.adBlockEnabled === false || settings.cosmeticHiding === false) return;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => countAdsIn(node));
      });
      handleYouTubeAd();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  handleYouTubeAd();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.adBlockEnabled && !changes.cosmeticHiding)) return;
    chrome.storage.local.get(['adBlockEnabled', 'cosmeticHiding'], (settings) => {
      applyCosmeticState(settings.adBlockEnabled !== false && settings.cosmeticHiding !== false);
    });
  });
};

const initVideoDownloader = () => {
  videoDetector.init((videoDetails) => {
    chrome.runtime.sendMessage({
      action: 'VIDEO_DETECTED',
      payload: videoDetails
    });
    floatingDownloadButton.inject(videoDetails);
  });
};

initCosmeticBlocker();
initVideoDownloader();
