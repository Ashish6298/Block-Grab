import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { messageService } from '../services/messageService';

export default function Options() {
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [cosmeticHiding, setCosmeticHiding] = useState(true);
  const [backendUrl, setBackendUrl] = useState('http://localhost:5000');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    storageService.get('adBlockEnabled', true).then(setAdBlockEnabled);
    storageService.get('cosmeticHiding', true).then(setCosmeticHiding);
    storageService.get('backendUrl', 'http://localhost:5000').then(setBackendUrl);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await messageService.send('TOGGLE_ADBLOCK', { enabled: adBlockEnabled });
    await storageService.set('cosmeticHiding', cosmeticHiding);
    await storageService.set('backendUrl', backendUrl);
    
    setSavedMsg('Settings saved successfully!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="glass-panel" style={{ padding: '30px', margin: '20px auto' }}>
      <h2 style={{ fontFamily: 'var(--font-title)', margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
        ⚙️ Settings & Preferences
      </h2>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Ad Blocker Section */}
        <div>
          <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--primary)', margin: '0 0 10px 0', fontSize: '16px' }}>Ad Blocker Preferences</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label className="switch-container">
              <span className="switch">
                <input type="checkbox" checked={adBlockEnabled} onChange={(e) => setAdBlockEnabled(e.target.checked)} />
                <span className="slider"></span>
              </span>
              <span style={{ fontSize: '14px' }}>Enable Global Request Blocking</span>
            </label>

            <label className="switch-container">
              <span className="switch">
                <input type="checkbox" checked={cosmeticHiding} onChange={(e) => setCosmeticHiding(e.target.checked)} />
                <span className="slider"></span>
              </span>
              <span style={{ fontSize: '14px' }}>Enable Cosmetic CSS Hiding (Removes ad gaps)</span>
            </label>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '10px 0' }} />

        {/* Video Downloader Section */}
        <div>
          <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--primary)', margin: '0 0 10px 0', fontSize: '16px' }}>Video Downloader Preferences</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Backend API Server Endpoint
              </label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#334155',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: 'white',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Buttons & Save Feedback */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
          <button type="submit" className="btn-primary">
            Save Settings
          </button>
          {savedMsg && (
            <span style={{ color: 'var(--success)', fontSize: '14px', fontWeight: '500' }}>
              {savedMsg}
            </span>
          )}
        </div>

      </form>
    </div>
  );
}
