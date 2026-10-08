export type AuroraFeed={observedAt:string;forecastAt:string;fetchedAt:string;cells:[number,number,number][]};
const validCell=(r:unknown):r is [number,number,number]=>Array.isArray(r)&&r.length===3&&r.every(Number.isFinite)&&r[0]>=0&&r[0]<=360&&Math.abs(r[1])<=90&&r[2]>=0&&r[2]<=100;
const validStamp=(value:unknown):value is string=>{
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)||Number(value.slice(0,4))<1)return false;
 const normalized=value.length===20?value.slice(0,-1)+'.000Z':value,date=new Date(value);
 return Number.isFinite(+date)&&date.toISOString()===normalized;
};
export function validateAuroraFeed(value:unknown):AuroraFeed{
 if(!value||typeof value!=='object')throw Error('Aurora response is unreadable. Please retry.');
 const raw=value as Record<string,unknown>;
 if(!validStamp(raw.observedAt)||!validStamp(raw.forecastAt)||!validStamp(raw.fetchedAt)||Date.parse(raw.forecastAt)<Date.parse(raw.observedAt)||!Array.isArray(raw.cells)||raw.cells.length<100||raw.cells.length>100000||!raw.cells.every(validCell))throw Error('Aurora response is unreadable. Please retry.');
 return {observedAt:new Date(raw.observedAt).toISOString(),forecastAt:new Date(raw.forecastAt).toISOString(),fetchedAt:new Date(raw.fetchedAt).toISOString(),cells:raw.cells};
}
export function parseAurora(value:unknown,now=new Date()):AuroraFeed{
 if(!value||typeof value!=='object')throw new Error('Invalid aurora forecast');
 const raw=value as Record<string,unknown>;
 if(!Array.isArray(raw.coordinates)||raw.coordinates.length<100||!validStamp(raw['Observation Time'])||!validStamp(raw['Forecast Time'])||Date.parse(raw['Forecast Time'])<Date.parse(raw['Observation Time'])||!Number.isFinite(+now))throw new Error('Invalid aurora forecast');
 if(raw.coordinates.length>100000)throw new Error('Aurora grid is unavailable');
 const cells=raw.coordinates.filter(validCell);
 if(cells.length<100)throw new Error('Aurora grid is unavailable');
 return {observedAt:new Date(raw['Observation Time']).toISOString(),forecastAt:new Date(raw['Forecast Time']).toISOString(),fetchedAt:now.toISOString(),cells};
}
export function nearestAurora(cells:[number,number,number][],lat:number,lon:number){
 if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon))return null;
 const rad=Math.PI/180,latitude=lat*rad,cos=Math.abs(lat)===90?0:Math.cos(latitude);
 const longitude=((lon%360)+360)%360;let best:[number,number,number]|null=null,distance=Infinity;
 // Haversine angular distance accounts for converging longitude lines at poles.
 for(const cell of cells){const cellCos=Math.abs(cell[1])===90?0:Math.cos(cell[1]*rad),delta=cell[0]-longitude,d=Math.sin((cell[1]*rad-latitude)/2)**2+cos*cellCos*Math.sin(delta*rad/2)**2;if(d<distance){best=cell;distance=d}}
 return best;
}
export function auroraTimingIssue(feed:AuroraFeed,now:number):'invalid'|'future'|'old'|null{
 const observed=Date.parse(feed.observedAt),forecast=Date.parse(feed.forecastAt),fetched=Date.parse(feed.fetchedAt);
 if(!Number.isFinite(now)||![feed.observedAt,feed.forecastAt,feed.fetchedAt].every(validStamp)||forecast<observed)return 'invalid';
 if(observed>now+15*60000||forecast>now+2*3600000||fetched>now+15*60000)return 'future';
 return now-observed>2*3600000||now-forecast>90*60000?'old':null;
}
export function auroraIsStale(feed:AuroraFeed,now:number){return auroraTimingIssue(feed,now)!==null}
