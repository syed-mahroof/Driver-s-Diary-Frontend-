import { useEffect, useState } from 'react';

const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

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

  if (installed || dismissed || (!installEvent && !isIos)) return null;

  return (
    <div className="install-app-wrap">
      {showIosHint && (
        <div className="install-ios-hint" role="status">
          Use Share, then Add to Home Screen.
        </div>
      )}
      <div className="install-app-actions">
        <button className="install-app-btn" onClick={handleInstall}>
          Install App
        </button>
        <button className="install-dismiss-btn" onClick={dismiss} aria-label="Dismiss install prompt">
          x
        </button>
      </div>
    </div>
  );
}
