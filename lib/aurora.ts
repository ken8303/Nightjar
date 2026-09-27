export type AuroraFeed={observedAt:string;forecastAt:string;fetchedAt:string;cells:[number,number,number][]};
export function parseAurora(raw:any,now=new Date()):AuroraFeed{
 if(!raw||!Array.isArray(raw.coordinates)||raw.coordinates.length<100||!Number.isFinite(Date.parse(raw['Observation Time']))||!Number.isFinite(Date.parse(raw['Forecast Time'])))throw new Error('Invalid aurora forecast');
 const cells=raw.coordinates.filter((r:any)=>Array.isArray(r)&&r.length===3&&r.every(Number.isFinite)&&r[0]>=0&&r[0]<=360&&Math.abs(r[1])<=90&&r[2]>=0&&r[2]<=100);
 if(cells.length<100)throw new Error('Aurora grid is unavailable');
 return {observedAt:raw['Observation Time'],forecastAt:raw['Forecast Time'],fetchedAt:now.toISOString(),cells};
}
export function nearestAurora(cells:[number,number,number][],lat:number,lon:number){
 const longitude=((lon%360)+360)%360;let best:[number,number,number]|null=null,distance=Infinity;
 for(const cell of cells){const delta=Math.abs(cell[0]-longitude),d=(cell[1]-lat)**2+Math.min(delta,360-delta)**2;if(d<distance){best=cell;distance=d}}
 return best;
}
export function auroraIsStale(feed:AuroraFeed,now:number){return now-Date.parse(feed.observedAt)>2*3600000||now-Date.parse(feed.forecastAt)>90*60000||Date.parse(feed.observedAt)>now+15*60000}
