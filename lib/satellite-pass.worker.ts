import {parseOrbitElements} from './satellite-elements';
import {findSatellitePasses} from './satellite-passes';

self.onmessage=({data}:MessageEvent)=>{
 try{
  const result=findSatellitePasses(parseOrbitElements(data.elements,25544),data.start,data.latitude,data.longitude);
  self.postMessage({result});
 }catch(error){self.postMessage({error:error instanceof Error?error.message:'The pass search is unavailable.'})}
};
