'use client';
import {useEffect,useRef,useState} from 'react';
import {Download,Upload} from 'lucide-react';
import {makePlannerBackup,parsePlannerBackup,readSavedPlan,previewPlannerMerge,restorePlannerBackup,type PlannerBackup,type SavedPlan} from '@/lib/planner-backup';

const count=(value:number,label:string)=>`${value} ${label}${value===1?'':'s'}`;
const counts=(data:SavedPlan)=>[count(data.places.length,'site'),count(data.targets.length,'target'),count((data.deepTargets||[]).length,'deep-sky target'),count((data.diary||[]).length,'observation'),count(Object.keys(data.notes).length,'note'),count(data.equipment.length,'setup')].join(' · ');
export default function PlannerBackupPanel({onRestore}:{onRestore:(data:SavedPlan)=>void}){
 const [preview,setPreview]=useState<{backup:PlannerBackup;review:ReturnType<typeof previewPlannerMerge>}|null>(null),[status,setStatus]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const generation=useRef(0),reviewHeading=useRef<HTMLHeadingElement>(null),fileInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(preview){reviewHeading.current?.focus({preventScroll:true});reviewHeading.current?.scrollIntoView({block:'start',behavior:'instant'})}},[preview]);
 function cancelImport(){setPreview(null);setError('');fileInput.current?.focus({preventScroll:true});fileInput.current?.scrollIntoView({block:'center',behavior:'instant'})}
 function download(){
  try{
   const backup=makePlannerBackup(localStorage),url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download=`nightjar-backup-${backup.exportedAt.slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   setStatus('Backup prepared for download. Keep the file to restore on another device.');setError('');
  }catch(error){setError(error instanceof Error?error.message:'Backup could not be created.')}
 }
 async function choose(file:File|undefined){
  const request=++generation.current;setPreview(null);setStatus('');setError('');if(!file){setBusy(false);return}
  setBusy(true);
  try{
   if(file.size>1024*1024)throw Error('Choose a Nightjar backup smaller than 1 MB.');
   const backup=parsePlannerBackup(await file.text()),review=previewPlannerMerge(readSavedPlan(localStorage),backup.data);
   if(request===generation.current)setPreview({backup,review});
  }catch(error){if(request===generation.current)setError(error instanceof Error?error.message:'This backup could not be read.')}
  finally{if(request===generation.current)setBusy(false)}
 }
 function restore(){
  if(!preview)return;
  try{const data=restorePlannerBackup(localStorage,preview.backup);onRestore(data);setPreview(null);setStatus('Saved plans imported. Your observing site and time are unchanged.');setError('')}
  catch(error){setError(error instanceof Error?error.message:'Import failed.')}
 }
 return <section className="panel planner-backup" aria-labelledby="backup-heading"><div className="section-label"><span>YOUR PLANS, ON YOUR DEVICES</span><Download size={18}/></div><h2 id="backup-heading">Back up your observing plans.</h2><p className="muted">Download saved sites, favourite bright-sky and deep-sky targets, target notes, observing diary and equipment as a file. Open it in Nightjar on another device to import your plans. Files may contain your private location details and notes.</p><div className="backup-actions"><button className="button" onClick={download}><Download size={16}/>Download backup</button><label className="button backup-picker"><Upload size={16}/>Choose backup file<input ref={fileInput} type="file" accept=".json,application/json" aria-label="Choose Nightjar backup file" disabled={busy} onChange={event=>{void choose(event.target.files?.[0]);event.target.value=''}}/></label></div>{busy&&<p role="status" className="muted">Reading backup…</p>}{preview&&<div className="backup-preview"><h3 ref={reviewHeading} tabIndex={-1} style={{scrollMarginTop:20}}>Review before importing</h3><p className="muted">Exported {new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(preview.backup.exportedAt))} UTC.</p><p>File contains: {counts(preview.backup.data)}.</p><p>Will add: {[count(preview.review.added.places,'site'),count(preview.review.added.targets,'target'),count(preview.review.added.deepTargets,'deep-sky target'),count(preview.review.added.diary,'observation'),count(preview.review.added.notes,'note'),count(preview.review.added.equipment,'setup')].join(' · ')}.</p><p>After merging: {counts(preview.review.merged)}.</p><p className="muted">Existing sites at the same coordinates, equipment with the same name, and notes for the same target are kept. Targets are combined. Diary entries with the same ID keep your saved version. Your current site and observing time stay unchanged.</p>{(preview.review.kept.places.length+preview.review.kept.notes.length+preview.review.kept.equipment.length+preview.review.kept.diary.length)>0&&<div className="backup-conflicts"><h3>Keeping your existing versions</h3><p className="muted">These incoming records differ from saved ones. Import keeps your saved versions.</p><ul>{preview.review.kept.diary.map((label,index)=><li key={`cj${index}`}>Observation: {label}</li>)}{preview.review.kept.places.map((name,index)=><li key={`cp${index}`}>Site: {name}</li>)}{preview.review.kept.notes.map(name=><li key={`cn${name}`}>Note for {name}</li>)}{preview.review.kept.equipment.map((name,index)=><li key={`ce${index}`}>Equipment: {name}</li>)}</ul></div>}<details><summary>View items in the file</summary><ul>{preview.backup.data.places.map((site,index)=><li key={`p${index}`}>Site: {site.name} · {site.latitude.toFixed(3)}°, {site.longitude.toFixed(3)}°</li>)}{preview.backup.data.targets.map(target=><li key={`t${target}`}>Target: {target}</li>)}{(preview.backup.data.deepTargets||[]).map(target=><li key={`d${target}`}>Deep-sky target: {target}</li>)}{Object.keys(preview.backup.data.notes).map(target=><li key={`n${target}`}>Notes for {target}</li>)}{(preview.backup.data.diary||[]).map(entry=><li key={`j${entry.id}`}>Observation: {entry.target} · {entry.observedAt.slice(0,16).replace('T',' ')} UTC · {entry.place.name}</li>)}{preview.backup.data.equipment.map((setup,index)=><li key={`e${index}`}>Equipment: {setup.name}</li>)}</ul></details><div className="backup-actions"><button className="button primary" onClick={restore}>Import saved plans</button><button className="button" onClick={cancelImport}>Cancel import</button></div></div>}{error&&<p className="error" role="alert">{error}</p>}{status&&<p className="muted" role="status">{status}</p>}<p className="footnote">New backups include deep-sky targets and the observing diary and need this or a newer version of Nightjar. Older backups can still be imported. The file is processed on this device. This is a manual backup; plans do not automatically sync between devices. Live forecasts and the current observing time are not included.</p></section>;
}
