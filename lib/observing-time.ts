import {validTimeZone} from './valid-timezone';

export function validObservingDate(date:Date){return Number.isFinite(+date)&&date.getUTCFullYear()>=1&&date.getUTCFullYear()<=9999}
export function shiftObservingHour(date:Date,direction:-1|1):Date|null{
 if(!validObservingDate(date)||direction!==-1&&direction!==1)return null;
 const next=new Date(+date+direction*3600000);
 return validObservingDate(next)?next:null;
}
export function parseObservingInstant(value:unknown):Date|null{
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value))return null;
 const date=new Date(value);return validObservingDate(date)&&date.toISOString()===value?date:null;
}
export function observingTimeZone(value:unknown):{zone:string;known:boolean}{
 if(validTimeZone(value))return {zone:value,known:true};
 return {zone:'UTC',known:false};
}
function formatter(timezone:string){return new Intl.DateTimeFormat('en-GB',{timeZone:timezone,calendar:'gregory',numberingSystem:'latn',era:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})}
function parts(date:Date,format:Intl.DateTimeFormat,seconds=false){
 const values=format.formatToParts(date);
 const get=(name:string)=>values.find(part=>part.type===name)!.value;
 const year=get('era')==='BC'?1-Number(get('year')):Number(get('year'));
 const yearText=year<0?`-${String(-year).padStart(6,'0')}`:year>9999?`+${String(year).padStart(6,'0')}`:String(year).padStart(4,'0');
 return `${yearText}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}${seconds?':'+get('second'):''}`;
}
export function observingTimeValue(date:Date,timezone:string){
 const value=parts(date,formatter(timezone));
 // A UTC instant can be supported while its local calendar date is not.
 // Never put a misleading era or expanded year into the bounded date input.
 return /^\d{4}-/.test(value)&&Number(value.slice(0,4))>=1?value:'';
}

// Share one formatter while sampling both sides of a clock change. Historic
// offsets can include seconds; minute-only offsets shift the chosen instant.
export function observingTimeCandidates(value:string,timezone:string):Date[]{
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)||Number(value.slice(0,4))<1)return [];
 let format:Intl.DateTimeFormat;try{format=formatter(timezone)}catch{return []}
 const nominal=new Date(value+'Z');
 if(!Number.isFinite(+nominal)||nominal.toISOString().slice(0,16)!==value)return [];
 const offsets=new Set<number>();
 for(let hours=-36;hours<=36;hours+=6){
  const sample=new Date(+nominal+hours*3600000);
  const offset=+new Date(parts(sample,format,true)+'Z')-+sample;
  // Samples can cross year 0 or 10000; era-aware ISO parts preserve the
  // offset without returning an instant outside the supported UTC range.
  if(Number.isFinite(offset)&&Math.abs(offset)<=24*3600000)offsets.add(offset);
 }
 return [...offsets].map(offset=>new Date(+nominal-offset)).filter(date=>validObservingDate(date)&&parts(date,format,true)===value+':00').sort((a,b)=>+a-+b);
}
