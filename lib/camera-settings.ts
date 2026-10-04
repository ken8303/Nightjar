export type CameraSettings={fov:number;showPhotos:boolean};
const key='nightjar-camera-settings-v2';
const legacyKey='nightjar-camera-settings-v1';
const defaults:CameraSettings={fov:60,showPhotos:true};
function validFov(value:unknown):value is number{return typeof value==='number'&&Number.isInteger(value)&&value>=30&&value<=100}
export function readCameraSettings(storage?:Pick<Storage,'getItem'>):CameraSettings{
 try{
  const source=storage??localStorage;
  const raw=source.getItem(key);
  // Old values measured the vertical angle. Preserve the photo preference,
  // but use the new default rather than guessing the old camera orientation.
  if(raw===null){
   const old:unknown=JSON.parse(source.getItem(legacyKey)||'null');
   return {...defaults,showPhotos:old&&typeof old==='object'&&'showPhotos' in old&&typeof old.showPhotos==='boolean'?old.showPhotos:defaults.showPhotos};
  }
  const data:unknown=JSON.parse(raw);
  if(!data||typeof data!=='object'||Array.isArray(data))return {...defaults};
  const value=data as Record<string,unknown>;
  return {fov:validFov(value.fov)?value.fov:defaults.fov,showPhotos:typeof value.showPhotos==='boolean'?value.showPhotos:defaults.showPhotos};
 }catch{return {...defaults}}
}
export function saveCameraSettings(value:CameraSettings,storage?:Pick<Storage,'setItem'>){
 if(!validFov(value.fov)||typeof value.showPhotos!=='boolean')return false;
 try{(storage??localStorage).setItem(key,JSON.stringify({fov:value.fov,showPhotos:value.showPhotos}));return true}catch{return false}
}
