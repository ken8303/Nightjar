export function findSkyTargets<T extends {name:string;altitude:number}>(targets:T[],query:string,minimumAltitude:number|null=null):T[]{
 const normalize=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/\s+/g,'');
 const term=normalize(query);
 return targets.filter(target=>normalize(target.name).includes(term)&&(minimumAltitude===null||target.altitude>minimumAltitude));
}
