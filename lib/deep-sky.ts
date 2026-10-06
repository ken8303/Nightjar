import catalogue from '@/data/messier.json';
import {constellationName} from './constellations';
import {skySurveyPhoto} from '@/lib/object-photos';
import {A,observer,bodyPosition,type Place} from '@/lib/sky';
export const messierCatalogue=catalogue;
export type DeepSkyObject=(typeof catalogue)[number];
export function deepSkyPosition(target:DeepSkyObject,date:Date,place:Place){
 const vector=A.VectorFromSphere(new A.Spherical(target.dec,target.ra*15,1),date);
 const equator=A.EquatorFromVector(A.RotateVector(A.Rotation_EQJ_EQD(date),vector));
 return A.Horizon(date,observer(place),equator.ra,equator.dec,'normal');
}
export function findDeepSky(query:string,type:string,{constellation='',maximumMagnitude}:{constellation?:string;maximumMagnitude?:number}={}){
 const normalize=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/\s+/g,'').replace(/^(m|ngc|ic)0+(?=\d)/,'$1');
 const normalized=normalize(query.trim());
 return catalogue.filter(target=>(!type||target.type===type)&&(!constellation||target.constellation===constellation)&&(maximumMagnitude===undefined||Number.isFinite(maximumMagnitude)&&target.magnitude!==null&&target.magnitude<=maximumMagnitude)&&[target.id,target.catalogue,target.name,target.constellation,constellationName(target.constellation)].some(value=>normalize(value).includes(normalized)));
}
export function deepSkyWindow(target:DeepSkyObject,date:Date,place:Place){
 return Array.from({length:97},(_,index)=>{
  const time=new Date(+date+index*15*60000);
  return {time,sun:bodyPosition(A.Body.Sun,time,place).altitude,...deepSkyPosition(target,time,place)};
 });
}
export type DeepSkySample=ReturnType<typeof deepSkyWindow>[number];
export function bestDeepSkySample(samples:DeepSkySample[]){
 return samples.reduce<DeepSkySample|null>((best,sample)=>sample.sun<=-18&&sample.altitude>30&&(!best||sample.altitude>best.altitude)?sample:best,null);
}
export function bestDeepSkyTime(target:DeepSkyObject,date:Date,place:Place){
 const best=bestDeepSkySample(deepSkyWindow(target,date,place));
 return best?{date:best.time,altitude:best.altitude,azimuth:best.azimuth}:null;
}
export function deepSkyPhoto(target:DeepSkyObject){
 const field=Math.min(60,Math.max(15,Math.ceil((target.major??12)*1.25)));
 const photo=skySurveyPhoto(target.id,target.ra,target.dec,field);
 return {...photo,title:'Deep-sky survey field',caption:`Archival red-band photographic field, ${field} × ${field} arcminutes, centred on ${target.id}. ${target.major!==null&&target.major>field?'This shows the central region; the catalogue object extends beyond the frame.':'A survey reference, not a live view or a prediction of visual appearance.'}`};
}
