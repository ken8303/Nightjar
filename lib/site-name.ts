import {type Place} from './sky';
import {validPlace,samePlaceCoordinates} from './planner-state';
import {readSavedPlaces} from './saved-collections';

type SiteStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function renameObservingSite(storage:SiteStorage,current:Place,value:string){
 const place={...current,name:value.trim()};
 if(!validPlace(place))throw Error('Enter a site name from 1 to 199 characters.');
 const originalPlaces=storage.getItem('nightjar-places'),originalPlace=storage.getItem('nightjar-place');
 const latest=readSavedPlaces({getItem:()=>originalPlaces});
 const places=latest.map(item=>samePlaceCoordinates(item,current)?{...item,name:place.name}:item);
 const writes:[string,string|null,string][]=[];
 try{
  if(JSON.stringify(places)!==JSON.stringify(latest)){const value=JSON.stringify(places);writes.push(['nightjar-places',originalPlaces,value]);storage.setItem('nightjar-places',value)}
  const value=JSON.stringify(place);writes.push(['nightjar-place',originalPlace,value]);storage.setItem('nightjar-place',value);
 }catch{
  let restored=true;
  for(const [key,raw,written] of writes.reverse())try{const stored=storage.getItem(key);if(stored===raw)continue;if(stored!==written){restored=false;continue}if(raw===null)storage.removeItem(key);else storage.setItem(key,raw)}catch{restored=false}
  throw Error(restored?'This name could not be saved. Your original site was kept; free browser storage and retry.':'This name could not be saved completely. Review your saved sites before retrying.');
 }
 return {place,places};
}
