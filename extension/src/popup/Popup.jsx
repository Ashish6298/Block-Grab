import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';
import { messageService } from '../services/messageService';

const Icon = ({ name, size = 20 }) => {
  const paths = {
    shield: <><path d="M12 3 5 6v5c0 4.6 2.8 8.7 7 10 4.2-1.3 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6V21h-4v-.1a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 3 14H3v-4h.1a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1 2.8-2.8.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 3V3h4v.1a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1 2.8 2.8-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1H21v4h-.1a1.8 1.8 0 0 0-1.5 1Z"/></>,
    activity: <path d="M3 12h4l2-7 4 14 2-7h6"/>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

export default function Popup() {
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [blockedCount, setBlockedCount] = useState(0);

  useEffect(() => {
    storageService.get('adBlockEnabled', true).then(setAdBlockEnabled);
    storageService.get('blockedCount', 0).then(setBlockedCount);

    const listener = (changes, area) => {
      if (area !== 'local') return;
      if (changes.blockedCount) setBlockedCount(changes.blockedCount.newValue || 0);
      if (changes.adBlockEnabled) setAdBlockEnabled(changes.adBlockEnabled.newValue !== false);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const toggleProtection = async () => {
    const enabled = !adBlockEnabled;
    setAdBlockEnabled(enabled);
    await messageService.send('TOGGLE_ADBLOCK', { enabled });
  };

  return (
    <main className="popup-shell compact">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark"><Icon name="shield" size={22} /></span>
          <span><strong>AdShield</strong><small>Privacy and media tools</small></span>
        </div>
        <button className="icon-button" onClick={() => chrome.runtime.openOptionsPage()} title="Settings">
          <Icon name="settings" size={19} />
        </button>
      </header>

      <article className={`hero-card ${adBlockEnabled ? 'enabled' : 'disabled'}`}>
        <div className="hero-topline">
          <span className="status-pill"><span /> {adBlockEnabled ? 'Protection active' : 'Protection paused'}</span>
          <label className="toggle">
            <input type="checkbox" checked={adBlockEnabled} onChange={toggleProtection} />
            <span />
          </label>
        </div>
        <div className="hero-copy">
          <h1>{adBlockEnabled ? 'Cleaner, quieter browsing.' : 'Protection is paused.'}</h1>
          <p>Ads, trackers, and intrusive page elements are filtered while you browse.</p>
        </div>
        <div className="shield-visual"><Icon name="shield" size={38} /></div>
      </article>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon"><Icon name="activity" size={18} /></span>
          <div><strong>{blockedCount.toLocaleString()}</strong><span>Items blocked</span></div>
        </article>
        <article className="stat-card">
          <span className="stat-icon mint"><Icon name="shield" size={18} /></span>
          <div><strong>{adBlockEnabled ? 'On' : 'Off'}</strong><span>Request shield</span></div>
        </article>
      </div>

      <article className="download-hint">
        <span><Icon name="download" size={19} /></span>
        <div><strong>Video downloads appear on the page</strong><p>Play a supported video and use the floating download icon.</p></div>
      </article>

      <button className="text-button centered" onClick={() => messageService.send('RESET_BLOCKED_COUNT')}>Reset blocked total</button>
      <footer><span className={adBlockEnabled ? 'online' : ''} /> Extension ready</footer>
    </main>
  );
}
