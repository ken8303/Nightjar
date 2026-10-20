type Site={name:string;latitude:number;longitude:number};
export type CameraLocationFix={accuracyMetres:number|null;timestamp:number|null};
type Callbacks={onPending:(pending:boolean)=>void;onSite:(site:Site,fix:CameraLocationFix)=>void;onError:()=>void};
// Geolocation reports horizontal accuracy in metres and acquisition time in
// Unix milliseconds. Unknown metadata must not invalidate usable coordinates.
function locationFix(accuracy:unknown,timestamp:unknown):CameraLocationFix{
 const time=typeof timestamp==='number'?new Date(timestamp):null;
 return {accuracyMetres:typeof accuracy==='number'&&accuracy>=0&&Number.isSafeInteger(Math.ceil(accuracy))?accuracy:null,timestamp:typeof timestamp==='number'&&Number.isSafeInteger(timestamp)&&timestamp>=0&&time&&Number.isFinite(+time)&&time.getUTCFullYear()<=9999?timestamp:null};
}
export function cameraLocationFixLabel(value:CameraLocationFix){
 const fix=locationFix(value.accuracyMetres,value.timestamp);
 const time=fix.timestamp===null?'unavailable':new Date(fix.timestamp).toISOString().replace('T',' ').replace('Z',' UTC');
 const accuracy=fix.accuracyMetres===null?'unavailable':`about ${fix.accuracyMetres>=1000?(fix.accuracyMetres/1000).toLocaleString('en-GB',{maximumFractionDigits:1})+' km':Math.ceil(fix.accuracyMetres).toLocaleString('en-GB')+' m'}`;
 return `Device fix time: ${time} · reported horizontal accuracy: ${accuracy}.`;
}
// Geolocation has no abort API. Ignore obsolete callbacks instead.
export function createCameraLocation(callbacks:Callbacks){
 let generation=0;
 function cancel(notify=true){generation++;if(notify)callbacks.onPending(false)}
 function start(acquire:(success:PositionCallback,failure:PositionErrorCallback)=>void){
  const request=++generation;callbacks.onPending(true);
  const fail=()=>{if(request!==generation)return;generation++;callbacks.onPending(false);callbacks.onError()};
  try{acquire(position=>{
   if(request!==generation)return;
   const {latitude,longitude}=position.coords;
   if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180){fail();return}
   generation++;callbacks.onPending(false);callbacks.onSite({name:'Current device location',latitude,longitude},locationFix(position.coords.accuracy,position.timestamp));
  },fail)}catch{fail()}
 }
 return {start,cancel};
}
