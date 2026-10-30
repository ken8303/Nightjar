'use client';
import {usePendingEditReporter} from '@/hooks/use-pending-edits';
import {watchSavedDataRefresh} from '@/lib/saved-data-refresh';
import {diaryFormEditLabel} from '@/lib/diary-form-actions';
import DocumentPreview from '@/components/document-preview';
import ListFocusRecovery from '@/components/list-focus-recovery';
import {makeDiaryFormRecovery} from '@/lib/diary-form-recovery';
import {downloadFile} from '@/lib/download';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {diaryKey,diaryLimit,readDiary,saveDiary,type Observation} from '@/lib/observing-diary';
import {emptyDiaryDrafts,hasChangedDiaryForms,discardCompletedDrafts,readDiaryDrafts,readStoredDiaryDrafts,mergeDiaryDraftChanges,diaryDraftConflicts,resolveDiaryDraftConflicts,saveDiaryDrafts,sameObservation,startDiaryEdit,type DiaryDraftState} from '@/lib/diary-drafts';
import {filterDiary,diaryDateInput,emptyDiaryFilters,type DiaryFilters} from '@/lib/diary-filters';
import {removeDiaryEntry,restoreDiaryEntry} from '@/lib/diary-removal';
import {diaryCSV,diaryReport} from '@/lib/diary-export';
import {diaryLocalTime,diaryUtcTime,diarySiteLabel} from '@/lib/diary-time';
import {languageLocale} from '@/lib/language';
import {type Place} from '@/lib/sky';
import type {DiaryBrowsing} from '@/lib/target-browsing';
import {useLanguage} from '@/components/language-provider';
import {diaryFeedback} from '@/lib/diary-feedback-language';
type Draft={outcome:Observation['outcome'];equipment:string;notes:string};
const empty:Draft={outcome:'seen',equipment:'',notes:''};
const outcomeLabels={'seen':'Seen','not-seen':'Not seen','imaged':'Imaged'};
export default function ObservingDiary({target,date,place,browsing,onBrowse}:{target:string;date:Date;place:Place;browsing:DiaryBrowsing;onBrowse:()=>void}){
 const {language,tr,t}=useLanguage();
 const outcomeLabel=(value:Observation['outcome'])=>language==='zh-Hant'?({'seen':'已看到','not-seen':'未看到','imaged':'已拍攝'} as const)[value]:outcomeLabels[value];
 const reportPending=usePendingEditReporter('sky',diaryFormEditLabel);
 const [removedEntry,setRemovedEntry]=useState<Observation|null>(null),[removalStatus,setRemovalStatus]=useState('');
 const undoRemovalButton=useRef<HTMLButtonElement>(null),undoClearButton=useRef<HTMLButtonElement>(null),savedDiaryHeading=useRef<HTMLHeadingElement>(null),feedback=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(removedEntry){undoRemovalButton.current?.focus({preventScroll:true});undoRemovalButton.current?.scrollIntoView({block:'center',behavior:'instant'})}},[removedEntry]);
 const [entries,setEntries]=useState<Observation[]>([]),[ready,setReady]=useState(false),[diaryReadError,setDiaryReadError]=useState(false),[status,setStatus]=useState(''),[visible,setVisible]=useState(10);
 const {showAll,...filters}=useSyncExternalStore(browsing.subscribe,browsing.getSnapshot,browsing.getSnapshot);
 const setShowAll=(showAll:boolean)=>browsing.update({showAll});
 useEffect(()=>{const read=()=>{try{setEntries(readDiary(localStorage));setDiaryReadError(false);setStatus('')}catch{setDiaryReadError(true);setStatus('Your saved diary could not be read. Stored data, displayed entries and unfinished forms were kept.');setReady(false);return}setReady(true)};read();return watchSavedDataRefresh(read,window,document,{storage:()=>localStorage,key:diaryKey,hidden:()=>document.hidden})},[]);
 const [draftState,setDraftState]=useState<DiaryDraftState>(emptyDiaryDrafts),[draftStatus,setDraftStatus]=useState('');
 const draftRef=useRef(draftState),savedDraftSnapshot=useRef<DiaryDraftState>(emptyDiaryDrafts());
 const [draftSaveFailed,setDraftSaveFailed]=useState(false),[draftReadError,setDraftReadError]=useState(false);
 const [formCopy,setFormCopy]=useState<{source:DiaryDraftState;message:string}|null>(null);
 const formCopyStatus=formCopy?.source===draftState?formCopy.message:'';
 const [draftReview,setDraftReview]=useState<{base:DiaryDraftState;local:DiaryDraftState;stored:DiaryDraftState;conflicts:ReturnType<typeof diaryDraftConflicts>;resolved:boolean}|null>(null);
 const draftReviewHeading=useRef<HTMLHeadingElement>(null),draftReviewOwner=useRef<Element|null>(null);
 useEffect(()=>{if(draftReview)deferFocusAndScroll(()=>draftReview.conflicts.length?draftReviewHeading.current:document.getElementById('diary-form-recovery')??heading.current,{owner:draftReviewOwner.current})},[draftReview]);
 useEffect(()=>{const restore=()=>{const recovered=readDiaryDrafts();setDraftReadError(recovered.unavailable);let state=recovered.state;try{state=discardCompletedDrafts(state,readDiary(localStorage))}catch{}savedDraftSnapshot.current=recovered.state;draftRef.current=state;setDraftState(state);const completed=Boolean(recovered.state.drafts.length||recovered.state.edit)&&!state.drafts.length&&!state.edit;setDraftStatus(completed?'':recovered.status)};restore()},[]);
 function readLatestDiaryDrafts(){
  try{const stored=readStoredDiaryDrafts(localStorage);setDraftReadError(false);return stored}catch(error){setDraftReadError(true);throw error}
 }
 function retryReadingDiaryDrafts(){
  const owner=document.activeElement;
  try{
   const stored=readLatestDiaryDrafts(),merged=mergeDiaryDraftChanges(savedDraftSnapshot.current,draftRef.current,stored),changed=JSON.stringify(merged)!==JSON.stringify(stored);
   savedDraftSnapshot.current=stored;draftRef.current=merged;setDraftState(merged);setDraftReview(null);setDraftSaveFailed(changed);reportPending(hasChangedDiaryForms(stored,merged));
   setDraftStatus(changed?'Unfinished forms loaded. Your local changes are retained; retry saving to preserve them. No stored values were changed.':'Unfinished forms loaded. No stored values were changed.');
   deferFocusAndScroll(()=>document.getElementById('diary-form-recovery')??heading.current,{owner});
  }catch(error){setDraftSaveFailed(true);reportPending(hasChangedDiaryForms(savedDraftSnapshot.current,draftRef.current));setDraftStatus(error instanceof Error?error.message:'Unfinished forms are still unavailable. Your text and stored values were kept.');deferFocusAndScroll(()=>owner?.isConnected?null:document.getElementById('diary-form-recovery')??heading.current,{owner})}
 }
 function persistDrafts(next:DiaryDraftState){
  draftRef.current=next;setDraftState(next);
  try{
   const merged=mergeDiaryDraftChanges(savedDraftSnapshot.current,next,readLatestDiaryDrafts());
   if(!saveDiaryDrafts(merged))throw Error('Unfinished forms could not be saved. Keep this view open, free browser storage and retry; your text is retained here.');
   savedDraftSnapshot.current=merged;draftRef.current=merged;setDraftState(merged);setDraftSaveFailed(false);reportPending(false);
   setDraftStatus(merged.drafts.length||merged.edit?'Unfinished forms saved on this browser.':'');return true;
  }catch(error){reportPending(hasChangedDiaryForms(savedDraftSnapshot.current,next));setDraftSaveFailed(true);setDraftStatus(error instanceof Error?error.message:'Unfinished forms could not be saved. Your text is retained here.');return false;}
 }
 function retrySavingDrafts(){if(persistDrafts(draftRef.current))deferFocusAndScroll(()=>document.getElementById('diary-form-recovery')??heading.current)}
 function downloadFormCopy(){
  const source=draftRef.current;
  try{const copy=makeDiaryFormRecovery(source);downloadFile(new Blob([copy.text],{type:'application/json'}),`nightjar-form-recovery-${copy.exportedAt.slice(0,10)}.json`);setFormCopy({source,message:`Recovery copy prepared with ${copy.forms} unfinished ${copy.forms===1?'form':'forms'} from this view. Verify the file is saved before leaving; it cannot be imported as a plan backup.`});}
  catch{setFormCopy({source,message:'The form recovery copy could not be prepared. Your text remains in this view; copy it before leaving if storage is unavailable.'});}
 }
 function reviewDrafts(){
  draftReviewOwner.current=document.activeElement;
  try{const stored=readLatestDiaryDrafts(),conflicts=diaryDraftConflicts(savedDraftSnapshot.current,draftRef.current,stored);setDraftReview({base:savedDraftSnapshot.current,local:draftRef.current,stored,conflicts,resolved:false});if(!conflicts.length)setDraftStatus('No conflicting forms remain. Retry saving to preserve your changes and the latest unrelated forms.');}
  catch(error){setDraftStatus(error instanceof Error?error.message:'Stored forms could not be read. Your text is retained here.');}
 }
 function resolveDrafts(choice:'local'|'stored'){
  if(!draftReview||draftReview.resolved)return;
  draftReviewOwner.current=document.activeElement;
  try{if(JSON.stringify(draftRef.current)!==JSON.stringify(draftReview.local)||JSON.stringify(savedDraftSnapshot.current)!==JSON.stringify(draftReview.base))throw Error('Your form changed after this review. Review saved form versions again before choosing a version.');const resolved=resolveDiaryDraftConflicts(draftReview.base,draftReview.local,draftReview.stored,readLatestDiaryDrafts(),choice);savedDraftSnapshot.current=resolved.base;persistDrafts(resolved.desired);setDraftReview({...draftReview,resolved:true});}
  catch(error){setDraftStatus(error instanceof Error?error.message:'The reviewed forms could not be resolved. Your text is retained here.');}
 }
 const [clearedDraft,setClearedDraft]=useState<Observation|null>(null);
 function clearDraft(){
  if(!pending)return;
  const owner=document.activeElement;
  setClearedDraft(pending);
  const saved=persistDrafts({...draftRef.current,drafts:draftRef.current.drafts.filter(entry=>entry.target!==target)});
  setStatus('Unfinished form cleared. You can undo while this explorer remains open.');
  deferFocusAndScroll(()=>saved?undoClearButton.current:document.getElementById('diary-form-recovery')??heading.current,{owner});
 }
 function undoClear(){
  if(!clearedDraft)return;
  if(draftRef.current.drafts.some(entry=>entry.target===clearedDraft.target)){setStatus('A new unfinished form exists for this object. Clear or save it before undoing.');return}
  const owner=document.activeElement,restoredTarget=clearedDraft.target;
  const saved=persistDrafts({...draftRef.current,drafts:[...draftRef.current.drafts,clearedDraft]});
  setClearedDraft(null);setStatus(`${restoredTarget} unfinished form restored.`);
  deferFocusAndScroll(()=>!saved?document.getElementById('diary-form-recovery')??heading.current:restoredTarget===target?heading.current:feedback.current,{owner});
 }
 const editing=draftState.edit?.original??null,pending=draftState.drafts.find(entry=>entry.target===target);
 const filterSearch=useRef<HTMLInputElement>(null);
 function filterChange(patch:Partial<DiaryFilters>){browsing.update(patch);setVisible(10)}
 function clearFilters(){browsing.update(emptyDiaryFilters);setVisible(10);filterSearch.current?.focus({preventScroll:true});filterSearch.current?.scrollIntoView({block:'center',behavior:'instant'})}
 const heading=useRef<HTMLHeadingElement>(null);
 // Saving each character normalizes the original observation into a new object.
 // Only opening a different entry should move the viewport away from its editor.
 const editingId=editing?.id;
 useEffect(()=>{if(editingId){heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'instant'})}},[editingId]);
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
 function cancelEdit(){
  const owner=document.activeElement,id=draftRef.current.edit?.original.id;
  const saved=persistDrafts({...draftRef.current,edit:null});
  deferFocusAndScroll(()=>{
   if(draftRef.current.edit)return null;
   if(!saved)return document.getElementById('diary-form-recovery')??heading.current;
   return Array.from(document.querySelectorAll<HTMLButtonElement>('#diary-entries [data-diary-edit]')).find(button=>button.dataset.diaryEdit===id)??savedDiaryHeading.current;
  },{owner});
 }
 function useCurrentSnapshot(){if(pending)persistDrafts({...draftRef.current,drafts:draftRef.current.drafts.map(entry=>entry.target===target?{...entry,observedAt:date.toISOString(),place:{...place}}:entry)})}
 function readLatestDiary(){
  // A rejected action still needs to display the saved version it just checked.
  try{const latest=readDiary(localStorage);setEntries(latest);setDiaryReadError(false);setReady(true);return latest}catch{setDiaryReadError(true);setReady(false);throw Error('Your saved diary could not be read. Stored data, displayed entries and unfinished forms were kept.')}
 }
 function retryReadingDiary(){
  try{readLatestDiary();setStatus('Saved observations loaded. No stored values or unfinished forms were changed.');deferFocusAndScroll(()=>savedDiaryHeading.current)}catch(error){setStatus(error instanceof Error?error.message:'Saved observations are still unavailable.')}
 }
 function save(){
  try{
   const latest=readLatestDiary();
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
   latest=readLatestDiary();const next=removeDiaryEntry(latest,entry);
   saveDiary(next.entries,localStorage);setEntries(next.entries);setRemovedEntry(next.removed);
   setRemovalStatus(`${entry.target} observation removed. Undo is available until the next removal or leaving Sky atlas. Unfinished form text is kept.`);
  }catch(error){if(latest)setEntries(latest);setRemovalStatus(error instanceof Error&&error.name==='Error'?error.message:'The observation could not be removed. Browser storage is unavailable; your saved diary is unchanged.')}
 }
 function undoRemoval(){
  if(!removedEntry)return;
  try{
   const next=restoreDiaryEntry(readLatestDiary(),removedEntry);
   if(next.restored)saveDiary(next.entries,localStorage);
   setEntries(next.entries);setRemovedEntry(null);
   setRemovalStatus(next.restored?`${removedEntry.target} observation restored with its original site and time.`:'This observation is already saved. Its current version was kept.');
   savedDiaryHeading.current?.focus({preventScroll:true});
  }catch(error){setRemovalStatus(error instanceof Error&&error.name==='Error'?error.message:'The observation could not be restored. Browser storage is full or unavailable; Undo is still available while Sky atlas stays open.')}
 }
 const scoped=entries.filter(entry=>showAll||entry.target===target),filtered=filterDiary(scoped,filters),shown=filtered.entries;
 const countStatus=diaryReadError
  ?entries.length?tr(`${shown.length} of ${scoped.length} observations from the last readable diary match this filter.`,`最後可讀取的日誌中有 ${shown.length}／${scoped.length} 筆觀測紀錄符合篩選條件。`):tr('Saved observation results are unavailable.','無法取得已儲存的觀測結果。')
  :ready?tr(`${shown.length} of ${scoped.length} saved observations match this filter.`,`${shown.length}／${scoped.length} 筆已儲存的觀測紀錄符合篩選條件。`):tr('Loading saved observations…','正在載入已儲存的觀測紀錄…');
 const countLabel=diaryReadError
  ?entries.length?tr(`${shown.length} (earlier read)`,`${shown.length}（先前讀取）`):tr('unavailable','無法取得')
  :ready?shown.length:tr('loading','載入中');
 const activeFilters=Boolean(filters.query||filters.outcome||filters.from||filters.through);
 const otherObjectCount=entries.filter(entry=>entry.target!==target).length;
 function showAllSavedObservations(){const owner=document.activeElement;setShowAll(true);setVisible(10);deferFocusAndScroll(()=>savedDiaryHeading.current,{owner})}
 function download(format:'html'|'csv'){
  try{
   const content=format==='html'?diaryReport(shown,language):diaryCSV(shown);
   downloadFile(new Blob([content],{type:format==='html'?'text/html;charset=utf-8':'text/csv;charset=utf-8'}),`nightjar-diary-${showAll?'all':target}.${format}`);
   setStatus(`${shown.length} saved observation${shown.length===1?'':'s'} prepared as ${format==='html'?'an offline report. Open the file to print or save as PDF':'CSV. Open the file in a spreadsheet'}. Unsaved form edits are excluded.`);
  }catch{setStatus('The diary download could not be prepared. Your saved observations have not changed.')}
 }
 const statusText=(message:string)=>diaryFeedback(message,t);
 const stamp=(entry:Parameters<typeof diaryLocalTime>[0])=>diaryLocalTime(entry,languageLocale(language));
 return <section id="observing-diary" tabIndex={-1} className="observing-diary" aria-label={tr('Deep-sky observing diary','深空觀測日誌')}><div className="section-label">{tr('OBSERVING DIARY','觀測日誌')}</div><button type="button" className="button deep-sky-return" aria-controls="deep-sky-browsing" onClick={onBrowse}>{tr('Back to deep-sky browsing','返回深空瀏覽')}</button><h3 ref={heading} tabIndex={-1} style={{scrollMarginTop:24}}>{editing?tr(`Edit ${editing.target} observation`,`編輯 ${editing.target} 的觀測紀錄`):tr(`Record an observation of ${target}`,`記錄 ${target} 的觀測`)}</h3><p className="muted">{editing?tr(`${stamp(editing)} · ${diarySiteLabel(editing.place)}. Editing keeps the original site and time.`,`${stamp(editing)} · ${diarySiteLabel(editing.place)}。編輯時會保留原有地點與時間。`):pending?tr(`Unfinished observation from ${stamp(pending)} · ${diarySiteLabel(pending.place)}. Saving keeps this original site and time.`,`未完成的觀測：${stamp(pending)} · ${diarySiteLabel(pending.place)}。儲存時會保留原有地點與時間。`):tr(`Uses the selected observing time and site: ${diaryUtcTime(date.toISOString())} · ${diarySiteLabel(place)}. Change the planner time above if needed.`,`使用所選觀測時間與地點：${diaryUtcTime(date.toISOString())} · ${diarySiteLabel(place)}。如有需要，可在上方更改規劃時間。`)}</p>{pending&&!editing&&<div className="diary-actions"><button className="button" onClick={useCurrentSnapshot}>{tr('Use current site and time for this draft','此草稿使用目前地點與時間')}</button><button className="button" onClick={clearDraft}>{tr('Clear unfinished form','清除未完成的表單')}</button></div>}{clearedDraft&&<button ref={undoClearButton} className="button" onClick={undoClear}>{tr(`Undo clear of ${clearedDraft.target} form`,`復原已清除的 ${clearedDraft.target} 表單`)}</button>}<form onSubmit={event=>{event.preventDefault();save()}}><div className="diary-fields"><label>{tr('Observation result','觀測結果')}<select value={draft.outcome} onChange={event=>change({outcome:event.target.value as Draft['outcome']})}>{Object.keys(outcomeLabels).map(value=><option key={value} value={value}>{outcomeLabel(value as Observation['outcome'])}</option>)}</select></label><label>{tr('Equipment used','使用的器材')}<input maxLength={100} placeholder={tr('Naked eye, binoculars or telescope…','肉眼、雙筒望遠鏡或天文望遠鏡…')} value={draft.equipment} onChange={event=>change({equipment:event.target.value})}/></label></div><label>{tr('Observation notes','觀測筆記')}<textarea rows={4} maxLength={2000} placeholder={tr('Details, conditions and what you noticed…','細節、觀測條件與你的發現…')} value={draft.notes} onChange={event=>change({notes:event.target.value})}/></label><div className="diary-actions"><button className="button primary" disabled={!ready}>{editing?tr('Save diary changes','儲存日誌變更'):tr('Save observation','儲存觀測紀錄')}</button>{editing&&<button type="button" className="button" onClick={cancelEdit}>{tr('Cancel diary edit','取消編輯日誌')}</button>}</div></form>{draftStatus&&<p id="diary-form-recovery" tabIndex={-1} className="footnote" role="status">{statusText(draftStatus)}</p>}{draftReadError&&<div className="target-note-read-error"><p className="footnote">{tr('Stored unfinished forms are unavailable. Text entered here is retained. Retry reading before creating or replacing a stored form; conflicting versions can be reviewed without overwriting either.','無法取得已儲存的未完成表單。此處輸入的文字仍會保留。建立或取代儲存的表單前請重試讀取；可檢視有衝突的版本而不覆寫任何版本。')}</p><button className="button" onClick={retryReadingDiaryDrafts}>{tr('Retry reading unfinished forms','重試讀取未完成表單')}</button></div>}{draftSaveFailed&&<div className="diary-actions"><button className="button" onClick={retrySavingDrafts}>{tr('Retry saving unfinished forms','重試儲存未完成表單')}</button><button className="button" onClick={reviewDrafts}>{tr('Review saved form versions','檢視已儲存的表單版本')}</button><button className="button" onClick={downloadFormCopy}>{tr('Download form recovery copy','下載表單復原副本')}</button></div>}{draftSaveFailed&&<p className="footnote">{tr('A form copy includes unfinished text currently held here and may omit newer changes from other tabs. It can contain private sites and notes. It does not change browser storage.','表單副本包含此處目前保留的未完成文字，可能不包含其他分頁較新的變更。副本可能含有私人地點與筆記，不會變更瀏覽器儲存資料。')}</p>}{formCopyStatus&&<p role="status" className="footnote">{statusText(formCopyStatus)}</p>}{draftReview&&draftReview.conflicts.length>0&&<section className="diary-draft-review" aria-label={t('diary.reviewAria')}><h4 ref={draftReviewHeading} tabIndex={-1}>{t(draftReview.resolved?'diary.reviewedCopies':'diary.chooseVersion')}</h4><p className="footnote">{t('diary.reviewExplanation')}</p>{draftReview.conflicts.map(conflict=><details key={`${conflict.kind}-${conflict.target}`} open><summary>{conflict.target} · {t(conflict.kind==='edit'?'diary.savedEdit':'diary.unfinishedObservation')}</summary>{([['Your version',conflict.local],['Saved version',conflict.stored]] as const).map(([label,entry])=><div key={label}><strong>{t(label==='Your version'?'diary.yourVersion':'diary.savedVersion')}</strong>{entry?<><p className="footnote">{entry.observedAt} · {entry.place.name} · {outcomeLabel(entry.outcome)} · {entry.equipment||t('diary.noEquipment')}</p><label>{t('diary.versionNotes',{version:t(label==='Your version'?'diary.yourVersion':'diary.savedVersion'),target:conflict.target})}<textarea readOnly rows={3} value={entry.notes}/></label></>:<p className="footnote">{t('diary.formRemoved')}</p>}</div>)}</details>)}{!draftReview.resolved&&<div className="diary-actions"><button className="button" onClick={()=>resolveDrafts('local')}>{t('diary.keepYourVersions')}</button><button className="button" onClick={()=>resolveDrafts('stored')}>{t('diary.keepSavedVersions')}</button></div>}</section>}{status&&<p ref={feedback} tabIndex={-1} role="status" className="muted" style={{scrollMarginTop:24}}>{statusText(status)}</p>}{diaryReadError&&<div className="target-note-read-error"><p className="footnote">{tr('Saved observations are unavailable. Displayed entries, if any, are from an earlier read. Saving observations, removal, Undo and reports are paused; unfinished forms remain editable. Retry reading or prepare a raw recovery copy from My places before repairing storage.','無法取得已儲存的觀測紀錄。如有顯示紀錄，這些資料來自先前讀取。儲存、移除、復原及報告已暫停；未完成表單仍可編輯。請重試讀取，或在修復儲存空間前從「我的地點」準備原始復原副本。')}</p><button className="button" onClick={retryReadingDiary}>{tr('Retry reading saved diary','重試讀取已儲存日誌')}</button></div>}<p className="footnote">{tr(`Saved observations are included in plan backups. Unfinished forms save separately on this browser and are excluded from plan backups and saved-observation reports. A form recovery copy is available after a save problem. Up to ${diaryLimit} saved entries.`,`已儲存的觀測紀錄會包含在計畫備份中。未完成表單另存於此瀏覽器，不包含在計畫備份或已儲存觀測報告中。儲存出現問題時可下載表單復原副本。最多儲存 ${diaryLimit} 筆紀錄。`)}</p><label className="diary-filter"><input type="checkbox" checked={showAll} onChange={event=>{setShowAll(event.target.checked);setVisible(10)}}/>{tr('Show observations for all deep-sky objects','顯示所有深空天體的觀測紀錄')}</label><div className="diary-search-filters" role="group" aria-label={tr('Filter saved diary observations','篩選已儲存的觀測日誌')}><label>{tr('Search diary','搜尋日誌')}<input ref={filterSearch} type="search" maxLength={100} placeholder={tr('Object, site, country, equipment or notes…','天體、地點、國家、器材或筆記…')} value={filters.query} onChange={event=>filterChange({query:event.target.value})}/></label><label>{tr('Filter by observation result','依觀測結果篩選')}<select value={filters.outcome} onChange={event=>filterChange({outcome:event.target.value as DiaryFilters['outcome']})}><option value="">{tr('All results','所有結果')}</option>{Object.keys(outcomeLabels).map(value=><option key={value} value={value}>{outcomeLabel(value as Observation['outcome'])}</option>)}</select></label><label>{tr('From date (UTC)','開始日期（UTC）')}<input type="text" inputMode="numeric" maxLength={10} placeholder="YYYY-MM-DD" value={filters.from} onChange={event=>filterChange({from:diaryDateInput(event.target.value)})}/></label><label>{tr('Through date (UTC)','結束日期（UTC）')}<input type="text" inputMode="numeric" maxLength={10} placeholder="YYYY-MM-DD" value={filters.through} onChange={event=>filterChange({through:diaryDateInput(event.target.value)})}/></label></div><p className="footnote">{tr('Enter YYYY-MM-DD or eight digits (YYYYMMDD). Date filters include both endpoints and use the recorded UTC date, which can differ from the date at your observing site.','輸入 YYYY-MM-DD 或八位數字（YYYYMMDD）。日期篩選包含開始和結束日期，並使用紀錄的 UTC 日期；這可能與觀測地點的日期不同。')}</p>{activeFilters&&<button className="button" onClick={clearFilters}>{tr('Clear diary filters','清除日誌篩選條件')}</button>}{filtered.error&&<p className="error" role="alert">{filtered.error==='Enter valid dates from year 0001 to 9999 in year-month-day format.'?tr(filtered.error,'請以年－月－日格式輸入 0001 至 9999 年的有效日期。'):filtered.error==='The from date must be on or before the through date.'?tr(filtered.error,'開始日期必須早於或等於結束日期。'):filtered.error}</p>}<p className="muted" role="status">{countStatus}</p><h4 ref={savedDiaryHeading} tabIndex={-1} style={{scrollMarginTop:24}}>{showAll?tr('Your deep-sky observations','你的深空觀測紀錄'):tr(`${target} observations`,`${target} 的觀測紀錄`)} · {countLabel}</h4>{removalStatus&&<p role="status" className="muted">{statusText(removalStatus)}</p>}{removedEntry&&<div className="diary-removal-undo"><button ref={undoRemovalButton} className="button" disabled={!ready} onClick={undoRemoval}>{tr(`Undo removal of ${removedEntry.target} observation`,`復原已移除的 ${removedEntry.target} 觀測紀錄`)}</button><p className="footnote">{tr('Available until the next removal or leaving Sky atlas. Saved backups are unchanged.','可在下次移除紀錄或離開星空圖之前復原。已儲存的備份不會改變。')}</p></div>}<div className="diary-actions diary-downloads"><DocumentPreview fallbackFocus={savedDiaryHeading} label={tr('Preview diary report','預覽日誌報告')} title={tr('Observing diary preview','觀測日誌預覽')} description={tr('Review saved observations in this filter. Unfinished forms are excluded. Download the HTML file to print or save as PDF.','查看此篩選條件下已儲存的觀測記錄；不包含未完成的表單。可下載 HTML 檔案以列印或儲存為 PDF。')} filename={`nightjar-diary-${showAll?'all':target}.html`} createDocument={()=>diaryReport(shown,language)} disabled={!ready||!shown.length||Boolean(filtered.error)}/><button className="button" disabled={!ready||!shown.length||Boolean(filtered.error)} onClick={()=>download('html')}>{tr('Download diary report','下載日誌報告')}</button><button className="button" disabled={!ready||!shown.length||Boolean(filtered.error)} onClick={()=>download('csv')}>{tr('Download diary CSV','下載日誌 CSV')}</button></div><p className="footnote">{tr('Downloads include all saved entries in this filter, including entries beyond “Show more”. When a site’s time zone is unknown, CSV local-time and time-zone fields are empty; the recorded UTC instant stays included. Reports and CSV files are snapshots; use plan backups for restoring data.','下載包含此篩選條件下的所有已儲存紀錄，包括「顯示更多」以外的項目。地點時區未知時，CSV 的當地時間及時區欄位為空，但仍包含紀錄的 UTC 時刻。報告與 CSV 是快照；請使用計畫備份還原資料。')}</p><ListFocusRecovery listId="diary-entries" fallback={savedDiaryHeading}><div id="diary-entries" className="diary-entries">{shown.slice(0,visible).map(entry=><article key={entry.id}><div><strong>{entry.target} · {outcomeLabel(entry.outcome)}</strong><button className="text-button" data-diary-edit={entry.id} aria-label={tr(`Edit ${entry.target} observation from ${stamp(entry)}`,`編輯 ${entry.target} 於 ${stamp(entry)} 的觀測紀錄`)} onClick={()=>startEdit(entry)}>{tr('Edit','編輯')}</button><button className="text-button" aria-label={tr(`Remove ${entry.target} observation from ${stamp(entry)}`,`移除 ${entry.target} 於 ${stamp(entry)} 的觀測紀錄`)} onClick={()=>removeEntry(entry)} disabled={!ready}>{tr('Remove','移除')}</button></div><p className="muted">{stamp(entry)} · {entry.place.timezone||tr('UTC · site time zone unavailable','UTC · 地點時區無法取得')} · {diarySiteLabel(entry.place)}</p><p className="footnote">{diaryUtcTime(entry.observedAt)} · {entry.place.latitude.toFixed(3)}°, {entry.place.longitude.toFixed(3)}°{entry.equipment?` · ${entry.equipment}`:''}</p>{entry.notes&&<p className="diary-note">{entry.notes}</p>}</article>)}</div></ListFocusRecovery>{ready&&!shown.length&&!filtered.error&&<p className="muted">{scoped.length?tr('No observations match these filters. Clear the filters or try another search.','沒有符合篩選條件的觀測紀錄。請清除篩選條件或嘗試其他搜尋。'):tr('No observations recorded for this object scope yet.','此天體範圍尚無觀測紀錄。')}</p>}{ready&&!showAll&&!shown.length&&!filtered.error&&otherObjectCount>0&&<div className="diary-scope-recovery"><p className="muted">{t(otherObjectCount===1?'diary.otherOne':'diary.otherMany',{count:otherObjectCount})}</p><button type="button" className="button" onClick={showAllSavedObservations}>{tr('Show all saved observations','顯示所有已儲存的觀測紀錄')}</button></div>}{shown.length>visible&&<button className="button" onClick={()=>setVisible(value=>value+10)}>{tr('Show more observations','顯示更多觀測紀錄')}</button>}</section>;
}
