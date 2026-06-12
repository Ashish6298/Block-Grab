import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';
import { messageService } from '../services/messageService';
import logoImg from '../assets/logo.png';

const Icon = ({ name, size = 20 }) => {
  const paths = {
    shield: <><path d="M12 3 5 6v5c0 4.6 2.8 8.7 7 10 4.2-1.3 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6V21h-4v-.1a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 3 14H3v-4h.1a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1 2.8-2.8.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 3V3h4v.1a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1 2.8 2.8-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1H21v4h-.1a1.8 1.8 0 0 0-1.5 1Z"/></>,
    activity: <path d="M3 12h4l2-7 4 14 2-7h6"/>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    linkedin: <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></>,
    github: <><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></>
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

export default function Popup() {
  const [activeTab, setActiveTab] = useState('adblock'); // 'adblock' or 'developer'
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
    <main className="popup-shell compact" style={{ minHeight: '520px' }}>
      <header className="app-header">
        <div className="brand" style={{ gap: '10px' }}>
          <img 
            src={logoImg} 
            alt="Block&Grab Logo" 
            style={{ width: '26px', height: '26px', borderRadius: '6px', objectFit: 'cover' }} 
          />
          <span><strong>Block&Grab</strong><small>Privacy & Media Utility</small></span>
        </div>
        <button className="icon-button" onClick={() => chrome.runtime.openOptionsPage()} title="Settings">
          <Icon name="settings" size={19} />
        </button>
      </header>

      {/* Tabs */}
      <nav className="tab-list" style={{ display: 'flex', gap: '4px', margin: '0 0 16px 0', background: 'rgba(0,0,0,0.15)', padding: '4px', borderRadius: '10px' }}>
        <button 
          onClick={() => setActiveTab('adblock')}
          className={activeTab === 'adblock' ? 'active' : ''}
          style={{ flex: 1, padding: '8px 0', border: 'none', background: activeTab === 'adblock' ? 'var(--primary)' : 'transparent', color: activeTab === 'adblock' ? 'white' : 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-title)', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
        >
          <Icon name="shield" size={14} /> Shield
        </button>
        <button 
          onClick={() => setActiveTab('developer')}
          className={activeTab === 'developer' ? 'active' : ''}
          style={{ flex: 1, padding: '8px 0', border: 'none', background: activeTab === 'developer' ? 'var(--primary)' : 'transparent', color: activeTab === 'developer' ? 'white' : 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-title)', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
        >
          <Icon name="user" size={14} /> Developer
        </button>
      </nav>

      {activeTab === 'adblock' && (
        <>
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
        </>
      )}

      {activeTab === 'developer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '20px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #818cf8 0%, #f43f5e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '10px', border: '2px solid rgba(255,255,255,0.1)' }}>AG</div>
            <strong style={{ fontSize: '15px', fontFamily: 'var(--font-title)' }}>Ashish Goswami</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Information Science & Engineering undergraduate</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a href="mailto:ashishgoswami1013@gmail.com" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-main)', textDecoration: 'none', fontSize: '12px', transition: 'var(--transition)' }}>
              <span style={{ color: 'var(--primary)' }}><Icon name="mail" size={16} /></span>
              <span>ashishgoswami1013@gmail.com</span>
            </a>

            <a href="https://www.linkedin.com/in/ashish-goswami-58797a24a/" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-main)', textDecoration: 'none', fontSize: '12px', transition: 'var(--transition)' }}>
              <span style={{ color: '#0077b5' }}><Icon name="linkedin" size={16} /></span>
              <span>linkedin.com/in/ashish-goswami-58797a24a</span>
            </a>

            <a href="https://github.com/Ashish6298" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-main)', textDecoration: 'none', fontSize: '12px', transition: 'var(--transition)' }}>
              <span style={{ color: '#f0f6fc' }}><Icon name="github" size={16} /></span>
              <span>github.com/Ashish6298</span>
            </a>

            <a href="https://portfolio-omega-sand-67.vercel.app/" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-main)', textDecoration: 'none', fontSize: '12px', transition: 'var(--transition)' }}>
              <span style={{ color: 'var(--success)' }}><Icon name="globe" size={16} /></span>
              <span>portfolio-omega-sand-67.vercel.app</span>
            </a>
          </div>
        </div>
      )}

      <footer><span className={adBlockEnabled ? 'online' : ''} /> Extension ready</footer>
    </main>
  );
}
