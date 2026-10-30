'use client';
import {watchSavedDataRefresh} from '@/lib/saved-data-refresh';
import {usePendingEditReporter} from '@/hooks/use-pending-edits';
import {targetNoteEditLabel} from '@/lib/target-note-actions';
import {observingTextList} from '@/lib/observing-text-list';
import {observingExportFilename} from '@/lib/observing-export-filename';
import {downloadFile} from '@/lib/download';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {makeTargetNoteRecovery} from '@/lib/target-note-recovery';
import {useEffect,useMemo,useRef,useState,useId,useSyncExternalStore} from 'react';
import {Download, Search, X} from 'lucide-react';
import DocumentPreview from '@/components/document-preview';
import ListFocusRecovery from '@/components/list-focus-recovery';
import ObjectPhoto from '@/components/object-photo';
import TargetRemovalUndo from '@/components/target-removal-undo';
import SavedListControls,{savedListPageSize} from '@/components/saved-list-controls';
import {readSavedTargets,savedTargetsKey,setTargetSaved,validSavedTargetName} from '@/lib/saved-targets';
import {Field,FieldGroup,FieldLabel,FieldDescription} from '@/components/ui/field';
import {targetNotesKey,targetNotesLimit,readTargetNotes,overlayTargetNoteEdits,mergeTargetNoteChanges,targetNoteConflicts,resolveTargetNoteConflicts,saveTargetNotes,type TargetNotes,type TargetNoteBase} from '@/lib/target-notes';
import {Checkbox} from '@/components/ui/checkbox';
import {Place,skyTargets,skyTargetLimit} from '@/lib/sky';
import {findSkyTargets} from '@/lib/sky-target-search';
import {targetConstellation} from '@/lib/target-constellation';
import {constellationLabel} from '@/lib/constellations';
import {printableObservingPlan} from '@/lib/observing-plan';
import {readReportEquipment} from '@/lib/report-equipment';
import type {BrightTargetBrowsing} from '@/lib/target-browsing';
import {useLanguage} from '@/components/language-provider';
import {skyTargetLabel,languageLocale} from '@/lib/language';
import {brightFeedback} from '@/lib/bright-feedback-language';
export default function TargetFinder({date,place,selected,onSelect,browsing}:{browsing:BrightTargetBrowsing;date:Date;place:Place;selected:string;onSelect:(name:string)=>void}){
 const {language,tr,t}=useLanguage();
 const localizeStatus=(value:string)=>brightFeedback(value,language,t);
 const reportPending=usePendingEditReporter('sky',targetNoteEditLabel);
 const [notes,setNotes]=useState<Record<string,string>>({}),[notesReady,setNotesReady]=useState(false),[notesStatus,setNotesStatus]=useState(''),[notesStorageError,setNotesStorageError]=useState(false),[notesReadError,setNotesReadError]=useState(false);
 const pendingNotes=useRef<TargetNotes>({}),pendingNoteBase=useRef<TargetNoteBase>({});
 const [noteReview,setNoteReview]=useState<{base:TargetNoteBase;edits:TargetNotes;stored:TargetNotes;conflicts:string[]}|null>(null);
 const noteReviewHeading=useRef<HTMLHeadingElement>(null),noteReviewButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(noteReview){noteReviewHeading.current?.focus({preventScroll:true});noteReviewHeading.current?.scrollIntoView({block:'start',behavior:'instant'})}},[noteReview]);
 const [managedNote,setManagedNote]=useState(''),[removedNote,setRemovedNote]=useState<{name:string;text:string}|null>(null);
 const managerId=useId(),noteUndo=useRef<HTMLButtonElement>(null),managedNotePicker=useRef<HTMLSelectElement>(null),managedNoteText=useRef<HTMLTextAreaElement>(null),focusRestoredNote=useRef(false);
 useEffect(()=>{if(removedNote){noteUndo.current?.focus({preventScroll:true});noteUndo.current?.scrollIntoView({block:'nearest',behavior:'instant'})}else if(focusRestoredNote.current){focusRestoredNote.current=false;managedNoteText.current?.focus({preventScroll:true});managedNoteText.current?.scrollIntoView({block:'nearest',behavior:'instant'})}},[removedNote]);
 const {query,constellation:constellationFilter,constellationSymbol,aboveOnly,aboveThirty,savedOnly}=useSyncExternalStore(browsing.subscribe,browsing.getSnapshot,browsing.getSnapshot);
 const setQuery=(query:string)=>browsing.update({query}),setAboveOnly=(aboveOnly:boolean)=>browsing.update({aboveOnly}),setAboveThirty=(aboveThirty:boolean)=>browsing.update({aboveThirty}),setSavedOnly=(savedOnly:boolean)=>browsing.update({savedOnly});
 const [olderShown,setOlderShown]=useState(savedListPageSize);
 const [saved,setSaved]=useState<string[]>([]),[ready,setReady]=useState(false),[saveError,setSaveError]=useState(''),[savedReadError,setSavedReadError]=useState(false);
 const [removed,setRemoved]=useState<{name:string}|null>(null),[undoStatus,setUndoStatus]=useState('');
 const savedHeading=useRef<HTMLHeadingElement>(null),searchInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  const read=()=>{try{setSaved(readSavedTargets(localStorage));setSavedReadError(false);setSaveError('')}catch{setSavedReadError(true);setSaveError('Saved targets could not be loaded. The stored list and any previously loaded names were kept.')}setReady(true)};
  read();return watchSavedDataRefresh(read,window,document,{storage:()=>localStorage,key:savedTargetsKey,hidden:()=>document.hidden});
 },[]);
 useEffect(()=>{
  const read=()=>{
   try{
    const loaded=readTargetNotes(localStorage),pending=Object.keys(pendingNotes.current).length>0;
    setNotes(overlayTargetNoteEdits(loaded,pendingNotes.current));setNotesReadError(false);
    setNotesStorageError(pending);setNotesStatus(pending?'Saved notes refreshed. Your unsaved edits are still here; retry to save them.':'');
   }catch{setNotesReadError(true);setNotesStatus('Notes could not be loaded. The stored data is unchanged. Displayed notes, if any, are from an earlier read or edits in this view.')}
   setNotesReady(true);
  };
  read();return watchSavedDataRefresh(read,window,document,{storage:()=>localStorage,key:targetNotesKey,hidden:()=>document.hidden});
 },[]);
 function readLatestTargetNotes(){
  try{const latest=readTargetNotes(localStorage);setNotesReadError(false);return latest}catch{setNotesReadError(true);throw Error('Saved target notes could not be read. Their stored data is unchanged.')}
 }
 function retryReadingNotes(){
  try{const loaded=readLatestTargetNotes(),pending=Object.keys(pendingNotes.current).length>0;setNotes(overlayTargetNoteEdits(loaded,pendingNotes.current));setNotesStorageError(pending);setNotesStatus(pending?'Notes loaded. Your unsaved edits are still here; retry saving or review versions.':'Target notes loaded. No stored values were changed.')}catch{setNotesStatus('Target notes are still unavailable. Your displayed text and stored values were kept.')}
 }
 function persistNoteEdits(){
  try{
   const next=mergeTargetNoteChanges(pendingNoteBase.current,pendingNotes.current,readLatestTargetNotes());
   saveTargetNotes(next,localStorage);pendingNotes.current={};pendingNoteBase.current={};setNoteReview(null);reportPending(false);setNotes(next);setNotesStatus('Notes saved on this browser.');setNotesStorageError(false);return true;
  }catch(error){reportPending(Object.keys(pendingNotes.current).length>0);setNotesStorageError(true);const reason=error instanceof Error&&error.name==='Error'?`${error.message} `:'';setNotesStatus(`${reason}Your edits could not be saved. They remain while Sky atlas is open; leaving this tab or reloading may lose them.`);return false}
 }
 function updateNote(name:string,value:string){
  if(!Object.hasOwn(pendingNotes.current,name))pendingNoteBase.current={...pendingNoteBase.current,[name]:notes[name]??null};setNoteReview(null);
  const edit={[name]:value.slice(0,2000)};pendingNotes.current={...pendingNotes.current,...edit};
  setNotes(overlayTargetNoteEdits(notes,edit));return persistNoteEdits();
 }
 function retrySavingNotes(){
  const owner=document.activeElement,fromManager=Boolean(owner?.closest('.target-note-manager'));
  if(persistNoteEdits())deferFocusAndScroll(()=>fromManager?(managedNoteText.current??managedNotePicker.current):(document.getElementById('target-notes')??savedHeading.current),{owner});
 }
 function downloadUnsavedNotes(){
  try{
   const copy=makeTargetNoteRecovery(pendingNoteBase.current,pendingNotes.current);
   downloadFile(new Blob([copy.text],{type:'application/json'}),`nightjar-unsaved-notes-${copy.exportedAt.slice(0,10)}.json`);
   setNotesStatus(`Recovery copy of ${copy.notes} unsaved ${copy.notes===1?'note':'notes'} prepared for download. Keep the file for manual recovery; it cannot be imported as a plan backup. Your edits remain unsaved.`);
  }catch(error){setNotesStatus(error instanceof Error?error.message:'The note recovery copy could not be prepared. Your edits remain here.')}
 }
 function reviewNoteVersions(){
  try{const stored=readLatestTargetNotes(),base={...pendingNoteBase.current},edits={...pendingNotes.current},conflicts=targetNoteConflicts(base,edits,stored);if(!conflicts.length){retrySavingNotes();return}setNoteReview({base,edits,stored,conflicts});setNotesStatus('Review each saved and unsaved version below. Nothing has been overwritten.');}
  catch(error){setNotesStatus(error instanceof Error?error.message:'Saved note versions could not be read. Your edits remain here.')}
 }
 function resolveNoteVersions(choice:'local'|'stored'){
  if(!noteReview)return;
  try{
   if(JSON.stringify(pendingNotes.current)!==JSON.stringify(noteReview.edits)||JSON.stringify(pendingNoteBase.current)!==JSON.stringify(noteReview.base))throw Error('Your note edits changed after review. Review saved note versions again.');
   const current=readLatestTargetNotes(),next=resolveTargetNoteConflicts(noteReview.base,noteReview.edits,noteReview.stored,current,choice);
   pendingNoteBase.current=next.base;pendingNotes.current=next.edits;setNoteReview(null);setNotes(overlayTargetNoteEdits(current,next.edits));if(persistNoteEdits()){const field=document.getElementById('target-notes');if(field)field.focus();else savedHeading.current?.focus()};
  }catch(error){setNotesStatus(error instanceof Error?error.message:'This note review could not be saved. Your edits remain here.')}
 }
 function removeManagedNote(){
  if(!Object.hasOwn(notes,managedNote))return;
  const text=notes[managedNote];
  // Empty legacy records still occupy a saved slot. There is no text to
  // restore, but their explicit removal must remain available.
  setRemovedNote(text?{name:managedNote,text}:null);updateNote(managedNote,'');setManagedNote('');
  if(!text)managedNotePicker.current?.focus();
 }
 function undoNoteRemoval(){
  if(!removedNote)return;
  setManagedNote(removedNote.name);focusRestoredNote.current=true;
  if(notes[removedNote.name]){setNotesStatus('A note for this target already exists. Its current text was kept.')}else{setManagedNote(removedNote.name);updateNote(removedNote.name,removedNote.text)}
  setRemovedNote(null);
 }
 function readLatestSavedTargets(){
  try{const latest=readSavedTargets(localStorage);setSavedReadError(false);return latest}catch{setSavedReadError(true);throw Error('Saved targets could not be read. The stored list and displayed names were kept.')}
 }
 function retryReadingSavedTargets(){
  try{setSaved(readLatestSavedTargets());setSaveError('');setDownloadStatus('Saved targets loaded. No stored values were changed.')}catch(error){setSaveError(error instanceof Error?error.message:'Saved targets are still unavailable.')}
 }
 function toggleSaved(name:string){
  const remove=saved.includes(name);let latest:string[]|undefined;
  try{latest=readLatestSavedTargets();const next=setTargetSaved(latest,name,!remove,skyTargetLimit,validSavedTargetName);localStorage.setItem(savedTargetsKey,JSON.stringify(next));setSaved(next);setSaveError('');if(remove&&latest.includes(name)){setRemoved({name});setUndoStatus('')}}
  catch(error){if(latest)setSaved(latest);setSaveError(error instanceof Error&&error.name==='Error'?error.message:'This change could not be saved. Your saved target list stays unchanged.')}
 }
 function undoRemoval(){
  if(!removed)return;
  try{const latest=readLatestSavedTargets();if(latest.includes(removed.name)){setSaved(latest);setDownloadStatus(`${removed.name} is already saved. Your current list was kept.`)}else{const next=setTargetSaved(latest,removed.name,true,skyTargetLimit,validSavedTargetName);localStorage.setItem(savedTargetsKey,JSON.stringify(next));setSaved(next);setDownloadStatus(`${removed.name} restored to your targets.`)}setSaveError('');setUndoStatus('');setRemoved(null);savedHeading.current?.focus()}
  catch(error){setUndoStatus(error instanceof Error&&error.name==='Error'?error.message:'This target could not be restored. Undo remains available; free browser storage and retry.')}
 }
 const [downloadStatus,setDownloadStatus]=useState('');
 const targets=useMemo(()=>skyTargets(date,place).sort((a,b)=>b.altitude-a.altitude),[date,place]);
 const memberships=useMemo(()=>new Map(targets.map(target=>[target.name,targetConstellation(target.name,date,place)])),[targets,date,place]);
 const constellationOptions=useMemo(()=>{
  const symbols=new Map<string,string>();
  for(const item of memberships.values())if(item)symbols.set(item.name,item.symbol);
  if(constellationFilter&&!symbols.has(constellationFilter))symbols.set(constellationFilter,constellationSymbol?.name===constellationFilter?constellationSymbol.symbol:'');
  return [...symbols].map(([name,symbol])=>({name,symbol,label:symbol?constellationLabel(symbol,language,name):name})).sort((a,b)=>language==='en'?a.name.localeCompare(b.name):a.label.localeCompare(b.label,languageLocale(language)));
 },[memberships,constellationFilter,constellationSymbol,language]);
 const matches=findSkyTargets(targets,query,aboveThirty?30:aboveOnly?0:null,savedOnly?saved:null,language).filter(target=>!constellationFilter||memberships.get(target.name)?.name===constellationFilter);
 const savedNames=useMemo(()=>new Set(saved),[saved]);
 const savedTargets=useMemo(()=>targets.filter(t=>savedNames.has(t.name)),[targets,savedNames]);
 const otherSaved=useMemo(()=>{const names=new Set(targets.map(target=>target.name));return saved.filter(name=>!names.has(name))},[saved,targets]);
 const target=targets.find(t=>t.name===selected);
 const constellation=target?memberships.get(target.name)??null:null;
 function returnToBrowsing(){deferFocusAndScroll(()=>document.getElementById('bright-target-browsing'))}
 function clearSelection(){onSelect('');returnToBrowsing()}
 function clearFilters(){browsing.update({query:'',constellation:'',constellationSymbol:null,aboveOnly:false,aboveThirty:false,savedOnly:false});searchInput.current?.focus()}
 const emptyMatchMessage=t(savedOnly?(savedReadError?'bright.emptyUnavailable':!savedTargets.length&&otherSaved.length?'bright.emptyOlder':'bright.emptySaved'):'bright.emptyAll');
 const directionLabel=(az:number)=>t((['bright.directionN','bright.directionNE','bright.directionE','bright.directionSE','bright.directionS','bright.directionSW','bright.directionW','bright.directionNW'] as const)[Math.round(az/45)%8]);
 function downloadTargets(){
  try{
   const text=observingTextList({date,place,targets:savedTargets,notes,targetsOmitted:otherSaved.length,notesUnavailable:notesReadError,notesUnsaved:Object.keys(pendingNotes.current).length>0,language});
   downloadFile(new Blob([text],{type:'text/plain;charset=utf-8'}),observingExportFilename('targets',place,date));
   setDownloadStatus('Observing list prepared for download. Open the text file to read or print it.');
  }catch{setDownloadStatus('The observing list could not be created. Please try again.')}
 }
 function buildPrintPlan(){
  const reportEquipment=readReportEquipment(localStorage);
  return printableObservingPlan({date,place,language,targets:savedTargets,targetsOmitted:otherSaved.length,notes,...reportEquipment,notesUnavailable:notesReadError,notesUnsaved:Object.keys(pendingNotes.current).length>0});
 }
 function downloadPrintPlan(){
  try{
   downloadFile(new Blob([buildPrintPlan()],{type:'text/html;charset=utf-8'}),observingExportFilename('plan',place,date));
   setDownloadStatus('Print-ready plan prepared. Open the HTML file offline, then use Print or save as PDF.');
  }catch{setDownloadStatus('The print-ready plan could not be created. Please try again.')}
 }
 return <section id="target-finder" tabIndex={-1} className="panel target-finder"><div className="section-label"><span>{tr('FIND A TARGET','尋找天體')}</span><Search size={18}/></div><div className="saved-targets"><h3 ref={savedHeading} tabIndex={-1}>{tr('Your targets','你的天體清單')} <span>{savedReadError&&!saved.length?tr('unavailable','無法取得'):savedTargets.length}</span></h3>{!savedReadError&&!savedTargets.length&&<p className="muted">{tr('Select an object below, then save it here for your next observing session.','在下方選擇天體並儲存於此，供下次觀測使用。')}</p>}{removed&&<TargetRemovalUndo removal={removed} onUndo={undoRemoval} status={localizeStatus(undoStatus)} disabled={savedReadError}/>}<div className="saved-target-grid">{savedTargets.map(t=><div key={t.name}><button className="saved-target-select" aria-pressed={selected===t.name} onClick={()=>onSelect(t.name)}><strong>{skyTargetLabel(t.name,language)}</strong><span>{t.altitude.toFixed(1)}° · {t.altitude>0?directionLabel(t.azimuth):tr('Below horizon','地平線下')}</span></button><button className="saved-target-remove" aria-label={tr(`Remove ${t.name} from saved targets`,`從已儲存天體中移除 ${t.name}`)} disabled={savedReadError} onClick={()=>toggleSaved(t.name)}><X size={16}/></button></div>)}</div>{saved.length>skyTargetLimit&&<p className="footnote" role="status">{t('bright.legacyLimit',{count:saved.length,limit:skyTargetLimit})}</p>}{otherSaved.length>0&&<details className="other-saved-targets"><summary>{t('bright.otherNames',{count:otherSaved.length})}</summary><p className="footnote">{t('bright.otherHelp',{limit:skyTargetLimit})}</p><div id="older-saved-targets">{otherSaved.slice(0,olderShown).map(name=><div className="saved-row" key={name}><span>{name}</span><button className="button" aria-label={t('bright.removeOlder',{name})} disabled={savedReadError} onClick={()=>toggleSaved(name)}><X size={16}/></button></div>)}</div><SavedListControls count={otherSaved.length} shown={olderShown} onChange={setOlderShown} label="older saved names" listId="older-saved-targets"/></details>}<button className="button saved-target-download" disabled={!ready||savedReadError||!notesReady||!savedTargets.length} onClick={downloadTargets}><Download size={16}/>{t('bright.downloadList')}</button><button className="button saved-target-download" disabled={!ready||savedReadError||!notesReady||!savedTargets.length} onClick={downloadPrintPlan}><Download size={16}/>{t('bright.downloadPlan')}</button><DocumentPreview fallbackFocus={savedHeading} label={tr('Preview observing plan','預覽觀測計畫')} title={tr('Observing plan preview','觀測計畫預覽')} filename={observingExportFilename('plan',place,date)} createDocument={buildPrintPlan} disabled={!ready||savedReadError||!notesReady||!savedTargets.length}/>{downloadStatus&&<p role="status" className="saved-target-note">{localizeStatus(downloadStatus)}</p>}<p className="saved-target-note">{t('bright.savedNote')}</p><details className="target-note-manager"><summary>{t('bright.manageNotes',{count:Object.keys(notes).length})}</summary><p className="footnote">{t('bright.manageHelp',{limit:targetNotesLimit})}</p><FieldGroup><Field><FieldLabel htmlFor={`${managerId}-select`}>{t('bright.noteToManage')}</FieldLabel><select ref={managedNotePicker} id={`${managerId}-select`} value={Object.hasOwn(notes,managedNote)?managedNote:''} onChange={event=>setManagedNote(event.target.value)} disabled={!notesReady}><option value="">{t('bright.chooseNote')}</option>{Object.keys(notes).sort((a,b)=>a.localeCompare(b)).map(name=><option key={name} value={name}>{name}</option>)}</select></Field>{managedNote&&<Field><FieldLabel htmlFor={`${managerId}-text`}>{t('bright.managedFor',{name:managedNote})}</FieldLabel><textarea ref={managedNoteText} id={`${managerId}-text`} rows={4} maxLength={2000} value={notes[managedNote]||''} disabled={!notesReady} onChange={event=>updateNote(managedNote,event.target.value)}/><FieldDescription>{t('bright.savedAutomatically',{count:(notes[managedNote]||'').length})}</FieldDescription><button className="button" onClick={removeManagedNote} disabled={!Object.hasOwn(notes,managedNote)}>{t('bright.removeNote',{name:managedNote})}</button></Field>}</FieldGroup>{removedNote&&<div className="target-note-undo"><button ref={noteUndo} className="button" onClick={undoNoteRemoval}>{t('bright.undoNote',{name:removedNote.name})}</button><p className="footnote">{t('bright.undoNoteHelp')}</p></div>}{notesStatus&&<p id="target-note-recovery" tabIndex={-1} role={target||noteReview?undefined:'status'} className="muted">{localizeStatus(notesStatus)}</p>}{notesStorageError&&<button className="button" onClick={retrySavingNotes}>{t('bright.retryNotesAll')}</button>}</details>{saveError&&<p role="status" className="error">{localizeStatus(saveError)}</p>}{savedReadError&&<div className="target-note-read-error"><p className="footnote">{t('bright.savedUnavailable')}</p><button className="button" onClick={retryReadingSavedTargets}>{t('bright.retrySaved')}</button></div>}</div>{notesReadError&&<div className="target-note-read-error"><p role="status" className="error">{t('bright.notesUnavailable')}</p><button className="button" onClick={retryReadingNotes}>{t('bright.retryReadNotes')}</button></div>}{notesStorageError&&<div className="target-note-review-tools"><button className="button" onClick={downloadUnsavedNotes}><Download size={16}/>{t('bright.downloadUnsaved')}</button><button ref={noteReviewButton} className="button" onClick={reviewNoteVersions}>{t('bright.reviewVersions')}</button></div>}{noteReview&&<section className="target-note-review" aria-labelledby={`${managerId}-review`}><h3 id={`${managerId}-review`} ref={noteReviewHeading} tabIndex={-1}>{t('bright.reviewHeading')}</h3><p>{t('bright.reviewHelp')}</p>{noteReview.conflicts.map(name=><article key={name}><h4>{name}</h4><strong>{t('bright.unsavedVersion')}</strong><p className="target-note-version" role="region" tabIndex={0} aria-label={t('bright.unsavedLabel',{name})}>{noteReview.edits[name]||t('bright.unsavedRemoved')}</p><strong>{t('bright.savedVersion')}</strong><p className="target-note-version" role="region" tabIndex={0} aria-label={t('bright.savedLabel',{name})}>{noteReview.stored[name]||t('bright.noSavedNote')}</p></article>)}<div className="target-note-review-actions"><button className="button" onClick={()=>resolveNoteVersions('local')}>{t('bright.keepReviewed')}</button><button className="button" onClick={()=>resolveNoteVersions('stored')}>{t('bright.useSaved')}</button><button className="button" onClick={()=>{setNoteReview(null);setNotesStatus('Note review cancelled. Your unsaved edits remain here.');noteReviewButton.current?.focus()}}>{t('bright.cancelReview')}</button></div>{notesStatus&&<p role="status">{localizeStatus(notesStatus)}</p>}</section>}{target&&<div id="target-details" tabIndex={-1} className="target-detail" role="region" aria-label={t('bright.selectedDetails')}><div><h3>{skyTargetLabel(target.name,language)}</h3><button type="button" className="button target-browse-return" aria-controls="bright-target-browsing" onClick={returnToBrowsing}>{tr('Back to bright-target browsing','返回明亮天體瀏覽')}</button><p>{t('bright.position',{altitude:target.altitude.toFixed(1),azimuth:target.azimuth.toFixed(1),direction:directionLabel(target.azimuth)})}</p><p className="muted">{tr('Constellation: ','星座：')}{constellation?`${constellationLabel(constellation.symbol,language,constellation.name)} (${constellation.symbol})`:tr('Unavailable','無法取得')}{tr('. ', '。')}{target.planet?tr('Calculated for this site and time.','依此地點及時間計算。'):tr('Based on catalogue coordinates.','依星表座標計算。')}</p><p className="muted">{t('bright.magnitude',{magnitude:target.mag.toFixed(1)})} {t(target.planet?'bright.calculated':'bright.catalogueEstimate')}</p>{(target.name==='Uranus'||target.name==='Neptune')&&<p className="footnote">{t('bright.optics')}</p>}<p className="muted">{t(target.altitude>0?'bright.highlighted':'bright.belowChart')}</p><button className="button save-target" disabled={!ready||savedReadError} aria-pressed={saved.includes(target.name)} onClick={()=>toggleSaved(target.name)}>{saved.includes(target.name)?t('bright.saved'):t('bright.save',{name:target.name})}</button>{saveError&&<p className="error">{localizeStatus(saveError)}</p>}{target.altitude>0&&<a className="button primary" href="#sky-chart">{t('bright.showChart',{name:target.name})}</a>}<ObjectPhoto key={target.name} name={target.name}/><div className="target-notes"><label htmlFor="target-notes">{t('bright.personalNotes',{name:target.name})}</label><textarea id="target-notes" rows={4} maxLength={2000} disabled={!notesReady} value={notes[target.name]||''} onChange={e=>updateNote(target.name,e.target.value)} placeholder={t('bright.notesPlaceholder')} aria-describedby="target-notes-help"/><p id="target-notes-help" className="muted">{t('bright.notesHelp',{count:(notes[target.name]||'').length})}</p>{notesStatus&&<p role={noteReview?undefined:'status'} className="muted">{localizeStatus(notesStatus)}</p>}{notesStorageError&&<button className="button" onClick={retrySavingNotes}>{t('bright.retrySaveNotes')}</button>}</div></div><button className="text-button target-clear" onClick={clearSelection} aria-label={t('bright.clearSelected')} aria-controls="bright-target-browsing"><X size={18}/></button></div>}<div id="bright-target-browsing" tabIndex={-1} className="target-search" role="group" aria-label={tr('Browse bright targets','瀏覽明亮天體')}><label htmlFor="target-search">{tr('Star, planet or Moon','恆星、行星或月球')}<input ref={searchInput} id="target-search" type="search" placeholder={tr('Try Vega, Saturn or Polaris…','例如 Vega、Saturn 或 Polaris…')} value={query} maxLength={100} onChange={e=>setQuery(e.target.value)}/></label><label className="target-constellation-filter" htmlFor="bright-constellation">{tr('Constellation','星座')}<select id="bright-constellation" value={constellationFilter} onChange={event=>{const name=event.target.value,option=constellationOptions.find(item=>item.name===name);browsing.update({constellation:name,constellationSymbol:option?.symbol?{name,symbol:option.symbol}:null})}}><option value="">{tr('All constellations','全部星座')}</option>{constellationOptions.map(option=><option key={option.name} value={option.name}>{option.label}</option>)}</select></label><div className="target-filter-group" role="group" aria-label={tr('Bright-target shortlist and visibility filters','明亮天體清單與可見度篩選')}><label className="target-filter"><Checkbox checked={savedOnly} disabled={(!ready||savedReadError)&&!savedOnly} onCheckedChange={value=>setSavedOnly(value===true)} aria-label={tr('Saved bright targets only','僅顯示已儲存的明亮天體')}/>{tr('Saved targets only','僅顯示已儲存天體')}</label><label className="target-filter"><Checkbox checked={aboveOnly} onCheckedChange={v=>setAboveOnly(v===true)} aria-label={tr('Above horizon only','僅顯示地平線上方')}/>{tr('Above horizon only','僅顯示地平線上方')}</label><label className="target-filter"><Checkbox checked={aboveThirty} onCheckedChange={v=>setAboveThirty(v===true)} aria-label={tr('Above 30° only','僅顯示高度超過 30°')}/>{tr('Above 30° only','僅顯示高度超過 30°')}</label></div></div>{(query||constellationFilter||aboveOnly||aboveThirty||savedOnly)&&<button className="text-button" onClick={clearFilters}>{tr('Clear target filters','清除天體篩選條件')}</button>}<p className="muted target-count" role="status">{savedOnly&&savedReadError&&!saved.length?tr('Saved catalogue results are unavailable.','無法取得已儲存的星表結果。'):language==='zh-Hant'?`${savedOnly?savedTargets.length:targets.length} 個${savedOnly?'已儲存':'星表'}天體中有 ${matches.length} 個符合 · 高度最高優先`:<>{matches.length} of {savedOnly?savedTargets.length:targets.length} {savedOnly?'saved ':''}catalogue targets · highest first</>}</p>{savedOnly&&savedReadError&&<p className="notice" role="status">{t(saved.length?'bright.savedFilterOld':'bright.savedFilterUnavailable')}</p>}{target&&!matches.some(item=>item.name===target.name)&&<p className="notice" role="status">{t('bright.filteredSelection',{name:target.name})}</p>}<ListFocusRecovery listId="target-results" fallback={searchInput}><div id="target-results" className="target-results">{matches.map(t=><button key={t.name} aria-pressed={selected===t.name} className={selected===t.name?'active':''} onClick={()=>onSelect(t.name)}><strong>{skyTargetLabel(t.name,language)}</strong><span>{t.planet?t.name==='Moon'?tr('Moon','月球'):tr('Planet','行星'):tr('Star','恆星')} · {t.altitude.toFixed(1)}° · {t.altitude>0?directionLabel(t.azimuth):tr('Below horizon','地平線下')}</span></button>)}</div></ListFocusRecovery>{target&&<a className="button target-details-link" href="#target-details">{tr(`View ${target.name} details ↑`,`查看 ${target.name} 詳情 ↑`)}</a>}{!matches.length&&<p className="muted">{emptyMatchMessage}</p>}<p className="footnote">{t('bright.note')}</p></section>;
}
