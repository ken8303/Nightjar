export type AuroraFeed={observedAt:string;forecastAt:string;fetchedAt:string;cells:[number,number,number][]};
const validCell=(r:unknown):r is [number,number,number]=>Array.isArray(r)&&r.length===3&&r.every(Number.isFinite)&&r[0]>=0&&r[0]<=360&&Math.abs(r[1])<=90&&r[2]>=0&&r[2]<=100;
const validStamp=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function validateAuroraFeed(value:unknown):AuroraFeed{
 if(!value||typeof value!=='object')throw Error('Aurora response is unreadable. Please retry.');
 const raw=value as Record<string,unknown>;
 if(!validStamp(raw.observedAt)||!validStamp(raw.forecastAt)||!validStamp(raw.fetchedAt)||!Array.isArray(raw.cells)||raw.cells.length<100||raw.cells.length>100000||!raw.cells.every(validCell))throw Error('Aurora response is unreadable. Please retry.');
 return {observedAt:new Date(raw.observedAt).toISOString(),forecastAt:new Date(raw.forecastAt).toISOString(),fetchedAt:new Date(raw.fetchedAt).toISOString(),cells:raw.cells};
}
export function parseAurora(value:unknown,now=new Date()):AuroraFeed{
 if(!value||typeof value!=='object')throw new Error('Invalid aurora forecast');
 const raw=value as Record<string,unknown>;
 if(!Array.isArray(raw.coordinates)||raw.coordinates.length<100||typeof raw['Observation Time']!=='string'||typeof raw['Forecast Time']!=='string'||!Number.isFinite(Date.parse(raw['Observation Time']))||!Number.isFinite(Date.parse(raw['Forecast Time'])))throw new Error('Invalid aurora forecast');
 if(raw.coordinates.length>100000)throw new Error('Aurora grid is unavailable');
 const cells=raw.coordinates.filter(validCell);
 if(cells.length<100)throw new Error('Aurora grid is unavailable');
 return {observedAt:raw['Observation Time'],forecastAt:raw['Forecast Time'],fetchedAt:now.toISOString(),cells};
}
export function nearestAurora(cells:[number,number,number][],lat:number,lon:number){
 const longitude=((lon%360)+360)%360;let best:[number,number,number]|null=null,distance=Infinity;
 for(const cell of cells){const delta=Math.abs(cell[0]-longitude),d=(cell[1]-lat)**2+Math.min(delta,360-delta)**2;if(d<distance){best=cell;distance=d}}
 return best;
}
export function auroraIsStale(feed:AuroraFeed,now:number){return now-Date.parse(feed.observedAt)>2*3600000||now-Date.parse(feed.forecastAt)>90*60000||Date.parse(feed.observedAt)>now+15*60000}
