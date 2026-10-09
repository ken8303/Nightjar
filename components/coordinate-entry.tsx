'use client';
import {useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Field,FieldDescription,FieldError,FieldGroup,FieldLabel} from '@/components/ui/field';
import {ToggleGroup,ToggleGroupItem} from '@/components/ui/toggle-group';
import {coordinateEntryPoint,coordinateEntryValue,coordinateInputDraft,coordinateIsNegative,coordinateMagnitude,withCoordinateHemisphere} from '@/lib/coordinate-entry';
import type {Place} from '@/lib/sky';

type Props={latitude:string;longitude:string;onLatitude:(value:string)=>void;onLongitude:(value:string)=>void;onChoose:(place:Place)=>void;onClear:()=>void};
export default function CoordinateEntry({latitude,longitude,onLatitude,onLongitude,onChoose,onClear}:Props){
 const [attempted,setAttempted]=useState(false);
 const latitudeInput=useRef<HTMLInputElement>(null),longitudeInput=useRef<HTMLInputElement>(null);
 const errorFor=(axis:'latitude'|'longitude',value:string)=>attempted&&coordinateEntryValue(value,axis)===null?`Enter ${axis} from 0 to ${axis==='latitude'?90:180} degrees and choose ${axis==='latitude'?'N or S':'E or W'}.`:'';
 const fields=[{axis:'latitude' as const,value:latitude,onChange:onLatitude,input:latitudeInput,positive:'N',negative:'S',limit:90},{axis:'longitude' as const,value:longitude,onChange:onLongitude,input:longitudeInput,positive:'E',negative:'W',limit:180}];
 return <form className="coordinate-form" noValidate onSubmit={event=>{
  event.preventDefault();const point=coordinateEntryPoint(latitude,longitude);
  if(!point){setAttempted(true);(coordinateEntryValue(latitude,'latitude')===null?latitudeInput:longitudeInput).current?.focus();return}
  setAttempted(false);onChoose(point);
 }}>
  <FieldGroup className="gap-4">{fields.map(field=>{
   const negative=coordinateIsNegative(field.value),error=errorFor(field.axis,field.value),id=`manual-${field.axis}`;
   return <Field key={field.axis} data-invalid={Boolean(error)}>
    <FieldLabel htmlFor={id}>{field.axis==='latitude'?'Latitude':'Longitude'}</FieldLabel>
    <div className="flex min-w-0 items-center gap-2"><Input ref={field.input} id={id} inputMode="decimal" autoComplete="off" maxLength={80} required value={coordinateMagnitude(field.value)} aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error?` ${id}-error`:''}`} className="min-h-11" onChange={event=>{setAttempted(false);field.onChange(coordinateInputDraft(event.target.value,negative))}}/>
     <ToggleGroup type="single" variant="outline" value={negative?'negative':'positive'} aria-label={`${field.axis==='latitude'?'Latitude':'Longitude'} hemisphere`} onValueChange={value=>{if(value){setAttempted(false);field.onChange(withCoordinateHemisphere(field.value,value==='negative'))}}}>
      <ToggleGroupItem type="button" value="positive" aria-label={field.axis==='latitude'?'North latitude':'East longitude'} className="min-h-11 min-w-11">{field.positive}</ToggleGroupItem>
      <ToggleGroupItem type="button" value="negative" aria-label={field.axis==='latitude'?'South latitude':'West longitude'} className="min-h-11 min-w-11">{field.negative}</ToggleGroupItem>
     </ToggleGroup>
    </div>
    <FieldDescription id={`${id}-help`}>0–{field.limit} decimal degrees. Signed values may also be pasted.</FieldDescription>
    {error&&<FieldError id={`${id}-error`} role="status">{error}</FieldError>}
   </Field>;
  })}<Field orientation="horizontal" className="flex-wrap"><Button type="submit" className="min-h-11">Use coordinates</Button><Button type="button" variant="outline" className="min-h-11" onClick={()=>{setAttempted(false);onClear();latitudeInput.current?.focus()}}>Clear coordinates</Button></Field></FieldGroup>
 </form>;
}
