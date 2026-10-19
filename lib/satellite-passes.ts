import {parseOrbitalEpoch,satelliteEpochWindowMs,type OrbitElements} from './satellite-elements';
import {createSatelliteObserver} from './satellite-position';
import {satelliteLighting,type SatelliteLighting} from './satellite-lighting';
import {satelliteViewingAltitude,satelliteViewingSunAltitude,satelliteViewingMinimumMs} from './satellite-viewing-rules';

export type SatellitePass={rise:number;peak:number;set:number;maximumAltitude:number;riseAzimuth:number;peakAzimuth:number;setAzimuth:number;alreadyUp:boolean;continues:boolean};
type TimeWindow={start:number;end:number};
export type SatelliteViewingWindow=TimeWindow&{startsAtBoundary:boolean;endsAtBoundary:boolean};
export type SatellitePassResult={start:number;end:number;epochLimited:boolean;passes:(SatellitePass&{lighting:SatelliteLighting|null;viewing:SatelliteViewingWindow[]|null})[]};
type Direction={altitude:number;azimuth:number};
const day=86400000,step=30000,tolerance=100;

// A 30-second grid finds local maxima, including humps whose sampled values
// are all below zero. Refine those humps before deciding there is no pass.
// This bounded ISS search is geometric, with a sea-level, unobstructed horizon.
export function searchHorizonPasses(read:(time:number)=>Direction|null,start:number,end:number):SatellitePass[]{
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>day)throw Error('Choose a nonempty search window of at most 24 hours.');
 let evaluations=0;
 const point=(time:number)=>{
  if(++evaluations>12000)throw Error('The pass search exceeded its calculation limit.');
  const value=read(time);
  if(!value||!Number.isFinite(value.altitude)||!Number.isFinite(value.azimuth))throw Error('The orbit could not be propagated throughout this search window.');
  return {time,...value};
 };
 const samples=[];
 for(let time=start;time<end;time+=step)samples.push(point(time));
 samples.push(point(end));
 const maximize=(left:number,right:number)=>{
  let best=point(left);const remember=(time:number)=>{const value=point(time);if(value.altitude>best.altitude)best=value;return value};remember(right);
  const fraction=(Math.sqrt(5)-1)/2;
  let a=remember(right-fraction*(right-left)),b=remember(left+fraction*(right-left));
  while(right-left>tolerance){
   if(a.altitude<b.altitude){left=a.time;a=b;b=remember(left+fraction*(right-left))}
   else{right=b.time;b=a;a=remember(right-fraction*(right-left))}
  }
  return best;
 };
 const crossing=(left:number,right:number,rising:boolean)=>{
  while(right-left>tolerance){const middle=(left+right)/2,above=point(middle).altitude>0;if(above===rising)right=middle;else left=middle}
  return (left+right)/2;
 };
 const passes:SatellitePass[]=[];
 for(let i=0;i<samples.length;i++){
  const sample=samples[i],first=i===0,last=i===samples.length-1;
  if(!((first||sample.altitude>=samples[i-1].altitude)&&(last||sample.altitude>samples[i+1].altitude))&&!((first||last)&&sample.altitude>0))continue;
  const peak=maximize(samples[Math.max(0,i-1)].time,samples[Math.min(samples.length-1,i+1)].time);
  if(peak.altitude<=0)continue;
  let left=i,right=i;
  // A grazing maximum can sit between two negative grid points.
  if(samples[left].time>peak.time)left--;
  if(samples[right].time<peak.time)right++;
  while(left>0&&samples[left].altitude>0)left--;
  while(right<samples.length-1&&samples[right].altitude>0)right++;
  const alreadyUp=left===0&&samples[0].altitude>0,continues=right===samples.length-1&&samples[right].altitude>0;
  const rise=alreadyUp?start:crossing(samples[left].time,peak.time,true);
  const set=continues?end:crossing(peak.time,samples[right].time,false);
  const entry={rise,peak:peak.time,set,maximumAltitude:peak.altitude,riseAzimuth:point(rise).azimuth,peakAzimuth:peak.azimuth,setAzimuth:point(set).azimuth,alreadyUp,continues};
  const previous=passes[passes.length-1];
  if(previous&&entry.rise<=previous.set+tolerance){
   if(entry.maximumAltitude>previous.maximumAltitude){previous.peak=entry.peak;previous.maximumAltitude=entry.maximumAltitude;previous.peakAzimuth=entry.peakAzimuth}
   if(entry.set>previous.set){previous.set=entry.set;previous.setAzimuth=entry.setAzimuth;previous.continues=entry.continues}
  }else passes.push(entry);
 }
 return passes;
}

export function intersectTimeWindows(groups:TimeWindow[][],minimumMs=satelliteViewingMinimumMs):TimeWindow[]{
 if(!Number.isFinite(minimumMs)||minimumMs<0)throw Error('Invalid window duration.');
 for(const group of groups)for(const window of group)if(!Number.isFinite(window.start)||!Number.isFinite(window.end)||window.end<=window.start)throw Error('Invalid interval.');
 let result=(groups[0]??[]).map(window=>({...window}));
 for(const group of groups.slice(1))result=result.flatMap(left=>group.flatMap(right=>{const start=Math.max(left.start,right.start),end=Math.min(left.end,right.end);return end>start?[{start,end}]:[]}));
 return result.filter(window=>window.end-window.start>=minimumMs).sort((a,b)=>a.start-b.start);
}

type Conditions={altitude:number;sunAltitude:number;sunClearance:number};
// Search each smooth criterion separately, retaining grazing extrema, then
// intersect the refined intervals. A boolean sample grid can miss their brief
// overlap entirely. Failure is distinct from a successful search with no window.
export function modelledViewingWindows(read:(time:number)=>Conditions|null,start:number,end:number):TimeWindow[]|null{
 try{
  const criteria=[(point:Conditions)=>point.altitude-satelliteViewingAltitude,(point:Conditions)=>satelliteViewingSunAltitude-point.sunAltitude,(point:Conditions)=>point.sunClearance];
  const groups=[];
  for(const criterion of criteria){
   const windows=searchHorizonPasses(time=>{const point=read(time);return point?{altitude:criterion(point),azimuth:0}:null},start,end).map(pass=>({start:pass.rise,end:pass.set}));
   if(!windows.length)return [];
   groups.push(windows);
  }
  return intersectTimeWindows(groups);
 }catch{return null}
}

export function findSatellitePasses(elements:OrbitElements,start:number,latitude:number,longitude:number):SatellitePassResult{
 const epoch=parseOrbitalEpoch(elements.EPOCH);
 if(elements.NORAD_CAT_ID!==25544||!epoch||!Number.isFinite(start)||Math.abs(start-+epoch)>satelliteEpochWindowMs)throw Error('Choose an ISS observing time within three days of the orbital epoch.');
 const end=Math.min(start+day,+epoch+satelliteEpochWindowMs),read=createSatelliteObserver(elements,latitude,longitude);
 if(!read)throw Error('Choose a valid observing site.');
 if(end<=start)throw Error('No supported search time remains after this instant. Choose an earlier observing time.');
 let remaining=6000;
 const passes=searchHorizonPasses(read,start,end).map(pass=>{
  const lighting=satelliteLighting(elements,new Date(pass.peak),latitude,longitude),cache=new Map<number,Conditions|null>();
  const conditions=(time:number)=>{
   if(cache.has(time))return cache.get(time)!;
   if(--remaining<0)throw Error('The viewing-window calculation limit was reached.');
   const direction=read(time),light=satelliteLighting(elements,new Date(time),latitude,longitude);
   const point=direction&&light?{altitude:direction.altitude,sunAltitude:light.sunAltitude,sunClearance:light.sunClearance}:null;
   cache.set(time,point);return point;
  };
  const windows=pass.maximumAltitude<=satelliteViewingAltitude?[]:modelledViewingWindows(conditions,pass.rise,pass.set);
  const viewing=windows?.map(window=>({...window,startsAtBoundary:pass.alreadyUp&&window.start===start,endsAtBoundary:pass.continues&&window.end===end}))??null;
  return {...pass,lighting,viewing};
 });
 return {start,end,epochLimited:end<start+day,passes};
}
