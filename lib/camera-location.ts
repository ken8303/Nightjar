type Site={name:string;latitude:number;longitude:number};
type Callbacks={onPending:(pending:boolean)=>void;onSite:(site:Site)=>void;onError:()=>void};
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
   generation++;callbacks.onPending(false);callbacks.onSite({name:'Current device location',latitude,longitude});
  },fail)}catch{fail()}
 }
 return {start,cancel};
}
