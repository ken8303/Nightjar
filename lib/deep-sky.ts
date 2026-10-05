import catalogue from '@/data/messier.json';
import {A,observer,bodyPosition,type Place} from '@/lib/sky';
export const messierCatalogue=catalogue;
export type DeepSkyObject=(typeof catalogue)[number];
export function deepSkyPosition(target:DeepSkyObject,date:Date,place:Place){
 const vector=A.VectorFromSphere(new A.Spherical(target.dec,target.ra*15,1),date);
 const equator=A.EquatorFromVector(A.RotateVector(A.Rotation_EQJ_EQD(date),vector));
 return A.Horizon(date,observer(place),equator.ra,equator.dec,'normal');
}
export function findDeepSky(query:string,type:string){
 const normalize=(value:string)=>value.toLowerCase().replace(/\s+/g,'').replace(/^(m|ngc|ic)0+(?=\d)/,'$1');
 const normalized=normalize(query.trim());
 return catalogue.filter(target=>(!type||target.type===type)&&[target.id,target.catalogue,target.name,target.constellation].some(value=>normalize(value).includes(normalized)));
}
export function bestDeepSkyTime(target:DeepSkyObject,date:Date,place:Place){
 let best:{date:Date;altitude:number;azimuth:number}|null=null;
 for(let minute=0;minute<=1440;minute+=15){
  const sample=new Date(+date+minute*60000);
  if(bodyPosition(A.Body.Sun,sample,place).altitude>-18)continue;
  const position=deepSkyPosition(target,sample,place);
  if(position.altitude>30&&(!best||position.altitude>best.altitude))best={date:sample,altitude:position.altitude,azimuth:position.azimuth};
 }
 return best;
}
