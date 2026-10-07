import {skyTargets,type Place} from './sky';
import {messierCatalogue,deepSkyPosition,deepSkyPhoto,deepSkyName,findDeepSky} from './deep-sky';
import {objectPhoto} from './object-photos';
import {findSkyTargets} from './sky-target-search';

export type CameraCatalogue='bright'|'deep-sky'|'all';
const messierById=new Map(messierCatalogue.map(target=>[target.id,target]));
export function cameraCatalogueTargets(date:Date,place:Place,mode:CameraCatalogue){
 const bright=mode==='deep-sky'?[]:skyTargets(date,place).map(target=>({...target,displayName:target.name,deepSky:false}));
 const deep=mode==='bright'?[]:messierCatalogue.map(target=>({name:target.id,displayName:`${target.id} · ${deepSkyName(target)}`,...deepSkyPosition(target,date,place),mag:target.magnitude??99,planet:false,deepSky:true}));
 return [...bright,...deep];
}
export function cameraCataloguePhoto(name:string){
 const target=messierById.get(name);return target?deepSkyPhoto(target):objectPhoto(name);
}
export function initialCameraView(date:Date,place:Place,id?:string){
 const now=new Date(+date),target=id?messierById.get(id):undefined;
 const view={date:now,mode:'bright' as CameraCatalogue,selected:'',bearing:0,altitude:30};
 if(!target)return view;
 const position=deepSkyPosition(target,now,place);
 return {...view,mode:'deep-sky' as CameraCatalogue,selected:target.id,...(position.altitude>0?{bearing:Math.round(position.azimuth)%360,altitude:Math.round(position.altitude)}:{})};
}
export function searchCameraTargets<T extends {name:string;altitude:number;deepSky:boolean}>(targets:T[],query:string):T[]{
 const deepIds=new Set(findDeepSky(query,'').map(target=>target.id));
 const brightNames=new Set(findSkyTargets(targets.filter(target=>!target.deepSky),query).map(target=>target.name));
 return targets.filter(target=>target.deepSky?deepIds.has(target.name):brightNames.has(target.name));
}
