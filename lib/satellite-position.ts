import {json2satrec,propagate,eciToEcf,ecfToLookAngles,gstime} from 'satellite.js';
import {parseOrbitalEpoch,satelliteEpochWindowMs,type OrbitElements,type SatelliteFeed} from './satellite-elements';
export function satelliteDataIssue(feed:SatelliteFeed,date:Date,now=Date.now()){
 const fetched=Date.parse(feed.fetchedAt),epoch=parseOrbitalEpoch(feed.elements.EPOCH);
 if(!Number.isFinite(now)||!Number.isFinite(+date)||!epoch)return 'Choose a valid observing instant.';
 if(fetched>now+5*60000)return 'The feed time is ahead of this device. Check your clock before using satellite directions.';
 if(now-fetched>6*60*60*1000)return 'Cached orbital data is more than six hours old. Refresh it before using satellite directions.';
 if(Math.abs(now-+epoch)>satelliteEpochWindowMs)return 'The orbital epoch is outside the supported three-day window around now.';
 if(Math.abs(+date-+epoch)>satelliteEpochWindowMs)return 'Choose an observing time within three days of the orbital epoch. Current elements cannot describe distant dates.';
 return '';
}
// TEME/SGP4 state stays separate from the J2000 catalogue projector.
export function satelliteState(elements:OrbitElements,date:Date){
 const epoch=parseOrbitalEpoch(elements.EPOCH);
 if(!epoch||!Number.isFinite(+date)||Math.abs(+date-+epoch)>satelliteEpochWindowMs)return null;
 try{
  const record=json2satrec({...elements,EPOCH:epoch.toISOString()}),state=propagate(record,date);
  if(!state||record.error!==0||![state.position.x,state.position.y,state.position.z,state.velocity.x,state.velocity.y,state.velocity.z].every(Number.isFinite))return null;
  return state;
 }catch{return null}
}
export function satelliteHorizontal(elements:OrbitElements,date:Date,latitude:number,longitude:number){
 return createSatelliteObserver(elements,latitude,longitude)?.(+date)??null;
}
// Compile once for a bounded pass search rather than reparsing OMM per sample.
export function createSatelliteObserver(elements:OrbitElements,latitude:number,longitude:number){
 if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)return null;
 const epoch=parseOrbitalEpoch(elements.EPOCH);if(!epoch)return null;
 try{
  const record=json2satrec({...elements,EPOCH:epoch.toISOString()});
  const observer={latitude:latitude*Math.PI/180,longitude:(longitude===180?-180:longitude)*Math.PI/180,height:0};
  return (time:number)=>{
   if(!Number.isFinite(time)||Math.abs(time-+epoch)>satelliteEpochWindowMs)return null;
   try{
    const date=new Date(time),state=propagate(record,date);
    if(!state||record.error!==0||![state.position.x,state.position.y,state.position.z,state.velocity.x,state.velocity.y,state.velocity.z].every(Number.isFinite))return null;
    const look=ecfToLookAngles(observer,eciToEcf(state.position,gstime(date)));
    const altitude=look.elevation*180/Math.PI,azimuth=((look.azimuth*180/Math.PI)%360+360)%360;
    return [altitude,azimuth,look.rangeSat].every(Number.isFinite)&&look.rangeSat>0?{altitude,azimuth,rangeKm:look.rangeSat}:null;
   }catch{return null}
  };
 }catch{return null}
}
