import { useEffect, useState } from 'react';

const isIos = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

const isStandalone = () => {
  return window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator.standalone === true);
};

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(
    localStorage.getItem('install_prompt_dismissed') === 'true'
  );
  const [installed, setInstalled] = useState(
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
  );

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) {
      if (isIos) setShowIosHint(true);
      return;
    }
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('install_prompt_dismissed', 'true');
  };

  if (installed || dismissed) return null;
  if (!installEvent && !isIos()) return null;

  return (
    <div className={`install-app-wrap ${showIosHint ? 'ios-hint-active' : ''}`}>
      {showIosHint && (
        <div className="install-ios-hint" role="status">
          <div className="ios-hint-header">
            <strong>Install Driver's Diary</strong>
            <button className="ios-hint-close" onClick={() => setShowIosHint(false)}>×</button>
          </div>
          <div className="ios-hint-body">
            <div className="ios-step">
              <span className="step-num">1</span>
              <span>Tap the <strong>Share</strong> button in Safari</span>
              <div className="ios-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
                </svg>
              </div>
            </div>
            <div className="ios-step">
              <span className="step-num">2</span>
              <span>Scroll down and select <strong>Add to Home Screen</strong></span>
              <div className="ios-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!showIosHint && (
        <div className="install-app-actions">
          <div className="install-info">
            <img src="/logo.png" alt="App Logo" className="install-mini-logo" />
            <div className="install-text">
              <strong>Install App</strong>
              <span>Fast access from Home Screen</span>
            </div>
          </div>
          <div className="install-buttons">
            <button className="install-app-btn" onClick={handleInstall}>
              {isIos() ? 'How to Install' : 'Install'}
            </button>
            <button className="install-dismiss-btn" onClick={dismiss} aria-label="Dismiss">
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
