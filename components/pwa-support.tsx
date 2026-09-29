"use client";
import { useEffect, useState } from 'react';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export default function PwaSupport() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const mode = window.matchMedia('(display-mode: standalone)');
    const updateMode = () => setInstalled(mode.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const updateNetwork = () => setOffline(!navigator.onLine);
    const offerInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const didInstall = () => { setInstalled(true); setPrompt(null); setMessage('Nightjar is installed.'); };
    updateMode(); updateNetwork();
    window.addEventListener('beforeinstallprompt', offerInstall);
    window.addEventListener('appinstalled', didInstall);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    mode.addEventListener('change', updateMode);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => setMessage('Offline fallback could not be enabled. You can still use Nightjar online.'));
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', offerInstall);
      window.removeEventListener('appinstalled', didInstall);
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
      mode.removeEventListener('change', updateMode);
    };
  }, []);
  async function install() {
    if (!prompt) return;
    try { await prompt.prompt(); const choice = await prompt.userChoice; setMessage(choice.outcome === 'accepted' ? 'Installation requested. Follow your browser’s instructions.' : 'You can install Nightjar later from your browser menu.'); }
    catch { setMessage('Use your browser menu to add Nightjar to your home screen.'); }
    finally { setPrompt(null); }
  }
  return <aside id="install-app" className="pwa-support" aria-label="Nightjar app">
    {offline && <p className="offline-notice" role="status">You’re offline. Live conditions cannot refresh; any displayed forecast may be out of date.</p>}
    {!installed && <details open><summary>Take Nightjar with you · Install app</summary><p>Add Nightjar to your home screen for a standalone view.</p>{prompt && <button className="button primary" onClick={install}>Install Nightjar</button>}<p>On iPhone or iPad, open this site in Safari, choose Share, then Add to Home Screen. On Android or desktop, look for Install app or Add to Home screen in your browser menu.</p><p className="muted">An internet connection is needed to open the planner and get live conditions. If disconnected, an offline page helps you reconnect. Installation availability depends on your browser.</p></details>}
    {message && <p role="status">{message}</p>}
    <a className="back-to-top" href="#page-top" aria-label="Back to navigation">↑ <span>Navigation</span></a>
  </aside>;
}
