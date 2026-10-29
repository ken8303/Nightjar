import {skyTargetAlias} from './language';
export function findSkyTargets<T extends {name:string;altitude:number}>(targets:T[],query:string,minimumAltitude:number|null=null,savedNames:readonly string[]|null=null):T[]{
 const normalize=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/\s+/g,'');
 const term=normalize(query);
 const saved=savedNames===null?null:new Set(savedNames);
 return targets.filter(target=>(!saved||saved.has(target.name))&&(normalize(target.name).includes(term)||normalize(skyTargetAlias(target.name)).includes(term))&&(minimumAltitude===null||target.altitude>minimumAltitude));
}
