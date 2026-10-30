'use client';
import {downloadFile} from '@/lib/download';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {useEffect,useRef,useState} from 'react';
import {makePlannerRecovery} from '@/lib/planner-recovery';
import {diaryUtcTime} from '@/lib/diary-time';
import {Download,Upload} from 'lucide-react';
import {useLanguage} from '@/components/language-provider';
import {englishMessages} from '@/lib/messages/en';
import {plannerBackupMaxBytes,makePlannerBackup,parsePlannerBackup,readSavedPlan,previewPlannerMerge,restorePlannerBackup,PlannerReviewChangedError,type PlannerBackup,type SavedPlan} from '@/lib/planner-backup';

const count=(value:number,label:string)=>`${value} ${label}${value===1?'':'s'}`;
const counts=(data:SavedPlan)=>[count(data.places.length,'site'),count(data.targets.length,'target'),count((data.deepTargets||[]).length,'deep-sky target'),count((data.diary||[]).length,'observation'),count(Object.keys(data.notes).length,'note'),count(data.equipment.length,'setup')].join(' · ');
const messageKeys=['backup.statusCancelled','backup.statusReadCancelled','backup.statusDownloaded','backup.statusImported','backup.statusReviewChanged','backup.errorSize','backup.errorJson','backup.errorFormat','backup.errorTime','backup.errorDeep','backup.errorPlans','backup.errorDiary','backup.errorRead','backup.errorPrepare','backup.errorChanged','backup.errorWrite','backup.errorRollbackChanged','backup.errorRollbackStorage','backup.errorRecoveryStorage','backup.errorRecoverySize','backup.errorDefault','backup.errorRecovery','backup.errorReadFile','backup.errorReview','backup.errorImport'] as const;
export default function PlannerBackupPanel({onRestore}:{onRestore:(data:SavedPlan)=>void}){
 const {language,t}=useLanguage();
 const [preview,setPreview]=useState<{backup:PlannerBackup;current:SavedPlan;review:ReturnType<typeof previewPlannerMerge>;notice?:string}|null>(null),[status,setStatus]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const generation=useRef(0),reviewHeading=useRef<HTMLHeadingElement>(null),fileInput=useRef<HTMLInputElement>(null),errorNotice=useRef<HTMLParagraphElement>(null);
 const feedbackOwner=useRef<Element|null>(null);
 function focusFeedback(target:HTMLElement|null,block:'start'|'center'){
  if(document.hidden||document.activeElement!==feedbackOwner.current&&document.activeElement!==document.body||!target?.isConnected||target.closest('[aria-hidden="true"]'))return;
  target.focus({preventScroll:true});target.scrollIntoView({block,behavior:'instant'});
 }
 useEffect(()=>{if(preview)focusFeedback(reviewHeading.current,'start')},[preview]);
 useEffect(()=>{if(error)focusFeedback(errorNotice.current,'center')},[error]);
 useEffect(()=>()=>{generation.current++},[]);
 function focusPicker(){fileInput.current?.focus({preventScroll:true});fileInput.current?.scrollIntoView({block:'center',behavior:'instant'})}
 function cancelImport(){setPreview(null);setError('');setStatus('Import review cancelled.');focusPicker()}
 function cancelRead(){const owner=document.activeElement;generation.current++;setBusy(false);setPreview(null);setError('');setStatus('Backup reading cancelled. Choose a file to try again.');deferFocusAndScroll(()=>fileInput.current,{owner})}
 function download(){
  feedbackOwner.current=document.activeElement;
  setStatus('');
  try{
   const backup=makePlannerBackup(localStorage);
   downloadFile(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),`nightjar-backup-${backup.exportedAt.slice(0,10)}.json`);
   setStatus('Backup prepared for download. Keep the file to restore on another device.');setError('');
  }catch(error){setError(error instanceof Error?error.message:'Backup could not be created.')}
 }
 function downloadRecovery(){
  feedbackOwner.current=document.activeElement;
  setStatus('');
  try{const recovery=makePlannerRecovery({getItem:key=>localStorage.getItem(key)},{getItem:key=>sessionStorage.getItem(key)});downloadFile(new Blob([recovery.text],{type:'application/json'}),`nightjar-raw-recovery-${recovery.exportedAt.slice(0,10)}.json`);setStatus(`Raw recovery copy prepared. ${recovery.unreadable.length?`${recovery.unreadable.length} unreadable storage ${recovery.unreadable.length===1?'entry is':'entries are'} listed in the file; those values are not included. `:''}Keep this file for manual recovery. It cannot be imported as a plan backup.`);setError('');}
  catch(error){setError(error instanceof Error?error.message:'A recovery copy could not be prepared. Existing storage has not been changed.');}
 }
 async function choose(file:File|undefined){
  const owner=fileInput.current??document.activeElement;
  const request=++generation.current;setPreview(null);setStatus('');setError('');if(!file){setBusy(false);return}
  setBusy(true);
  try{
   if(file.size>plannerBackupMaxBytes)throw Error('Choose a Nightjar backup no larger than 5 MB.');
   const text=await file.text();if(request!==generation.current)return;
   const backup=parsePlannerBackup(text),current=readSavedPlan(localStorage),review=previewPlannerMerge(current,backup.data);
   if(request===generation.current){feedbackOwner.current=owner;setPreview({backup,current,review})}
  }catch(error){if(request===generation.current){feedbackOwner.current=owner;setError(error instanceof Error?error.message:'This backup could not be read.')}}
  finally{if(request===generation.current)setBusy(false)}
 }
 function restore(){
  if(!preview)return;
  feedbackOwner.current=document.activeElement;
  try{const data=restorePlannerBackup(localStorage,preview.backup,preview.current);onRestore(data);setPreview(null);setStatus('Saved plans imported. Your observing site and time are unchanged.');setError('');focusPicker()}
  catch(error){
   if(error instanceof PlannerReviewChangedError){
    try{setPreview({...preview,current:error.current,review:previewPlannerMerge(error.current,preview.backup.data),notice:error.message});setStatus('');setError('')}
    catch(reviewError){setPreview(null);setStatus('');setError(reviewError instanceof Error?reviewError.message:'The updated import review could not be prepared. Existing data has not been changed.')}
   }else{setStatus('');setError(error instanceof Error?error.message:'Import failed.')}
  }
 }
 function localizeMessage(value:string){
  if(language==='en')return value;
  const key=messageKeys.find(key=>englishMessages[key]===value);if(key)return t(key);
  const capacity=/^The combined plan would exceed (\d+) saved (sites|equipment setups|bright-sky targets|target notes|observations)\. Free space or choose a smaller backup\. Nothing has been imported\.$/.exec(value);
  if(capacity){const kind=capacity[2]==='sites'?'backup.kindSites':capacity[2]==='equipment setups'?'backup.kindEquipment':capacity[2]==='bright-sky targets'?'backup.kindTargets':capacity[2]==='target notes'?'backup.kindNotes':'backup.kindObservations';return t('backup.capacity',{limit:capacity[1],kind:t(kind)})}
  const recovery=/^Raw recovery copy prepared\. (?:(\d+) unreadable storage (?:entry is|entries are) listed in the file; those values are not included\. )?Keep this file for manual recovery\. It cannot be imported as a plan backup\.$/.exec(value);
  if(recovery)return t('backup.recoveryStatus',{unreadable:recovery[1]?t('backup.recoveryUnreadable',{count:recovery[1]}):''});
  return value;
 }
 function countGroups(values:{places:number;targets:number;deepTargets:number;diary:number;notes:number;equipment:number}){
  if(language==='en')return [count(values.places,'site'),count(values.targets,'target'),count(values.deepTargets,'deep-sky target'),count(values.diary,'observation'),count(values.notes,'note'),count(values.equipment,'setup')].join(' · ');
  return [t('backup.countSites',{count:values.places}),t('backup.countTargets',{count:values.targets}),t('backup.countDeep',{count:values.deepTargets}),t('backup.countDiary',{count:values.diary}),t('backup.countNotes',{count:values.notes}),t('backup.countEquipment',{count:values.equipment})].join(' · ');
 }
 function displayCounts(data:SavedPlan){return language==='en'?counts(data):countGroups({places:data.places.length,targets:data.targets.length,deepTargets:(data.deepTargets||[]).length,diary:(data.diary||[]).length,notes:Object.keys(data.notes).length,equipment:data.equipment.length})}
 return <section className="panel planner-backup" aria-labelledby="backup-heading"><div className="section-label"><span>{t('backup.eyebrow')}</span><Download size={18}/></div><h2 id="backup-heading">{t('backup.heading')}</h2><p className="muted">{t('backup.intro')}</p><div className="backup-actions"><button className="button" onClick={download}><Download size={16}/>{t('backup.download')}</button><label className="button backup-picker"><Upload size={16}/>{t('backup.choose')}<input ref={fileInput} type="file" accept=".json,application/json" aria-label={t('backup.chooseLabel')} disabled={busy} onChange={event=>{void choose(event.target.files?.[0]);event.target.value=''}}/></label></div>{busy&&<div className="backup-actions"><p role="status" className="muted">{t('backup.reading')}</p><button type="button" className="button" onClick={cancelRead}>{t('backup.cancelRead')}</button></div>}{preview&&<div className="backup-preview"><h3 ref={reviewHeading} tabIndex={-1} style={{scrollMarginTop:20}}>{t('backup.review')}</h3>{preview.notice&&<p role="status" className="muted">{localizeMessage(preview.notice)}</p>}<p className="muted">{t('backup.exported',{time:diaryUtcTime(new Date(preview.backup.exportedAt).toISOString())})}</p><p>{t('backup.contains',{counts:displayCounts(preview.backup.data)})}</p><p>{t('backup.adds',{counts:countGroups(preview.review.added)})}</p><p>{t('backup.merged',{counts:displayCounts(preview.review.merged)})}</p><p className="muted">{t('backup.mergeHelp')}</p>{(preview.review.kept.places.length+preview.review.kept.notes.length+preview.review.kept.equipment.length+preview.review.kept.diary.length)>0&&<div className="backup-conflicts"><h3>{t('backup.keptHeading')}</h3><p className="muted">{t('backup.keptHelp')}</p><ul>{preview.review.kept.diary.map((label,index)=><li key={`cj${index}`}>{t('backup.observation',{name:label})}</li>)}{preview.review.kept.places.map((name,index)=><li key={`cp${index}`}>{t('backup.site',{name})}</li>)}{preview.review.kept.notes.map(name=><li key={`cn${name}`}>{t('backup.noteFor',{name})}</li>)}{preview.review.kept.equipment.map((name,index)=><li key={`ce${index}`}>{t('backup.equipment',{name})}</li>)}</ul></div>}<details><summary>{t('backup.fileItems')}</summary><ul>{preview.backup.data.places.map((site,index)=><li key={`p${index}`}>{t('backup.site',{name:site.name})} · {site.latitude.toFixed(3)}°, {site.longitude.toFixed(3)}°</li>)}{preview.backup.data.targets.map(target=><li key={`t${target}`}>{t('backup.target',{name:target})}</li>)}{(preview.backup.data.deepTargets||[]).map(target=><li key={`d${target}`}>{t('backup.deepTarget',{name:target})}</li>)}{Object.keys(preview.backup.data.notes).map(target=><li key={`n${target}`}>{language==='en'?`Notes for ${target}`:t('backup.noteFor',{name:target})}</li>)}{(preview.backup.data.diary||[]).map(entry=><li key={`j${entry.id}`}>{t('backup.observation',{name:entry.target})} · {diaryUtcTime(entry.observedAt)} · {entry.place.name}</li>)}{preview.backup.data.equipment.map((setup,index)=><li key={`e${index}`}>{t('backup.equipment',{name:setup.name})}</li>)}</ul></details><div className="backup-actions"><button className="button primary" onClick={restore}>{t('backup.import')}</button><button className="button" onClick={cancelImport}>{t('backup.cancelImport')}</button></div></div>}<details className="backup-recovery"><summary>{t('backup.recoveryHeading')}</summary><p className="muted">{t('backup.recoveryHelp')}</p><button className="button" onClick={downloadRecovery}>{t('backup.recoveryDownload')}</button></details>{error&&<p ref={errorNotice} tabIndex={-1} className="error" role="alert">{localizeMessage(error)}</p>}{status&&<p className="muted" role="status">{localizeMessage(status)}</p>}<p className="footnote">{t('backup.note')}</p></section>;
}
