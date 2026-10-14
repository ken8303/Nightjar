'use client';
import {useId,useRef,useState} from 'react';
import {Copy} from 'lucide-react';
import {catalogueCoordinateCopy,formatEquatorialCoordinates} from '@/lib/equatorial-coordinates';
import {Textarea} from '@/components/ui/textarea';

type Target={id:string;ra:number;dec:number};
export default function CatalogueCoordinates({target}:{target:Target}){
 const helpId=useId(),coordinates=formatEquatorialCoordinates(target.ra,target.dec);
 const manualText=useRef<HTMLTextAreaElement>(null);
 const source=`${target.id}:${target.ra}:${target.dec}`;
 const [copy,setCopy]=useState<{source:string;id:string;pending:boolean;manual:boolean;message:string}|null>(null);
 async function copyCoordinates(){
  if(copy?.pending)return;
  const snapshot={source,id:target.id};
  setCopy({...snapshot,pending:true,manual:false,message:''});
  try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(catalogueCoordinateCopy(target));
   setCopy({...snapshot,pending:false,manual:false,message:`${snapshot.id} J2000 coordinates copied.`});
  }catch{setCopy({...snapshot,pending:false,manual:true,message:'Clipboard unavailable. Select the full coordinate text below, then use your browser’s Copy action.'})}
 }
 return <div className="catalogue-coordinates" role="group" aria-label={`${target.id} J2000 catalogue coordinates`}>
  <p className="section-label">CATALOGUE COORDINATES · J2000</p>
  <dl><div><dt>Right ascension</dt><dd>{coordinates.ra}</dd></div><div><dt>Declination</dt><dd>{coordinates.dec}</dd></div></dl>
  <p className="footnote">Decimal RA: {target.ra.toFixed(5)} h · Dec: {target.dec.toFixed(5)}°</p>
  <button type="button" className="button" disabled={Boolean(copy?.pending)} aria-describedby={helpId} onClick={copyCoordinates}><Copy size={16}/>{copy?.pending?`Copying ${copy.id}…`:'Copy J2000 coordinates'}</button>
  <p id={helpId} className="footnote">Formatted seconds are rounded to one decimal place. Copy includes full decimal values and the J2000 label.</p>
  <p className="footnote catalogue-copy-status" role="status">{copy?.source===source?copy.message:''}</p>
  {copy?.source===source&&copy.manual&&<div className="grid min-w-0 gap-3"><label htmlFor={`${helpId}-manual`} className="grid gap-2 text-sm">Full J2000 coordinate text<Textarea ref={manualText} id={`${helpId}-manual`} readOnly rows={6} value={catalogueCoordinateCopy(target)} className="field-sizing-fixed min-w-0 max-h-64 resize-y font-mono"/></label><button type="button" className="button" onClick={()=>{manualText.current?.focus();manualText.current?.select()}}>Select coordinate text</button><p className="footnote">Read-only text includes the object name, epoch and full decimal values. Selecting it does not write to the clipboard.</p></div>}
 </div>;
}
