"use client";
import { useEffect, useRef, useState } from 'react';
import {preservePlannerTime} from '@/lib/reload-planner';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export default function PwaSupport() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState('');
  const [updateWorker,setUpdateWorker]=useState<ServiceWorker|null>(null);
  const [updating,setUpdating]=useState(false);
  const applyingUpdate=useRef(false);
  useEffect(() => {
    let active=true;
    const cleanups:(()=>void)[]=[];
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
      const controllerChanged=()=>{if(active&&applyingUpdate.current)window.location.reload()};
      navigator.serviceWorker.addEventListener('controllerchange',controllerChanged);
      cleanups.push(()=>navigator.serviceWorker.removeEventListener('controllerchange',controllerChanged));
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(registration=>{
        if(!active)return;
        const offerUpdate=()=>{if(active&&registration.waiting&&navigator.serviceWorker.controller)setUpdateWorker(registration.waiting)};
        const watchInstalling=()=>{
          const worker=registration.installing;if(!worker)return;
          worker.addEventListener('statechange',offerUpdate);
          cleanups.push(()=>worker.removeEventListener('statechange',offerUpdate));
        };
        offerUpdate();watchInstalling();
        registration.addEventListener('updatefound',watchInstalling);
        cleanups.push(()=>registration.removeEventListener('updatefound',watchInstalling));
      }).catch(()=>{if(active)setMessage('Offline fallback could not be enabled. You can still use Nightjar online.')});
    }
    return () => {
      active=false;cleanups.forEach(cleanup=>cleanup());
      window.removeEventListener('beforeinstallprompt', offerInstall);
      window.removeEventListener('appinstalled', didInstall);
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
      mode.removeEventListener('change', updateMode);
    };
  }, []);
  function applyUpdate(){
    if(!updateWorker||updating)return;
    if(updateWorker.state!=='installed'){setUpdateWorker(null);setMessage('This update is no longer waiting. Reload Nightjar to check again.');return}
    preservePlannerTime();applyingUpdate.current=true;setUpdating(true);
    try{updateWorker.postMessage({type:'SKIP_WAITING'})}
    catch{applyingUpdate.current=false;setUpdating(false);setMessage('The update could not start. Reconnect and try again.')}
  }
  async function install() {
    if (!prompt) return;
    try { await prompt.prompt(); const choice = await prompt.userChoice; setMessage(choice.outcome === 'accepted' ? 'Installation requested. Follow your browser’s instructions.' : 'You can install Nightjar later from your browser menu.'); }
    catch { setMessage('Use your browser menu to add Nightjar to your home screen.'); }
    finally { setPrompt(null); }
  }
  return <aside id="install-app" className="pwa-support" aria-label="Nightjar app">
    {offline && <p className="offline-notice" role="status">You’re offline. Live conditions cannot refresh; any displayed forecast may be out of date.</p>}
    {updateWorker&&<div className="pwa-update" role="status"><p>A new Nightjar version is ready. Your saved places, targets and equipment stay on this device.</p><button type="button" className="button primary" disabled={updating||offline} onClick={applyUpdate}>{updating?'Updating Nightjar…':'Update and reload'}</button></div>}
    {!installed && <details open><summary>Take Nightjar with you · Install app</summary><p>Add Nightjar to your home screen for a standalone view.</p>{prompt && <button className="button primary" onClick={install}>Install Nightjar</button>}<p>On iPhone or iPad, open this site in Safari, choose Share, then Add to Home Screen. On Android or desktop, look for Install app or Add to Home screen in your browser menu.</p><p className="muted">An internet connection is needed for live conditions and to reopen the full planner. Previously opened tab files may remain available during a connection drop; the offline page can show plans saved on this device while you reconnect. Installation availability depends on your browser.</p></details>}
    {message && <p role="status">{message}</p>}
  </aside>;
}
