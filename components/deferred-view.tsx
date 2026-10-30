"use client";

import {Component, Suspense, type ReactNode,useState,useEffect} from 'react';
import {pendingEdits,usePendingEdits} from '@/hooks/use-pending-edits';
import PendingEditRecovery from '@/components/pending-edit-recovery';
import {reloadPlanner} from '@/lib/reload-planner';
import {watchForegroundDelay} from '@/lib/foreground-delay';
import {useLanguage} from '@/components/language-provider';
import {pendingEditLabel} from '@/lib/language';

const viewKeys={'Deep-sky explorer':'view.deepSky','Target finder':'view.targets','Photo tools':'view.photo','Aurora':'view.aurora','Moon explorer':'view.moon','Plan backup':'view.backup','Satellite directions':'view.satellites','Site comparison':'view.comparison','Sky calendar':'view.calendar','Sky planning tools':'view.skyTools','Light-pollution map':'view.lightMap','Lunar globe':'view.lunarGlobe','ISS directions':'view.iss','3D sky':'view.sky3d','Camera sky view':'view.camera'} as const;
type Props={name:string;children:ReactNode};
type BoundaryProps=Props&{heading:string;help:string};

function ViewLoading({name,label,fallback}:{name:string;label:string;fallback?:ReactNode}){
 const {language,t}=useLanguage();
 const [delayedName,setDelayedName]=useState<string|null>(null);
 useEffect(()=>watchForegroundDelay(()=>setDelayedName(name),window,document,{hidden:()=>document.hidden}),[name]);
 const delayed=delayedName===name;
 if(!delayed&&fallback!==undefined)return fallback;
 return <section className={`panel tab-loading${delayed?' view-load-delayed':''}`} role="status" tabIndex={delayed?0:undefined} aria-label={t('view.loadingAria',{name:label})}>
  {delayed?<><h3>{t('view.delayed',{name:label})}</h3><p>{t('view.delayedHelp')}</p><ViewRecovery/></>:t('view.loading',{name:language==='en'?label.toLowerCase():label})}
 </section>;
}

function ViewRecovery(){
 const {language,t}=useLanguage();
 const pendingText=usePendingEdits(),[reloadError,setReloadError]=useState(false);
 return <>{pendingText&&<p>{t('pwa.pending',{edits:pendingEditLabel(pendingText,language)})}</p>}<PendingEditRecovery/><button type="button" className="button" disabled={Boolean(pendingText)} onClick={()=>{if(!pendingEdits.snapshot()&&!reloadPlanner())setReloadError(true)}}>{t('pwa.reload')}</button>{reloadError&&<p role="status">{t('pwa.updatePreserve')}</p>}</>;
}
class ViewBoundary extends Component<BoundaryProps,{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){
  if(this.state.failed)return <section className="panel view-unavailable" role="alert" tabIndex={0}>
   <h3>{this.props.heading}</h3>
   <p>{this.props.help}</p>
   <ViewRecovery/>
  </section>;
  return this.props.children;
 }
}

export default function DeferredView({name,children,fallback}:Props&{fallback?:ReactNode}){
 const {t}=useLanguage();
 const key=Object.hasOwn(viewKeys,name)?viewKeys[name as keyof typeof viewKeys]:null,label=key?t(key):name;
 return <ViewBoundary name={name} heading={t('view.unavailable',{name:label})} help={t('view.unavailableHelp')}><Suspense fallback={<ViewLoading name={name} label={label} fallback={fallback}/>}>{children}</Suspense></ViewBoundary>;
}
