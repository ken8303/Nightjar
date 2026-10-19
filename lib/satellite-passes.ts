import {parseOrbitalEpoch,satelliteEpochWindowMs,type OrbitElements} from './satellite-elements';
import {createSatelliteObserver} from './satellite-position';

export type SatellitePass={rise:number;peak:number;set:number;maximumAltitude:number;riseAzimuth:number;peakAzimuth:number;setAzimuth:number;alreadyUp:boolean;continues:boolean};
export type SatellitePassResult={start:number;end:number;epochLimited:boolean;passes:SatellitePass[]};
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

export function findSatellitePasses(elements:OrbitElements,start:number,latitude:number,longitude:number):SatellitePassResult{
 const epoch=parseOrbitalEpoch(elements.EPOCH);
 if(elements.NORAD_CAT_ID!==25544||!epoch||!Number.isFinite(start)||Math.abs(start-+epoch)>satelliteEpochWindowMs)throw Error('Choose an ISS observing time within three days of the orbital epoch.');
 const end=Math.min(start+day,+epoch+satelliteEpochWindowMs),read=createSatelliteObserver(elements,latitude,longitude);
 if(!read)throw Error('Choose a valid observing site.');
 if(end<=start)throw Error('No supported search time remains after this instant. Choose an earlier observing time.');
 return {start,end,epochLimited:end<start+day,passes:searchHorizonPasses(read,start,end)};
}
