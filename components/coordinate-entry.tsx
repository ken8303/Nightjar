'use client';
import {useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Field,FieldDescription,FieldError,FieldGroup,FieldLabel} from '@/components/ui/field';
import {ToggleGroup,ToggleGroupItem} from '@/components/ui/toggle-group';
import {coordinateEntryPoint,coordinateEntryValue,coordinateInputDraft,coordinateIsNegative,coordinateMagnitude,withCoordinateHemisphere,coordinatePairDraft} from '@/lib/coordinate-entry';
import type {Place} from '@/lib/sky';
import {useLanguage} from '@/components/language-provider';

type Props={latitude:string;longitude:string;onLatitude:(value:string)=>void;onLongitude:(value:string)=>void;onChoose:(place:Place)=>void;onClear:()=>void};
export default function CoordinateEntry({latitude,longitude,onLatitude,onLongitude,onChoose,onClear}:Props){
 const {tr}=useLanguage();
 const [attempted,setAttempted]=useState(false),[pasteNotice,setPasteNotice]=useState('');
 const latitudeInput=useRef<HTMLInputElement>(null),longitudeInput=useRef<HTMLInputElement>(null);
 const errorFor=(axis:'latitude'|'longitude',value:string)=>attempted&&coordinateEntryValue(value,axis)===null?tr(`Enter ${axis} from 0 to ${axis==='latitude'?90:180} degrees and choose ${axis==='latitude'?'N or S':'E or W'}.`,`請輸入 0 至 ${axis==='latitude'?90:180} 度的${axis==='latitude'?'緯度':'經度'}，並選擇${axis==='latitude'?'北或南':'東或西'}。`):'';
 const fields=[{axis:'latitude' as const,value:latitude,onChange:onLatitude,input:latitudeInput,positive:'N',negative:'S',limit:90},{axis:'longitude' as const,value:longitude,onChange:onLongitude,input:longitudeInput,positive:'E',negative:'W',limit:180}];
 return <form className="coordinate-form" noValidate onSubmit={event=>{
  event.preventDefault();const point=coordinateEntryPoint(latitude,longitude);
  if(!point){setAttempted(true);(coordinateEntryValue(latitude,'latitude')===null?latitudeInput:longitudeInput).current?.focus();return}
  setAttempted(false);onChoose(point);
 }}>
  <FieldGroup className="gap-4">{fields.map(field=>{
   const negative=coordinateIsNegative(field.value),error=errorFor(field.axis,field.value),id=`manual-${field.axis}`;
   return <Field key={field.axis} data-invalid={Boolean(error)}>
    <FieldLabel htmlFor={id}>{field.axis==='latitude'?tr('Latitude','緯度'):tr('Longitude','經度')}</FieldLabel>
    <div className="flex min-w-0 items-center gap-2"><Input ref={field.input} id={id} inputMode="decimal" autoComplete="off" maxLength={80} required value={coordinateMagnitude(field.value)} aria-invalid={Boolean(error)} aria-describedby={`${id}-help coordinate-pair-help${error?` ${id}-error`:''}`} className="min-h-11" onChange={event=>{setAttempted(false);setPasteNotice('');field.onChange(coordinateInputDraft(event.target.value,negative))}} onPaste={event=>{
     const pair=coordinatePairDraft(event.clipboardData.getData('text/plain'));if(!pair)return;
     event.preventDefault();setAttempted(false);onLatitude(pair.latitude);onLongitude(pair.longitude);
     setPasteNotice(tr('Coordinate pair filled. Review both fields and hemispheres, then choose Use coordinates. Your selected site is unchanged.','已填入座標。請確認兩個欄位與半球方向，再選擇「使用座標」。所選地點保持不變。'));
    }}/>
     <ToggleGroup type="single" variant="outline" value={negative?'negative':'positive'} aria-label={field.axis==='latitude'?tr('Latitude hemisphere','緯度半球'):tr('Longitude hemisphere','經度半球')} onValueChange={value=>{if(value){setAttempted(false);setPasteNotice('');field.onChange(withCoordinateHemisphere(field.value,value==='negative'))}}}>
      <ToggleGroupItem type="button" value="positive" aria-label={field.axis==='latitude'?tr('North latitude','北緯'):tr('East longitude','東經')} className="min-h-11 min-w-11">{field.positive}</ToggleGroupItem>
      <ToggleGroupItem type="button" value="negative" aria-label={field.axis==='latitude'?tr('South latitude','南緯'):tr('West longitude','西經')} className="min-h-11 min-w-11">{field.negative}</ToggleGroupItem>
     </ToggleGroup>
    </div>
    <FieldDescription id={`${id}-help`}>{tr(`0–${field.limit} decimal degrees. Signed values may also be pasted.`,`0–${field.limit} 十進位度數，也可以貼上帶正負號的數值。`)}</FieldDescription>
    {error&&<FieldError id={`${id}-error`} role="status">{error}</FieldError>}
   </Field>;
  })}<p id="coordinate-pair-help" className="footnote">{tr('Paste a latitude, longitude pair into either field, using decimal points (for example, −33.8,151.2). For whole numbers, put a space after the comma. Review the fields before using them.','可在任一欄位貼上以小數點表示的緯度、經度（例如 −33.8,151.2）。整數座標請在逗號後加空格。使用前請確認兩個欄位。')}</p>{pasteNotice&&<p className="muted" role="status">{pasteNotice}</p>}<Field orientation="horizontal" className="flex-wrap"><Button type="submit" className="min-h-11">{tr('Use coordinates','使用座標')}</Button><Button type="button" variant="outline" className="min-h-11" onClick={()=>{setAttempted(false);setPasteNotice('');onClear();latitudeInput.current?.focus()}}>{tr('Clear coordinates','清除座標')}</Button></Field></FieldGroup>
 </form>;
}
