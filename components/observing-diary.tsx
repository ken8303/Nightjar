'use client';
import {usePendingEditReporter} from '@/hooks/use-pending-edits';
import DocumentPreview from '@/components/document-preview';
import {makeDiaryFormRecovery} from '@/lib/diary-form-recovery';
import {downloadFile} from '@/lib/download';
import {useEffect,useRef,useState} from 'react';
import {diaryKey,diaryLimit,readDiary,saveDiary,type Observation} from '@/lib/observing-diary';
import {emptyDiaryDrafts,hasChangedDiaryForms,discardCompletedDrafts,readDiaryDrafts,readStoredDiaryDrafts,mergeDiaryDraftChanges,diaryDraftConflicts,resolveDiaryDraftConflicts,saveDiaryDrafts,sameObservation,startDiaryEdit,type DiaryDraftState} from '@/lib/diary-drafts';
import {filterDiary,diaryDateInput,emptyDiaryFilters,type DiaryFilters} from '@/lib/diary-filters';
import {removeDiaryEntry,restoreDiaryEntry} from '@/lib/diary-removal';
import {diaryCSV,diaryReport} from '@/lib/diary-export';
import {diaryLocalTime,diaryUtcTime,diarySiteLabel} from '@/lib/diary-time';
import {type Place} from '@/lib/sky';
type Draft={outcome:Observation['outcome'];equipment:string;notes:string};
const empty:Draft={outcome:'seen',equipment:'',notes:''};
const outcomeLabels={'seen':'Seen','not-seen':'Not seen','imaged':'Imaged'};
export default function ObservingDiary({target,date,place}:{target:string;date:Date;place:Place}){
 const reportPending=usePendingEditReporter('sky','unfinished diary forms');
 const [removedEntry,setRemovedEntry]=useState<Observation|null>(null),[removalStatus,setRemovalStatus]=useState('');
 const undoRemovalButton=useRef<HTMLButtonElement>(null),savedDiaryHeading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(removedEntry){undoRemovalButton.current?.focus({preventScroll:true});undoRemovalButton.current?.scrollIntoView({block:'center',behavior:'instant'})}},[removedEntry]);
 const [entries,setEntries]=useState<Observation[]>([]),[ready,setReady]=useState(false),[status,setStatus]=useState(''),[showAll,setShowAll]=useState(false),[visible,setVisible]=useState(10);
 useEffect(()=>{const read=()=>{try{setEntries(readDiary(localStorage));setStatus('')}catch{setStatus('Your diary could not be read. Existing data is preserved; saving is unavailable.');setReady(false);return}setReady(true)};read();const sync=(event:StorageEvent)=>{if(event.storageArea===localStorage&&(event.key===diaryKey||event.key===null))read()};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 const [draftState,setDraftState]=useState<DiaryDraftState>(emptyDiaryDrafts),[draftStatus,setDraftStatus]=useState('');
 const draftRef=useRef(draftState),savedDraftSnapshot=useRef<DiaryDraftState>(emptyDiaryDrafts());
 const [draftSaveFailed,setDraftSaveFailed]=useState(false);
 const [formCopy,setFormCopy]=useState<{source:DiaryDraftState;message:string}|null>(null);
 const formCopyStatus=formCopy?.source===draftState?formCopy.message:'';
 const [draftReview,setDraftReview]=useState<{base:DiaryDraftState;local:DiaryDraftState;stored:DiaryDraftState;conflicts:ReturnType<typeof diaryDraftConflicts>;resolved:boolean}|null>(null);
 useEffect(()=>{const restore=()=>{const recovered=readDiaryDrafts();let state=recovered.state;try{state=discardCompletedDrafts(state,readDiary(localStorage))}catch{}savedDraftSnapshot.current=recovered.state;draftRef.current=state;setDraftState(state);const completed=Boolean(recovered.state.drafts.length||recovered.state.edit)&&!state.drafts.length&&!state.edit;setDraftStatus(completed?'':recovered.status)};restore()},[]);
 function persistDrafts(next:DiaryDraftState){
  draftRef.current=next;setDraftState(next);
  try{
   const merged=mergeDiaryDraftChanges(savedDraftSnapshot.current,next,readStoredDiaryDrafts(localStorage));
   if(!saveDiaryDrafts(merged))throw Error('Unfinished forms could not be saved. Keep this view open, free browser storage and retry; your text is retained here.');
   savedDraftSnapshot.current=merged;draftRef.current=merged;setDraftState(merged);setDraftSaveFailed(false);reportPending(false);
   setDraftStatus(merged.drafts.length||merged.edit?'Unfinished forms saved on this browser.':'');
  }catch(error){reportPending(hasChangedDiaryForms(savedDraftSnapshot.current,next));setDraftSaveFailed(true);setDraftStatus(error instanceof Error?error.message:'Unfinished forms could not be saved. Your text is retained here.');}
 }
 function downloadFormCopy(){
  const source=draftRef.current;
  try{const copy=makeDiaryFormRecovery(source);downloadFile(new Blob([copy.text],{type:'application/json'}),`nightjar-form-recovery-${copy.exportedAt.slice(0,10)}.json`);setFormCopy({source,message:`Recovery copy prepared with ${copy.forms} unfinished ${copy.forms===1?'form':'forms'} from this view. Verify the file is saved before leaving; it cannot be imported as a plan backup.`});}
  catch{setFormCopy({source,message:'The form recovery copy could not be prepared. Your text remains in this view; copy it before leaving if storage is unavailable.'});}
 }
 function reviewDrafts(){
  try{const stored=readStoredDiaryDrafts(localStorage),conflicts=diaryDraftConflicts(savedDraftSnapshot.current,draftRef.current,stored);setDraftReview({base:savedDraftSnapshot.current,local:draftRef.current,stored,conflicts,resolved:false});if(!conflicts.length)setDraftStatus('No conflicting forms remain. Retry saving to preserve your changes and the latest unrelated forms.');}
  catch(error){setDraftStatus(error instanceof Error?error.message:'Stored forms could not be read. Your text is retained here.');}
 }
 function resolveDrafts(choice:'local'|'stored'){
  if(!draftReview||draftReview.resolved)return;
  try{if(JSON.stringify(draftRef.current)!==JSON.stringify(draftReview.local)||JSON.stringify(savedDraftSnapshot.current)!==JSON.stringify(draftReview.base))throw Error('Your form changed after this review. Review saved form versions again before choosing a version.');const resolved=resolveDiaryDraftConflicts(draftReview.base,draftReview.local,draftReview.stored,readStoredDiaryDrafts(localStorage),choice);savedDraftSnapshot.current=resolved.base;persistDrafts(resolved.desired);setDraftReview({...draftReview,resolved:true});}
  catch(error){setDraftStatus(error instanceof Error?error.message:'The reviewed forms could not be resolved. Your text is retained here.');}
 }
 const [clearedDraft,setClearedDraft]=useState<Observation|null>(null);
 function clearDraft(){if(pending){setClearedDraft(pending);persistDrafts({...draftRef.current,drafts:draftRef.current.drafts.filter(entry=>entry.target!==target)});setStatus('Unfinished form cleared. You can undo while this explorer remains open.')}}
 function undoClear(){if(!clearedDraft)return;if(draftRef.current.drafts.some(entry=>entry.target===clearedDraft.target)){setStatus('A new unfinished form exists for this object. Clear or save it before undoing.');return}persistDrafts({...draftRef.current,drafts:[...draftRef.current.drafts,clearedDraft]});setClearedDraft(null);setStatus('Unfinished form restored.')}
 const editing=draftState.edit?.original??null,pending=draftState.drafts.find(entry=>entry.target===target);
 const [filters,setFilters]=useState<DiaryFilters>({...emptyDiaryFilters});
 function filterChange(patch:Partial<DiaryFilters>){setFilters(value=>({...value,...patch}));setVisible(10)}
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(editing){heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'instant'})}},[editing]);
 const draft=draftState.edit?.draft??pending??empty;
 function change(patch:Partial<Draft>){
  const current=draftRef.current;
  if(current.edit){persistDrafts({...current,edit:{...current.edit,draft:{...current.edit.draft,...patch}}});return}
  const previous=current.drafts.find(entry=>entry.target===target),next:Observation={...(previous||{id:crypto.randomUUID(),target,observedAt:date.toISOString(),place:{...place},...empty}),...patch};
  persistDrafts({...current,drafts:[...current.drafts.filter(entry=>entry.target!==target),next]});
 }
 function startEdit(entry:Observation){
  try{const next=startDiaryEdit(draftRef.current,entry);if(next!==draftRef.current){persistDrafts(next);setStatus('')}else{setStatus('You are already editing this observation. Your unfinished changes are kept.');heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'instant'})}}
  catch(error){setStatus(error instanceof Error?error.message:'The current diary edit could not be replaced. Your text is kept.');heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'instant'})}
 }
 function cancelEdit(){persistDrafts({...draftRef.current,edit:null})}
 function useCurrentSnapshot(){if(pending)persistDrafts({...draftRef.current,drafts:draftRef.current.drafts.map(entry=>entry.target===target?{...entry,observedAt:date.toISOString(),place:{...place}}:entry)})}
 function save(){
  try{
   const latest=readDiary(localStorage);
   if(editing){const current=latest.find(entry=>entry.id===editing.id);if(!current||!sameObservation(current,editing))throw Error('This observation changed since you started editing. Your text is retained. Cancel editing and reopen the latest entry before saving.');}
   if(!editing&&pending&&latest.some(entry=>entry.id===pending.id))throw Error('This draft was already saved or changed elsewhere. Your text is retained; reopen the saved entry to review it.');
   if(!editing&&latest.length>=diaryLimit)throw Error(`The diary holds up to ${diaryLimit} entries. Export a backup, then remove older saved entries to free space.`);
   const entry:Observation=editing?{...draftState.edit!.draft}:pending?{...pending}:{id:crypto.randomUUID(),target,observedAt:date.toISOString(),place:{...place},...draft};
   const next=editing?latest.map(value=>value.id===entry.id?entry:value):[...latest,entry];
   saveDiary(next,localStorage);setEntries(next);setStatus(editing?'Diary entry updated on this browser.':'Observation saved on this browser.');persistDrafts({...draftRef.current,edit:editing?null:draftRef.current.edit,drafts:editing?draftRef.current.drafts:draftRef.current.drafts.filter(entry=>entry.target!==target)});
  }catch(error){setStatus(error instanceof Error?error.message:'The observation could not be saved. Your text is still here.')}
 }
 function removeEntry(entry:Observation){
  setStatus('');
  let latest:Observation[]|undefined;
  try{
   latest=readDiary(localStorage);const next=removeDiaryEntry(latest,entry);
   saveDiary(next.entries,localStorage);setEntries(next.entries);setRemovedEntry(next.removed);
   setRemovalStatus(`${entry.target} observation removed. Undo is available until the next removal or leaving Sky atlas. Unfinished form text is kept.`);
  }catch(error){if(latest)setEntries(latest);setRemovalStatus(error instanceof Error&&error.name==='Error'?error.message:'The observation could not be removed. Browser storage is unavailable; your saved diary is unchanged.')}
 }
 function undoRemoval(){
  if(!removedEntry)return;
  try{
   const next=restoreDiaryEntry(readDiary(localStorage),removedEntry);
   if(next.restored)saveDiary(next.entries,localStorage);
   setEntries(next.entries);setRemovedEntry(null);
   setRemovalStatus(next.restored?`${removedEntry.target} observation restored with its original site and time.`:'This observation is already saved. Its current version was kept.');
   savedDiaryHeading.current?.focus({preventScroll:true});
  }catch(error){setRemovalStatus(error instanceof Error&&error.name==='Error'?error.message:'The observation could not be restored. Browser storage is full or unavailable; Undo is still available while Sky atlas stays open.')}
 }
 const scoped=entries.filter(entry=>showAll||entry.target===target),filtered=filterDiary(scoped,filters),shown=filtered.entries;
 const activeFilters=Boolean(filters.query||filters.outcome||filters.from||filters.through);
 function download(format:'html'|'csv'){
  try{
   const content=format==='html'?diaryReport(shown):diaryCSV(shown);
   downloadFile(new Blob([content],{type:format==='html'?'text/html;charset=utf-8':'text/csv;charset=utf-8'}),`nightjar-diary-${showAll?'all':target}.${format}`);
   setStatus(`${shown.length} saved observation${shown.length===1?'':'s'} prepared as ${format==='html'?'an offline report. Open the file to print or save as PDF':'CSV. Open the file in a spreadsheet'}. Unsaved form edits are excluded.`);
  }catch{setStatus('The diary download could not be prepared. Your saved observations have not changed.')}
 }
 const stamp=diaryLocalTime;
 return <section id="observing-diary" tabIndex={-1} className="observing-diary" aria-label="Deep-sky observing diary"><div className="section-label">OBSERVING DIARY</div><h3 ref={heading} tabIndex={-1} style={{scrollMarginTop:24}}>{editing?`Edit ${editing.target} observation`:`Record an observation of ${target}`}</h3><p className="muted">{editing?`${stamp(editing)} · ${diarySiteLabel(editing.place)}. Editing keeps the original site and time.`:pending?`Unfinished observation from ${stamp(pending)} · ${diarySiteLabel(pending.place)}. Saving keeps this original site and time.`:`Uses the selected observing time and site: ${diaryUtcTime(date.toISOString())} · ${diarySiteLabel(place)}. Change the planner time above if needed.`}</p>{pending&&!editing&&<div className="diary-actions"><button className="button" onClick={useCurrentSnapshot}>Use current site and time for this draft</button><button className="button" onClick={clearDraft}>Clear unfinished form</button></div>}{clearedDraft&&<button className="button" onClick={undoClear}>Undo clear of {clearedDraft.target} form</button>}<form onSubmit={event=>{event.preventDefault();save()}}><div className="diary-fields"><label>Observation result<select value={draft.outcome} onChange={event=>change({outcome:event.target.value as Draft['outcome']})}>{Object.entries(outcomeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Equipment used<input maxLength={100} placeholder="Naked eye, binoculars or telescope…" value={draft.equipment} onChange={event=>change({equipment:event.target.value})}/></label></div><label>Observation notes<textarea rows={4} maxLength={2000} placeholder="Details, conditions and what you noticed…" value={draft.notes} onChange={event=>change({notes:event.target.value})}/></label><div className="diary-actions"><button className="button primary" disabled={!ready}>{editing?'Save diary changes':'Save observation'}</button>{editing&&<button type="button" className="button" onClick={cancelEdit}>Cancel diary edit</button>}</div></form>{draftStatus&&<p className="footnote" role="status">{draftStatus}</p>}{draftSaveFailed&&<div className="diary-actions"><button className="button" onClick={()=>persistDrafts(draftRef.current)}>Retry saving unfinished forms</button><button className="button" onClick={reviewDrafts}>Review saved form versions</button><button className="button" onClick={downloadFormCopy}>Download form recovery copy</button></div>}{draftSaveFailed&&<p className="footnote">A form copy includes unfinished text currently held here and may omit newer changes from other tabs. It can contain private sites and notes. It does not change browser storage.</p>}{formCopyStatus&&<p role="status" className="footnote">{formCopyStatus}</p>}{draftReview&&draftReview.conflicts.length>0&&<section className="diary-draft-review" aria-label="Review conflicting diary forms"><h4>{draftReview.resolved?'Reviewed form copies':'Choose which form version to keep'}</h4><p className="footnote">These reviewed copies remain until another review or leaving Sky atlas. Choosing a version applies only to the conflicting forms below; unrelated forms stay saved.</p>{draftReview.conflicts.map(conflict=><details key={`${conflict.kind}-${conflict.target}`} open><summary>{conflict.target} · {conflict.kind==='edit'?'Saved-observation edit':'Unfinished observation'}</summary>{([['Your version',conflict.local],['Saved version',conflict.stored]] as const).map(([label,entry])=><div key={label}><strong>{label}</strong>{entry?<><p className="footnote">{entry.observedAt} · {entry.place.name} · {outcomeLabels[entry.outcome]} · {entry.equipment||'No equipment entered'}</p><label>{label} notes for {conflict.target}<textarea readOnly rows={3} value={entry.notes}/></label></>:<p className="footnote">This version removes the form.</p>}</div>)}</details>)}{!draftReview.resolved&&<div className="diary-actions"><button className="button" onClick={()=>resolveDrafts('local')}>Keep my reviewed versions</button><button className="button" onClick={()=>resolveDrafts('stored')}>Keep saved reviewed versions</button></div>}</section>}{status&&<p role="status" className="muted">{status}</p>}<p className="footnote">Saved observations are included in plan backups. Unfinished forms save separately on this browser and are excluded from plan backups and saved-observation reports. A form recovery copy is available after a save problem. Up to {diaryLimit} saved entries.</p><label className="diary-filter"><input type="checkbox" checked={showAll} onChange={event=>{setShowAll(event.target.checked);setVisible(10)}}/>Show observations for all deep-sky objects</label><div className="diary-search-filters" role="group" aria-label="Filter saved diary observations"><label>Search diary<input type="search" maxLength={100} placeholder="Object, site, country, equipment or notes…" value={filters.query} onChange={event=>filterChange({query:event.target.value})}/></label><label>Filter by observation result<select value={filters.outcome} onChange={event=>filterChange({outcome:event.target.value as DiaryFilters['outcome']})}><option value="">All results</option>{Object.entries(outcomeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>From date (UTC)<input type="text" inputMode="numeric" maxLength={10} placeholder="YYYY-MM-DD" value={filters.from} onChange={event=>filterChange({from:diaryDateInput(event.target.value)})}/></label><label>Through date (UTC)<input type="text" inputMode="numeric" maxLength={10} placeholder="YYYY-MM-DD" value={filters.through} onChange={event=>filterChange({through:diaryDateInput(event.target.value)})}/></label></div><p className="footnote">Enter YYYY-MM-DD or eight digits (YYYYMMDD). Date filters include both endpoints and use the recorded UTC date, which can differ from the date at your observing site.</p>{activeFilters&&<button className="button" onClick={()=>{setFilters({...emptyDiaryFilters});setVisible(10)}}>Clear diary filters</button>}{filtered.error&&<p className="error" role="alert">{filtered.error}</p>}<p className="muted" role="status">{shown.length} of {scoped.length} saved observations match this filter.</p><h4 ref={savedDiaryHeading} tabIndex={-1}>{showAll?'Your deep-sky observations':`${target} observations`} · {shown.length}</h4>{removalStatus&&<p role="status" className="muted">{removalStatus}</p>}{removedEntry&&<div className="diary-removal-undo"><button ref={undoRemovalButton} className="button" onClick={undoRemoval}>Undo removal of {removedEntry.target} observation</button><p className="footnote">Available until the next removal or leaving Sky atlas. Saved backups are unchanged.</p></div>}<div className="diary-actions diary-downloads"><DocumentPreview label="Preview diary report" title="Observing diary preview" description="Review saved observations in this filter. Unfinished forms are excluded. Download the HTML file to print or save as PDF." filename={`nightjar-diary-${showAll?'all':target}.html`} createDocument={()=>diaryReport(shown)} disabled={!ready||!shown.length||Boolean(filtered.error)}/><button className="button" disabled={!ready||!shown.length||Boolean(filtered.error)} onClick={()=>download('html')}>Download diary report</button><button className="button" disabled={!ready||!shown.length||Boolean(filtered.error)} onClick={()=>download('csv')}>Download diary CSV</button></div><p className="footnote">Downloads include all saved entries in this filter, including entries beyond “Show more”. Reports and CSV files are snapshots; use plan backups for restoring data.</p><div className="diary-entries">{shown.slice(0,visible).map(entry=><article key={entry.id}><div><strong>{entry.target} · {outcomeLabels[entry.outcome]}</strong><button className="text-button" aria-label={`Edit ${entry.target} observation from ${stamp(entry)}`} onClick={()=>startEdit(entry)}>Edit</button><button className="text-button" aria-label={`Remove ${entry.target} observation from ${stamp(entry)}`} onClick={()=>removeEntry(entry)} disabled={!ready}>Remove</button></div><p className="muted">{stamp(entry)} · {entry.place.timezone||'UTC'} · {diarySiteLabel(entry.place)}</p><p className="footnote">{diaryUtcTime(entry.observedAt)} · {entry.place.latitude.toFixed(3)}°, {entry.place.longitude.toFixed(3)}°{entry.equipment?` · ${entry.equipment}`:''}</p>{entry.notes&&<p className="diary-note">{entry.notes}</p>}</article>)}</div>{!shown.length&&!filtered.error&&<p className="muted">{scoped.length?'No observations match these filters. Clear the filters or try another search.':'No observations recorded for this object scope yet.'}</p>}{shown.length>visible&&<button className="button" onClick={()=>setVisible(value=>value+10)}>Show more observations</button>}</section>;
}
