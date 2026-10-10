'use client';
import {useId,useState} from 'react';
import {Copy} from 'lucide-react';
import {catalogueCoordinateCopy,formatEquatorialCoordinates} from '@/lib/equatorial-coordinates';

type Target={id:string;ra:number;dec:number};
export default function CatalogueCoordinates({target}:{target:Target}){
 const helpId=useId(),coordinates=formatEquatorialCoordinates(target.ra,target.dec);
 const source=`${target.id}:${target.ra}:${target.dec}`;
 const [copy,setCopy]=useState<{source:string;id:string;pending:boolean;message:string}|null>(null);
 async function copyCoordinates(){
  if(copy?.pending)return;
  const snapshot={source,id:target.id};
  setCopy({...snapshot,pending:true,message:''});
  try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(catalogueCoordinateCopy(target));
   setCopy({...snapshot,pending:false,message:`${snapshot.id} J2000 coordinates copied.`});
  }catch{setCopy({...snapshot,pending:false,message:'Clipboard unavailable. Select the displayed coordinates to copy them manually.'})}
 }
 return <div className="catalogue-coordinates" role="group" aria-label={`${target.id} J2000 catalogue coordinates`}>
  <p className="section-label">CATALOGUE COORDINATES · J2000</p>
  <dl><div><dt>Right ascension</dt><dd>{coordinates.ra}</dd></div><div><dt>Declination</dt><dd>{coordinates.dec}</dd></div></dl>
  <p className="footnote">Decimal RA: {target.ra.toFixed(5)} h · Dec: {target.dec.toFixed(5)}°</p>
  <button type="button" className="button" disabled={Boolean(copy?.pending)} aria-describedby={helpId} onClick={copyCoordinates}><Copy size={16}/>{copy?.pending?`Copying ${copy.id}…`:'Copy J2000 coordinates'}</button>
  <p id={helpId} className="footnote">Formatted seconds are rounded to one decimal place. Copy includes full decimal values and the J2000 label.</p>
  <p className="footnote catalogue-copy-status" role="status">{copy?.source===source?copy.message:''}</p>
 </div>;
}
