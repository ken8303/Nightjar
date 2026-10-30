"use client";
import { useEffect, useRef, useState } from 'react';
import {watchForegroundDelay} from '@/lib/foreground-delay';
import {pendingEdits,usePendingEdits} from '@/hooks/use-pending-edits';
import {preservePlannerTime,reloadPlanner} from '@/lib/reload-planner';
import PendingEditRecovery from '@/components/pending-edit-recovery';
import {applyPwaUpdate} from '@/lib/pwa-update';
import {watchPwaUpdateChecks} from '@/lib/pwa-update-check';
import {watchPwaRegistration} from '@/lib/pwa-registration';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {useLanguage} from '@/components/language-provider';
import {pendingEditLabel} from '@/lib/language';
import {englishMessages} from '@/lib/messages/en';

const statusKeys=['pwa.setupReady','pwa.setupFailed','pwa.setupSlow','pwa.installed','pwa.installRequested','pwa.installLater','pwa.installMenu','pwa.updatePending','pwa.updateStorage','pwa.updateStorageShort','pwa.updateFinishEdits','pwa.updateNoLongerWaiting','pwa.updateTimeout','pwa.updatePreserve','pwa.updateFailed'] as const;
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export default function PwaSupport() {
  const {language,t}=useLanguage();
  const pendingText=usePendingEdits();
  const localizeStatus=(message:string)=>{const key=statusKeys.find(key=>englishMessages[key]===message);return key?t(key):message};
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing,setInstalling]=useState(false);
  const installPanel=useRef<HTMLElement>(null);
  const installButton=useRef<HTMLButtonElement>(null);
  const installation=useRef({pending:false,installed:false,confirmed:false});
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState('');
  const [setupRevision,setSetupRevision]=useState(0),[setupStarting,setSetupStarting]=useState(false),[setupIssue,setSetupIssue]=useState(''),[setupMessage,setSetupMessage]=useState('');
  const setupButton=useRef<HTMLButtonElement>(null),setupResult=useRef<HTMLParagraphElement>(null);
  const setupOwner=useRef<Element|null>(null);
  const [updateWorker,setUpdateWorker]=useState<ServiceWorker|null>(null);
  const [updating,setUpdating]=useState(false);
  const pendingUpdate=useRef<(()=>void)|null>(null);
  const [updateError,setUpdateError]=useState('');
  useEffect(() => {
    const mode = window.matchMedia('(display-mode: standalone)');
    const updateMode = () => {const value=installation.current.confirmed || mode.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);installation.current.installed=value;setInstalled(value)};
    const updateNetwork = () => setOffline(!navigator.onLine);
    const restoreState = () => { updateMode(); updateNetwork(); };
    const restoreVisibleState = () => { if(!document.hidden)restoreState(); };
    const offerInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt);setMessage(''); };
    const didInstall = () => { installation.current.confirmed=true;installation.current.installed=true;setInstalled(true);setInstalling(false);setPrompt(null);setMessage('Nightjar is installed.'); };
    updateMode(); updateNetwork();
    window.addEventListener('beforeinstallprompt', offerInstall);
    window.addEventListener('appinstalled', didInstall);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    window.addEventListener('pageshow', restoreState);
    document.addEventListener('visibilitychange', restoreVisibleState);
    mode.addEventListener('change', updateMode);
    return () => {
      pendingUpdate.current?.();pendingUpdate.current=null;
      window.removeEventListener('beforeinstallprompt', offerInstall);
      window.removeEventListener('appinstalled', didInstall);
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
      window.removeEventListener('pageshow', restoreState);
      document.removeEventListener('visibilitychange', restoreVisibleState);
      mode.removeEventListener('change', updateMode);
    };
  }, []);
  useEffect(()=>{
    if(process.env.NODE_ENV!=='production'||!('serviceWorker' in navigator))return;
    let active=true;
    const cleanups:(()=>void)[]=[];
    let stopTimeout=()=>{};
    const returnSetupFocus=(success:boolean)=>{
      // Only the explicit retry owns this handoff; repeated worker signals do not.
      const owner=setupOwner.current;setupOwner.current=null;
      if(owner)deferFocusAndScroll(()=>success||setupButton.current?.disabled?setupResult.current:setupButton.current,{owner});
    };
    const ready=()=>{if(!active)return;stopTimeout();setSetupStarting(false);setSetupIssue('');setSetupMessage(setupRevision?'Offline fallback setup completed for this browser.':'');returnSetupFocus(true)};
    const failed=(text='Offline setup could not finish. Reconnect and retry; the planner stays available in this view.')=>{if(!active)return;stopTimeout();setSetupStarting(false);setSetupMessage('');setSetupIssue(text);returnSetupFocus(false)};
    stopTimeout=watchForegroundDelay(()=>failed('Offline setup is taking longer than expected. Reconnect and retry; keep this view open.'),window,document,{hidden:()=>document.hidden,delay:20000});
    navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(registration=>{
      if(!active)return;
      cleanups.push(watchPwaRegistration(registration,{onReady:ready,onFailure:()=>failed(),onWaiting:worker=>{if(active)setUpdateWorker(navigator.serviceWorker.controller?worker:null)}}));
      cleanups.push(watchPwaUpdateChecks(()=>registration.update(),window,document,{online:()=>navigator.onLine,visible:()=>document.visibilityState==='visible'}));
      if(setupRevision&&!registration.active&&!registration.installing&&!registration.waiting)void registration.update().catch(()=>failed());
    }).catch(()=>failed());
    return()=>{active=false;stopTimeout();cleanups.forEach(cleanup=>cleanup())};
  },[setupRevision]);
  function applyUpdate(){
    if(!updateWorker||updating||pendingEdits.snapshot())return;
    pendingUpdate.current?.();setUpdateError('');setUpdating(true);
    pendingUpdate.current=applyPwaUpdate(updateWorker,navigator.serviceWorker,{
      canReload:()=>!pendingEdits.snapshot(),preserve:preservePlannerTime,reload:()=>window.location.reload(),
      onFailure:reason=>{setUpdating(false);setUpdateError(reason);if(updateWorker.state!=='installed')setUpdateWorker(null)}
    });
  }
  async function install() {
    if (!prompt||installation.current.pending||installation.current.installed) return;
    const offered=prompt;installation.current.pending=true;setInstalling(true);setMessage('');
    try { await offered.prompt(); const choice = await offered.userChoice; if(!installation.current.installed)setMessage(choice.outcome === 'accepted' ? 'Installation requested. Follow your browser’s instructions.' : 'You can install Nightjar later from your browser menu.'); }
    catch { if(!installation.current.installed)setMessage('Use your browser menu to add Nightjar to your home screen.'); }
    finally {
      installation.current.pending=false;setInstalling(false);setPrompt(current=>current===offered?null:current);
      // A delayed browser result must not interrupt another field or focus a
      // background page. Return focus only while the install action still owns it.
      if(!document.hidden&&(document.activeElement===installButton.current||document.activeElement===document.body))installPanel.current?.focus({preventScroll:true});
    }
  }
  return <aside ref={installPanel} id="install-app" className="pwa-support" aria-label={t('pwa.label')} tabIndex={-1}>
    {offline && <p className="offline-notice" role="status">{t('pwa.offline')}</p>}
    {pendingText&&<p className="muted">{t('pwa.pending',{edits:pendingEditLabel(pendingText,language)})}</p>}<PendingEditRecovery/>{updateWorker&&<div className="pwa-update" role="status"><p>{t('pwa.ready')}</p><p>{t('pwa.saveFirst')}</p><button type="button" className="button primary" disabled={updating||offline||Boolean(pendingText)} onClick={applyUpdate}>{t(updating?'pwa.updating':'pwa.update')}</button></div>}
    {updateError&&<div className="pwa-update"><p role="status">{localizeStatus(updateError)}</p><button type="button" className="button" disabled={offline||Boolean(pendingText)} onClick={()=>{if(!pendingEdits.snapshot()&&!reloadPlanner())setUpdateError('Your observing site and time could not be preserved. Keep Nightjar open, restore browser storage access and try again.')}}>{t('pwa.reload')}</button></div>}
    {!installed && <details open><summary>{t('pwa.installHeading')}</summary><p>{t('pwa.installIntro')}</p>{prompt && <button ref={installButton} type="button" className="button primary" disabled={installing} onClick={install}>{t(installing?'pwa.installWaiting':'pwa.install')}</button>}<p>{t('pwa.installInstructions')}</p><p className="muted">{t('pwa.installNote')}</p></details>}
    {(setupIssue||setupStarting&&setupRevision>0)&&<div className="pwa-setup-recovery"><p ref={setupResult} role="status" tabIndex={-1}>{setupStarting?t('pwa.setupPreparing'):localizeStatus(setupIssue)}</p><button ref={setupButton} type="button" className="button" disabled={setupStarting||offline||updating} onClick={()=>{if(setupStarting||offline||updating)return;setupOwner.current=document.activeElement;setSetupStarting(true);setSetupIssue('');setSetupMessage('');setSetupRevision(value=>value+1)}}>{t(setupStarting?'pwa.setupPreparing':'pwa.setupRetry')}</button></div>}
    {setupMessage&&<p ref={setupResult} role="status" tabIndex={-1}>{localizeStatus(setupMessage)}</p>}
    {message && <p role="status">{localizeStatus(message)}</p>}
  </aside>;
}
