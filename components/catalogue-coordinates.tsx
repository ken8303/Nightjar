'use client';
import {useId,useRef,useState} from 'react';
import {Copy} from 'lucide-react';
import {catalogueCoordinateCopy,formatEquatorialCoordinates} from '@/lib/equatorial-coordinates';
import {Textarea} from '@/components/ui/textarea';
import {useLanguage} from '@/components/language-provider';

type Target={id:string;ra:number;dec:number};
export default function CatalogueCoordinates({target}:{target:Target}){
 const {tr}=useLanguage();
 const helpId=useId(),coordinates=formatEquatorialCoordinates(target.ra,target.dec);
 const manualText=useRef<HTMLTextAreaElement>(null);
 const source=`${target.id}:${target.ra}:${target.dec}`;
 const [copy,setCopy]=useState<{source:string;id:string;pending:boolean;manual:boolean;message:''|'copied'|'unavailable'}|null>(null);
 async function copyCoordinates(){
  if(copy?.pending)return;
  const snapshot={source,id:target.id};
  setCopy({...snapshot,pending:true,manual:false,message:''});
  try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(catalogueCoordinateCopy(target));
   setCopy({...snapshot,pending:false,manual:false,message:'copied'});
  }catch{setCopy({...snapshot,pending:false,manual:true,message:'unavailable'})}
 }
 return <div className="catalogue-coordinates" role="group" aria-label={tr(`${target.id} J2000 catalogue coordinates`,`${target.id} J2000 星表座標`)}>
  <p className="section-label">{tr('CATALOGUE COORDINATES · J2000','星表座標 · J2000')}</p>
  <dl><div><dt>{tr('Right ascension','赤經')}</dt><dd>{coordinates.ra}</dd></div><div><dt>{tr('Declination','赤緯')}</dt><dd>{coordinates.dec}</dd></div></dl>
  <p className="footnote">{tr('Decimal RA: ','十進位赤經：')}{target.ra.toFixed(5)} h · {tr('Dec: ','赤緯：')}{target.dec.toFixed(5)}°</p>
  <button type="button" className="button" disabled={Boolean(copy?.pending)} aria-describedby={helpId} onClick={copyCoordinates}><Copy size={16}/>{copy?.pending?tr(`Copying ${copy.id}…`,`正在複製 ${copy.id}…`):tr('Copy J2000 coordinates','複製 J2000 座標')}</button>
  <p id={helpId} className="footnote">{tr('Formatted seconds are rounded to one decimal place. Copy includes full decimal values and the J2000 label.','格式化的秒數四捨五入至小數點後一位。複製的英文文字包含完整十進位數值及 J2000 標籤。')}</p>
  <p className="footnote catalogue-copy-status" role="status">{copy?.source===source?(copy.message==='copied'?tr(`${copy.id} J2000 coordinates copied.`,`${copy.id} J2000 座標已複製。`):copy.message==='unavailable'?tr('Clipboard unavailable. Select the full coordinate text below, then use your browser’s Copy action.','無法使用剪貼簿。請選取下方完整座標文字，再使用瀏覽器的複製功能。'):''):''}</p>
  {copy?.source===source&&copy.manual&&<div className="grid min-w-0 gap-3"><label htmlFor={`${helpId}-manual`} className="grid gap-2 text-sm">{tr('Full J2000 coordinate text','完整 J2000 座標文字')}<Textarea ref={manualText} id={`${helpId}-manual`} readOnly rows={6} value={catalogueCoordinateCopy(target)} className="field-sizing-fixed min-w-0 max-h-64 resize-y font-mono"/></label><button type="button" className="button" onClick={()=>{manualText.current?.focus();manualText.current?.select()}}>{tr('Select coordinate text','選取座標文字')}</button><p className="footnote">{tr('Read-only text includes the object name, epoch and full decimal values. Selecting it does not write to the clipboard.','唯讀英文文字包含天體名稱、曆元與完整十進位數值。選取文字不會寫入剪貼簿。')}</p></div>}
 </div>;
}
