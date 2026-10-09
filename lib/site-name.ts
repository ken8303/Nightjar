import {type Place} from './sky';
import {validPlace,samePlaceCoordinates,readObservingSite} from './planner-state';
import {readSavedPlaces} from './saved-collections';

type SiteStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function renameObservingSite(storage:SiteStorage,current:Place,value:string){
 let place={...current,name:value.trim()};
 if(!validPlace(place))throw Error('Enter a site name from 1 to 199 characters.');
 const originalPlaces=storage.getItem('nightjar-places'),originalPlace=storage.getItem('nightjar-place');
 const latest=readSavedPlaces({getItem:()=>originalPlaces});
 const selected=readObservingSite({getItem:()=>originalPlace});
 if(originalPlace!==null&&!selected.error){
  if(!samePlaceCoordinates(selected.place,current)||selected.place.name!==current.name)throw Error('The selected observing site changed elsewhere. Choose the site again before saving its name. Your name edit is still here.');
  place={...current,...selected.place,country:selected.place.country,timezone:selected.place.timezone,bortle:selected.place.bortle,name:place.name};
 }
 const places=latest.map(item=>samePlaceCoordinates(item,current)?{...item,name:place.name}:item);
 const writes:[string,string|null,string][]=[];let selectedChanged=false,placesChanged=false,guardUnreadable=false;
 const check=(key:string,expected:string|null)=>{
  let stored:string|null;try{stored=storage.getItem(key)}catch{guardUnreadable=true;throw Error('Current site settings are unavailable.')}
  if(stored!==expected){if(key==='nightjar-place')selectedChanged=true;else placesChanged=true;throw Error('Site settings changed during saving.')}
 };
 try{
  check('nightjar-places',originalPlaces);check('nightjar-place',originalPlace);
  if(JSON.stringify(places)!==JSON.stringify(latest)){const value=JSON.stringify(places);writes.push(['nightjar-places',originalPlaces,value]);storage.setItem('nightjar-places',value)}
  check('nightjar-places',writes.length?writes[0][2]:originalPlaces);check('nightjar-place',originalPlace);
  const value=JSON.stringify(place);writes.push(['nightjar-place',originalPlace,value]);storage.setItem('nightjar-place',value);
 }catch{
  let restored=true;
  for(const [key,raw,written] of writes.reverse())try{const stored=storage.getItem(key);if(stored===raw)continue;if(stored!==written){restored=false;continue}if(raw===null)storage.removeItem(key);else storage.setItem(key,raw)}catch{restored=false}
  throw Error(guardUnreadable&&!writes.length?'Current site settings could not be checked. Your edit was not applied; restore storage access and retry.':placesChanged&&restored?'Saved places changed during saving. Your edit was not applied; review your saved sites and retry.':selectedChanged&&restored?'The selected observing site changed during saving. Your edit was not applied; choose the site again before retrying.':restored?'This name could not be saved. Your original site was kept; free browser storage and retry.':'This name could not be saved completely. Review your saved sites before retrying.');
 }
 return {place,places};
}
