function parts(date:Date,timezone:string){
 const values=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const get=(name:string)=>values.find(part=>part.type===name)!.value;
 return `${get('year').padStart(4,'0')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export function observingTimeValue(date:Date,timezone:string){return parts(date,timezone)}

// Try the offsets on both sides of a clock change, then round-trip each
// candidate. A missing local hour has no match; a repeated hour has two.
export function observingTimeCandidates(value:string,timezone:string):Date[]{
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)||Number(value.slice(0,4))<1)return [];
 try{new Intl.DateTimeFormat('en-GB',{timeZone:timezone})}catch{return []}
 const nominal=new Date(value+'Z');
 if(!Number.isFinite(+nominal)||nominal.toISOString().slice(0,16)!==value)return [];
 const offsets=new Set<number>();
 for(let hours=-36;hours<=36;hours+=6){
  const sample=new Date(+nominal+hours*3600000);
  const offset=+new Date(parts(sample,timezone)+'Z')-+sample;
  // Sampling near a four-digit year boundary can produce an expanded year
  // that the form cannot parse. Ignore that sample, never create Invalid Date.
  if(Number.isFinite(offset)&&Math.abs(offset)<=24*3600000)offsets.add(offset);
 }
 return [...offsets].map(offset=>new Date(+nominal-offset)).filter(date=>Number.isFinite(+date)&&parts(date,timezone)===value).sort((a,b)=>+a-+b);
}
