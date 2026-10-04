export type AtlasView='3d'|'2d';
export const atlasViewKey='nightjar-sky-view-v1';
export type AtlasLayers={showLines:boolean;showLabels:boolean;showMilkyWay:boolean};
export const atlasLayersKey='nightjar-sky-layers-v1';
export function readAtlasLayers(storage?:Pick<Storage,'getItem'>):AtlasLayers{
 const defaults={showLines:true,showLabels:true,showMilkyWay:true};
 try{
  const value:unknown=JSON.parse((storage??localStorage).getItem(atlasLayersKey)??'null');
  if(!value||typeof value!=='object'||Array.isArray(value))return defaults;
  const record=value as Record<string,unknown>;
  return {showLines:typeof record.showLines==='boolean'?record.showLines:true,showLabels:typeof record.showLabels==='boolean'?record.showLabels:true,showMilkyWay:typeof record.showMilkyWay==='boolean'?record.showMilkyWay:true};
 }catch{return defaults}
}
export function saveAtlasLayers(layers:AtlasLayers,storage?:Pick<Storage,'setItem'>){
 try{(storage??localStorage).setItem(atlasLayersKey,JSON.stringify({showLines:layers.showLines,showLabels:layers.showLabels,showMilkyWay:layers.showMilkyWay}));return true}catch{return false}
}
export function readAtlasView(storage?:Pick<Storage,'getItem'>):AtlasView{
 try{return (storage??localStorage).getItem(atlasViewKey)==='2d'?'2d':'3d'}catch{return '3d'}
}
export function saveAtlasView(view:AtlasView,storage?:Pick<Storage,'setItem'>){
 try{(storage??localStorage).setItem(atlasViewKey,view);return true}catch{return false}
}
