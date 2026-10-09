export function validObservingDate(date:Date){return Number.isFinite(+date)&&date.getUTCFullYear()>=1&&date.getUTCFullYear()<=9999}
export function parseObservingInstant(value:unknown):Date|null{
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value))return null;
 const date=new Date(value);return validObservingDate(date)&&date.toISOString()===value?date:null;
}
export function observingTimeZone(value:unknown):{zone:string;known:boolean}{
 if(typeof value==='string'&&value){try{new Intl.DateTimeFormat('en',{timeZone:value});return {zone:value,known:true}}catch{}}
 return {zone:'UTC',known:false};
}
function formatter(timezone:string){return new Intl.DateTimeFormat('en-GB',{timeZone:timezone,calendar:'gregory',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})}
function parts(date:Date,format:Intl.DateTimeFormat,seconds=false){
 const values=format.formatToParts(date);
 const get=(name:string)=>values.find(part=>part.type===name)!.value;
 return `${get('year').padStart(4,'0')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}${seconds?':'+get('second'):''}`;
}
export function observingTimeValue(date:Date,timezone:string){return parts(date,formatter(timezone))}

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
  // Offset samples can cross a four-digit year boundary. Ignore expanded-year
  // samples, and never return an instant outside the supported UTC range.
  if(Number.isFinite(offset)&&Math.abs(offset)<=24*3600000)offsets.add(offset);
 }
 return [...offsets].map(offset=>new Date(+nominal-offset)).filter(date=>validObservingDate(date)&&parts(date,format,true)===value+':00').sort((a,b)=>+a-+b);
}
