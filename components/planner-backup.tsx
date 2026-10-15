'use client';
import {downloadFile} from '@/lib/download';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {useEffect,useRef,useState} from 'react';
import {makePlannerRecovery} from '@/lib/planner-recovery';
import {diaryUtcTime} from '@/lib/diary-time';
import {Download,Upload} from 'lucide-react';
import {plannerBackupMaxBytes,makePlannerBackup,parsePlannerBackup,readSavedPlan,previewPlannerMerge,restorePlannerBackup,PlannerReviewChangedError,type PlannerBackup,type SavedPlan} from '@/lib/planner-backup';

const count=(value:number,label:string)=>`${value} ${label}${value===1?'':'s'}`;
const counts=(data:SavedPlan)=>[count(data.places.length,'site'),count(data.targets.length,'target'),count((data.deepTargets||[]).length,'deep-sky target'),count((data.diary||[]).length,'observation'),count(Object.keys(data.notes).length,'note'),count(data.equipment.length,'setup')].join(' · ');
export default function PlannerBackupPanel({onRestore}:{onRestore:(data:SavedPlan)=>void}){
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
  try{
   const backup=makePlannerBackup(localStorage);
   downloadFile(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),`nightjar-backup-${backup.exportedAt.slice(0,10)}.json`);
   setStatus('Backup prepared for download. Keep the file to restore on another device.');setError('');
  }catch(error){setError(error instanceof Error?error.message:'Backup could not be created.')}
 }
 function downloadRecovery(){
  feedbackOwner.current=document.activeElement;
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
 return <section className="panel planner-backup" aria-labelledby="backup-heading"><div className="section-label"><span>YOUR PLANS, ON YOUR DEVICES</span><Download size={18}/></div><h2 id="backup-heading">Back up your observing plans.</h2><p className="muted">Download saved sites, favourite bright-sky and deep-sky targets, target notes, observing diary and equipment as a file. Open it in Nightjar on another device to import your plans. Files may contain your private location details and notes.</p><div className="backup-actions"><button className="button" onClick={download}><Download size={16}/>Download backup</button><label className="button backup-picker"><Upload size={16}/>Choose backup file<input ref={fileInput} type="file" accept=".json,application/json" aria-label="Choose Nightjar backup file" disabled={busy} onChange={event=>{void choose(event.target.files?.[0]);event.target.value=''}}/></label></div>{busy&&<div className="backup-actions"><p role="status" className="muted">Reading backup…</p><button type="button" className="button" onClick={cancelRead}>Cancel reading backup</button></div>}{preview&&<div className="backup-preview"><h3 ref={reviewHeading} tabIndex={-1} style={{scrollMarginTop:20}}>Review before importing</h3>{preview.notice&&<p role="status" className="muted">{preview.notice}</p>}<p className="muted">Exported {diaryUtcTime(new Date(preview.backup.exportedAt).toISOString())}.</p><p>File contains: {counts(preview.backup.data)}.</p><p>Will add: {[count(preview.review.added.places,'site'),count(preview.review.added.targets,'target'),count(preview.review.added.deepTargets,'deep-sky target'),count(preview.review.added.diary,'observation'),count(preview.review.added.notes,'note'),count(preview.review.added.equipment,'setup')].join(' · ')}.</p><p>After merging: {counts(preview.review.merged)}.</p><p className="muted">Existing sites at the same coordinates, equipment with the same name, and notes for the same target are kept. For new sites and setup names, all entries in the file are kept. Targets are combined. Diary entries with the same ID keep your saved version. Your current site and observing time stay unchanged.</p>{(preview.review.kept.places.length+preview.review.kept.notes.length+preview.review.kept.equipment.length+preview.review.kept.diary.length)>0&&<div className="backup-conflicts"><h3>Keeping your existing versions</h3><p className="muted">These incoming records differ from saved ones. Import keeps your saved versions.</p><ul>{preview.review.kept.diary.map((label,index)=><li key={`cj${index}`}>Observation: {label}</li>)}{preview.review.kept.places.map((name,index)=><li key={`cp${index}`}>Site: {name}</li>)}{preview.review.kept.notes.map(name=><li key={`cn${name}`}>Note for {name}</li>)}{preview.review.kept.equipment.map((name,index)=><li key={`ce${index}`}>Equipment: {name}</li>)}</ul></div>}<details><summary>View items in the file</summary><ul>{preview.backup.data.places.map((site,index)=><li key={`p${index}`}>Site: {site.name} · {site.latitude.toFixed(3)}°, {site.longitude.toFixed(3)}°</li>)}{preview.backup.data.targets.map(target=><li key={`t${target}`}>Target: {target}</li>)}{(preview.backup.data.deepTargets||[]).map(target=><li key={`d${target}`}>Deep-sky target: {target}</li>)}{Object.keys(preview.backup.data.notes).map(target=><li key={`n${target}`}>Notes for {target}</li>)}{(preview.backup.data.diary||[]).map(entry=><li key={`j${entry.id}`}>Observation: {entry.target} · {diaryUtcTime(entry.observedAt)} · {entry.place.name}</li>)}{preview.backup.data.equipment.map((setup,index)=><li key={`e${index}`}>Equipment: {setup.name}</li>)}</ul></details><div className="backup-actions"><button className="button primary" onClick={restore}>Import saved plans</button><button className="button" onClick={cancelImport}>Cancel import</button></div></div>}<details className="backup-recovery"><summary>Trouble reading saved plans?</summary><p className="muted">A raw recovery copy preserves known Nightjar storage values exactly, including unfinished diary and imaging forms. It can help recover readable data when a normal backup fails. Unreadable entries are identified; nothing is repaired or changed. This file may contain private site details and notes and cannot be imported directly.</p><button className="button" onClick={downloadRecovery}>Download raw recovery copy</button></details>{error&&<p ref={errorNotice} tabIndex={-1} className="error" role="alert">{error}</p>}{status&&<p className="muted" role="status">{status}</p>}<p className="footnote">Version 4 backups support all 42 sky targets, deep-sky lists and the observing diary; they need this or a newer release. Older backups can still be imported. The file is processed on this device. This is a manual backup; plans do not automatically sync between devices. Live forecasts and the current observing time are not included.</p></section>;
}
