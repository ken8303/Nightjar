// 7Timer ASTRO values are categories, not exact measurements. The provider's
// live JSON and timestamps must be verified before enabling the integration.
export type AstronomySample={time:number;seeing:number|null;transparency:number|null};
export type AstronomyForecast={issuedAt:number;samples:AstronomySample[]};
export const seeingRanges=['<0.5','0.5–0.75','0.75–1','1–1.25','1.25–1.5','1.5–2','2–2.5','>2.5'] as const;
export const transparencyRanges=['<0.3','0.3–0.4','0.4–0.5','0.5–0.6','0.6–0.7','0.7–0.85','0.85–1','>1'] as const;
function category(value:unknown){return typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=8?value:null}
function issueTime(value:unknown){
 if(typeof value!=='string'||!/^\d{10}$/.test(value))throw Error('Invalid forecast issue time');
 const date=new Date(`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T${value.slice(8,10)}:00:00Z`);
 if(!Number.isFinite(+date)||date.toISOString().replace(/[-:T]/g,'').slice(0,10)!==value)throw Error('Invalid forecast issue time');
 return +date;
}
export function parseAstronomyProvider(value:unknown):AstronomyForecast{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid forecast');
 const raw=value as Record<string,unknown>,issuedAt=issueTime(raw.init),series=raw.dataseries;
 if(raw.product!=='astro'||!Array.isArray(series)||series.length===0||series.length>100)throw Error('Invalid forecast');
 let last=-1;
 const samples=series.map((entry:unknown)=>{
  if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Error('Invalid forecast sample');
  const sample=entry as Record<string,unknown>,hour=sample.timepoint;
  if(typeof hour!=='number'||!Number.isInteger(hour)||hour<0||hour>240||hour<=last)throw Error('Invalid forecast time');
  last=hour;return {time:issuedAt+hour*3600000,seeing:category(sample.seeing),transparency:category(sample.transparency)};
 });
 return {issuedAt,samples};
}
export function parseAstronomyResponse(value:unknown):AstronomyForecast{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid forecast');
 const raw=value as Record<string,unknown>,issuedAt=raw.issuedAt,samples=raw.samples;
 if(typeof issuedAt!=='number'||!Number.isSafeInteger(issuedAt)||!Number.isFinite(+new Date(issuedAt))||!Array.isArray(samples)||samples.length===0||samples.length>100)throw Error('Invalid forecast');
 let last=issuedAt-1;
 return {issuedAt,samples:samples.map((entry:unknown)=>{
  if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Error('Invalid forecast');
  const sample=entry as Record<string,unknown>,time=sample.time;
  if(typeof time!=='number'||!Number.isSafeInteger(time)||time<=last||time>issuedAt+240*3600000)throw Error('Invalid forecast time');
  last=time;return {time,seeing:category(sample.seeing),transparency:category(sample.transparency)};
 })};
}
