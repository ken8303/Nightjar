export function deepSkyNames(target:{name:string;catalogue:string;id:string}){
 const names=[...new Set(target.name.split(',').map(name=>name.trim()).filter(Boolean))];
 return {primary:names[0]||target.catalogue||target.id,aliases:names.slice(1)};
}
export function deepSkyName(target:{name:string;catalogue:string;id:string}){return deepSkyNames(target).primary}
