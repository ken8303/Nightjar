'use client';
import {downloadFile} from '@/lib/download';
import {useEffect,useMemo,useRef,useState,useId} from 'react';
import {Download, Search, X} from 'lucide-react';
import DocumentPreview from '@/components/document-preview';
import ObjectPhoto from '@/components/object-photo';
import TargetRemovalUndo from '@/components/target-removal-undo';
import {Field,FieldGroup,FieldLabel,FieldDescription} from '@/components/ui/field';
import {targetNotesKey,targetNotesLimit,readTargetNotes,overlayTargetNoteEdits,applyTargetNoteEdits,saveTargetNotes,type TargetNotes} from '@/lib/target-notes';
import {Checkbox} from '@/components/ui/checkbox';
import {Place,skyTargets} from '@/lib/sky';
import {findSkyTargets} from '@/lib/sky-target-search';
import {printableObservingPlan} from '@/lib/observing-plan';
import {validEquipment,type Equipment} from '@/lib/photography';
export default function TargetFinder({date,place,selected,onSelect}:{date:Date;place:Place;selected:string;onSelect:(name:string)=>void}){
 const [notes,setNotes]=useState<Record<string,string>>({}),[notesReady,setNotesReady]=useState(false),[notesStatus,setNotesStatus]=useState(''),[notesStorageError,setNotesStorageError]=useState(false);
 const pendingNotes=useRef<TargetNotes>({});
 const [managedNote,setManagedNote]=useState(''),[removedNote,setRemovedNote]=useState<{name:string;text:string}|null>(null);
 const managerId=useId(),noteUndo=useRef<HTMLButtonElement>(null),managedNoteText=useRef<HTMLTextAreaElement>(null),focusRestoredNote=useRef(false);
 useEffect(()=>{if(removedNote){noteUndo.current?.focus({preventScroll:true});noteUndo.current?.scrollIntoView({block:'nearest',behavior:'instant'})}else if(focusRestoredNote.current){focusRestoredNote.current=false;managedNoteText.current?.focus({preventScroll:true});managedNoteText.current?.scrollIntoView({block:'nearest',behavior:'instant'})}},[removedNote]);
 const [query,setQuery]=useState(''),[aboveOnly,setAboveOnly]=useState(false),[aboveThirty,setAboveThirty]=useState(false);
 const [saved,setSaved]=useState<string[]>([]),[ready,setReady]=useState(false),[saveError,setSaveError]=useState('');
 const [removed,setRemoved]=useState<{name:string}|null>(null);
 const savedHeading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{
  const read=()=>{try{const raw=JSON.parse(localStorage.getItem('nightjar-targets-v1')||'[]');setSaved(Array.isArray(raw)?Array.from(new Set(raw.filter((v):v is string=>typeof v==='string'&&v.length<=100))).slice(0,39):[])}catch{setSaveError('Saved targets could not be loaded. You can still browse the catalogue.')}setReady(true)};
  read();const sync=(e:StorageEvent)=>{if(e.key==='nightjar-targets-v1'||e.key===null)read()};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
 },[]);
 useEffect(()=>{
  const read=()=>{
   try{
    const loaded=readTargetNotes(localStorage),pending=Object.keys(pendingNotes.current).length>0;
    setNotes(overlayTargetNoteEdits(loaded,pendingNotes.current));
    setNotesStorageError(pending);setNotesStatus(pending?'Saved notes refreshed. Your unsaved edits are still here; retry to save them.':'');
   }catch{setNotesStatus('Notes could not be loaded. New edits will try to save again.')}
   setNotesReady(true);
  };
  read();const sync=(e:StorageEvent)=>{if(e.key===targetNotesKey||e.key===null)read()};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
 },[]);
 function persistNoteEdits(){
  try{
   const next=applyTargetNoteEdits(readTargetNotes(localStorage),pendingNotes.current);
   saveTargetNotes(next,localStorage);pendingNotes.current={};setNotes(next);setNotesStatus('Notes saved on this browser.');setNotesStorageError(false);return true;
  }catch(error){setNotesStorageError(true);const reason=error instanceof Error&&error.name==='Error'?`${error.message} `:'';setNotesStatus(`${reason}Your edits could not be saved. They remain while Sky atlas is open; leaving this tab or reloading may lose them.`);return false}
 }
 function updateNote(name:string,value:string){
  const edit={[name]:value.slice(0,2000)};pendingNotes.current={...pendingNotes.current,...edit};
  setNotes(overlayTargetNoteEdits(notes,edit));return persistNoteEdits();
 }
 function removeManagedNote(){
  const text=notes[managedNote];if(!text)return;
  setRemovedNote({name:managedNote,text});updateNote(managedNote,'');setManagedNote('');
 }
 function undoNoteRemoval(){
  if(!removedNote)return;
  setManagedNote(removedNote.name);focusRestoredNote.current=true;
  if(notes[removedNote.name]){setNotesStatus('A note for this target already exists. Its current text was kept.')}else{setManagedNote(removedNote.name);updateNote(removedNote.name,removedNote.text)}
  setRemovedNote(null);
 }
 function toggleSaved(name:string){
  if(saved.includes(name))setRemoved({name});
  const next=saved.includes(name)?saved.filter(n=>n!==name):[...saved,name].slice(0,39);
  setSaved(next);try{localStorage.setItem('nightjar-targets-v1',JSON.stringify(next));setSaveError('')}catch{setSaveError('Changes could not be saved. They remain while Sky atlas is open; leaving this tab or reloading may lose them.')}
 }
 function undoRemoval(){if(!removed)return;if(saved.includes(removed.name)){setDownloadStatus(`${removed.name} is already saved. Your current list was kept.`)}else{if(saved.length>=39){setSaveError('Your saved list is full. Remove a target before restoring this one.');return}const next=[...saved,removed.name];setSaved(next);try{localStorage.setItem('nightjar-targets-v1',JSON.stringify(next));setSaveError('');setDownloadStatus(`${removed.name} restored to your targets.`)}catch{setSaveError(`${removed.name} restored while Sky atlas is open. Browser storage is unavailable; leaving this tab or reloading may lose this change.`)}}setRemoved(null);savedHeading.current?.focus()}
 const [downloadStatus,setDownloadStatus]=useState('');
 const targets=useMemo(()=>skyTargets(date,place).sort((a,b)=>b.altitude-a.altitude),[date,place]);
 const matches=findSkyTargets(targets,query,aboveThirty?30:aboveOnly?0:null);
 const savedTargets=targets.filter(t=>saved.includes(t.name));
 const target=targets.find(t=>t.name===selected);
 const direction=(az:number)=>['N','NE','E','SE','S','SW','W','NW'][Math.round(az/45)%8];
 function downloadTargets(){
  try{
   const localTime=new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeStyle:'short',timeZone:place.timezone||'UTC'}).format(date);
   const text=['NIGHTJAR — OBSERVING LIST',`Place: ${place.name.replace(/[\r\n]/g,' ')}`,`Coordinates: ${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`,`Time (UTC): ${date.toISOString()}`,`Local time: ${localTime} (${place.timezone||'UTC'})`,'','Saved targets — highest altitude first','',...savedTargets.flatMap(t=>[`[ ] ${t.name}`,`    Altitude: ${t.altitude.toFixed(1)}° | Azimuth: ${t.azimuth.toFixed(1)}° (${direction(t.azimuth)}) | ${t.altitude>0?'Above horizon':'Below horizon'}`,'    Notes:',...(notes[t.name]||'').split('\n').map(line=>`    ${line}`),'']),'Positions are a snapshot at the time and place above. Star positions are approximate.','Above the horizon does not guarantee visibility: daylight, weather and obstructions matter.',''].join('\n');
   downloadFile(new Blob([text],{type:'text/plain;charset=utf-8'}),`nightjar-targets-${date.toISOString().slice(0,10)}.txt`);
   setDownloadStatus('Observing list prepared for download. Open the text file to read or print it.');
  }catch{setDownloadStatus('The observing list could not be created. Please try again.')}
 }
 function buildPrintPlan(){
  let equipment:Equipment[]=[],equipmentUnavailable=false;
  try{const raw:unknown=JSON.parse(localStorage.getItem('nightjar-equipment')||'[]');if(!Array.isArray(raw))throw Error();equipment=raw.filter(validEquipment).slice(0,100)}catch{equipmentUnavailable=true}
  return printableObservingPlan({date,place,targets:savedTargets,notes,equipment,equipmentUnavailable});
 }
 function downloadPrintPlan(){
  try{
   downloadFile(new Blob([buildPrintPlan()],{type:'text/html;charset=utf-8'}),`nightjar-plan-${date.toISOString().slice(0,10)}.html`);
   setDownloadStatus('Print-ready plan prepared. Open the HTML file offline, then use Print or save as PDF.');
  }catch{setDownloadStatus('The print-ready plan could not be created. Please try again.')}
 }
 return <section id="target-finder" tabIndex={-1} className="panel target-finder"><div className="section-label"><span>FIND A TARGET</span><Search size={18}/></div><div className="saved-targets"><h3 ref={savedHeading} tabIndex={-1}>Your targets <span>{savedTargets.length}</span></h3>{!savedTargets.length&&<p className="muted">Select an object below, then save it here for your next observing session.</p>}{removed&&<TargetRemovalUndo removal={removed} onUndo={undoRemoval}/>}<div className="saved-target-grid">{savedTargets.map(t=><div key={t.name}><button className="saved-target-select" aria-pressed={selected===t.name} onClick={()=>onSelect(t.name)}><strong>{t.name}</strong><span>{t.altitude.toFixed(1)}° · {t.altitude>0?direction(t.azimuth):'Below horizon'}</span></button><button className="saved-target-remove" aria-label={`Remove ${t.name} from saved targets`} onClick={()=>toggleSaved(t.name)}><X size={16}/></button></div>)}</div><button className="button saved-target-download" disabled={!ready||!notesReady||!savedTargets.length} onClick={downloadTargets}><Download size={16}/>Download observing list</button><button className="button saved-target-download" disabled={!ready||!notesReady||!savedTargets.length} onClick={downloadPrintPlan}><Download size={16}/>Download print-ready plan</button><DocumentPreview label="Preview observing plan" title="Observing plan preview" filename={`nightjar-plan-${date.toISOString().slice(0,10)}.html`} createDocument={buildPrintPlan} disabled={!ready||!notesReady||!savedTargets.length}/>{downloadStatus&&<p role="status" className="saved-target-note">{downloadStatus}</p>}<p className="saved-target-note">Saved on this browser · positions follow your selected time and place.</p><details className="target-note-manager"><summary>Manage target notes · {Object.keys(notes).length}</summary><p className="footnote">Up to {targetNotesLimit} saved notes. Imported and older catalogue notes remain editable here. Unsaved edits stay only while Sky atlas is open.</p><FieldGroup><Field><FieldLabel htmlFor={`${managerId}-select`}>Note to manage</FieldLabel><select id={`${managerId}-select`} value={Object.hasOwn(notes,managedNote)?managedNote:''} onChange={event=>setManagedNote(event.target.value)} disabled={!notesReady}><option value="">Choose a note</option>{Object.keys(notes).sort((a,b)=>a.localeCompare(b)).map(name=><option key={name} value={name}>{name}</option>)}</select></Field>{managedNote&&<Field><FieldLabel htmlFor={`${managerId}-text`}>Managed note for {managedNote}</FieldLabel><textarea ref={managedNoteText} id={`${managerId}-text`} rows={4} maxLength={2000} value={notes[managedNote]||''} disabled={!notesReady} onChange={event=>updateNote(managedNote,event.target.value)}/><FieldDescription>{(notes[managedNote]||'').length}/2000 · Saved automatically when browser storage is available.</FieldDescription><button className="button" onClick={removeManagedNote} disabled={!notes[managedNote]}>Remove note for {managedNote}</button></Field>}</FieldGroup>{removedNote&&<div className="target-note-undo"><button ref={noteUndo} className="button" onClick={undoNoteRemoval}>Undo removal of note for {removedNote.name}</button><p className="footnote">Available until another note is removed or leaving Sky atlas. If the store is full, restored text stays in this view until you free space and retry.</p></div>}{notesStatus&&<p role={target?undefined:'status'} className="muted">{notesStatus}</p>}{notesStorageError&&<button className="button" onClick={persistNoteEdits}>Retry saving all note edits</button>}</details>{saveError&&<p role="status" className="error">{saveError}</p>}</div>{target&&<div id="target-details" tabIndex={-1} className="target-detail" role="region" aria-label="Selected target details"><div><h3>{target.name}</h3><p>{target.altitude.toFixed(1)}° altitude · {target.azimuth.toFixed(1)}° azimuth ({direction(target.azimuth)})</p><p className="muted">{target.altitude>0?'Highlighted with a ring on the sky chart below.':'Below your ideal horizon at this time, so it is not drawn on the sky chart. Change the observing time to check again.'}</p><button className="button save-target" disabled={!ready} aria-pressed={saved.includes(target.name)} onClick={()=>toggleSaved(target.name)}>{saved.includes(target.name)?'Saved to your targets ✓':`Save ${target.name}`}</button>{target.altitude>0&&<a className="button primary" href="#sky-chart">Show {target.name} on chart ↓</a>}<ObjectPhoto key={target.name} name={target.name}/><div className="target-notes"><label htmlFor="target-notes">Personal notes for {target.name}</label><textarea id="target-notes" rows={4} maxLength={2000} disabled={!notesReady} value={notes[target.name]||''} onChange={e=>updateNote(target.name,e.target.value)} placeholder="Equipment settings, details to look for, or reminders…" aria-describedby="target-notes-help"/><p id="target-notes-help" className="muted">{(notes[target.name]||'').length}/2000 · Automatically saved when browser storage is available. Add this target to favourites to include its notes in your download. Removing a favourite keeps its notes.</p>{notesStatus&&<p role="status" className="muted">{notesStatus}</p>}{notesStorageError&&<button className="button" onClick={()=>updateNote(target.name,notes[target.name]||'')}>Retry saving notes</button>}</div></div><button className="text-button" onClick={()=>onSelect('')} aria-label="Clear selected target"><X size={18}/></button></div>}<div className="target-search"><label htmlFor="target-search">Star, planet or Moon<input id="target-search" type="search" placeholder="Try Vega, Saturn or Polaris…" value={query} maxLength={100} onChange={e=>setQuery(e.target.value)}/></label><label className="target-filter"><Checkbox checked={aboveOnly} onCheckedChange={v=>setAboveOnly(v===true)} aria-label="Above horizon only"/>Above horizon only</label><label className="target-filter"><Checkbox checked={aboveThirty} onCheckedChange={v=>setAboveThirty(v===true)} aria-label="Above 30° only"/>Above 30° only</label></div>{(query||aboveOnly||aboveThirty)&&<button className="text-button" onClick={()=>{setQuery('');setAboveOnly(false);setAboveThirty(false)}}>Clear target filters</button>}<p className="muted target-count" role="status">{matches.length} of {targets.length} catalogue targets · highest first</p><div className="target-results">{matches.map(t=><button key={t.name} aria-pressed={selected===t.name} className={selected===t.name?'active':''} onClick={()=>onSelect(t.name)}><strong>{t.name}</strong><span>{t.planet?t.name==='Moon'?'Moon':'Planet':'Star'} · {t.altitude.toFixed(1)}° · {t.altitude>0?direction(t.azimuth):'Below horizon'}</span></button>)}</div>{target&&<a className="button target-details-link" href="#target-details">View {target.name} details ↑</a>}{!matches.length&&<p className="muted">No matching target in this small catalogue. Try another name or clear the target filters.</p>}<p className="footnote">Includes the existing bright-star selection and five solar-system targets. Star positions are approximate. Above the horizon does not imply naked-eye visibility; daylight, weather and obstructions still matter.</p></section>;
}
