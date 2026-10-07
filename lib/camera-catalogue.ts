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
export function searchCameraTargets<T extends {name:string;altitude:number;deepSky:boolean}>(targets:T[],query:string):T[]{
 const deepIds=new Set(findDeepSky(query,'').map(target=>target.id));
 const brightNames=new Set(findSkyTargets(targets.filter(target=>!target.deepSky),query).map(target=>target.name));
 return targets.filter(target=>target.deepSky?deepIds.has(target.name):brightNames.has(target.name));
}
