import {type Place} from './sky';
import {validPlace,samePlaceCoordinates,readObservingSite} from './planner-state';
import {readSavedPlaces} from './saved-collections';

type SiteStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export class SiteRatingReadError extends Error{
 constructor(public scope:'places'|'selected'){super(scope==='places'?'Saved places could not be read. Retry reading them before changing the sky rating.':'The selected observing site could not be read. Its stored data was kept; retry reading the site before changing its rating.');this.name='SiteRatingReadError'}
}
export function rateObservingSite(storage:SiteStorage,current:Place,bortle:number|undefined){
 if(!validPlace({...current,bortle}))throw Error('Choose a sky rating from 1 to 9, or clear it.');
 let originalPlaces:string|null,originalPlace:string|null,latest:Place[];
 try{originalPlaces=storage.getItem('nightjar-places');latest=readSavedPlaces({getItem:()=>originalPlaces})}catch{throw new SiteRatingReadError('places')}
 try{originalPlace=storage.getItem('nightjar-place')}catch{throw new SiteRatingReadError('selected')}
 const selected=readObservingSite({getItem:()=>originalPlace});
 if(selected.error)throw new SiteRatingReadError('selected');
 if(originalPlace!==null&&!samePlaceCoordinates(selected.place,current))throw Error('The selected observing site changed elsewhere. Choose the site again before changing its sky rating.');
 const place:Place=originalPlace===null?{...current,bortle}:{...current,...selected.place,country:selected.place.country,timezone:selected.place.timezone,bortle};
 const places=latest.map(item=>samePlaceCoordinates(item,current)?{...item,bortle}:item);
 const values=[JSON.stringify(places),JSON.stringify(place)],writes:[string,string|null,string][]=[];
 let changed=false;
 const check=(key:string,expected:string|null)=>{if(storage.getItem(key)!==expected){changed=true;throw Error('Site settings changed during saving.')}};
 try{
  check('nightjar-places',originalPlaces);check('nightjar-place',originalPlace);
  if(JSON.stringify(places)!==JSON.stringify(latest)){writes.push(['nightjar-places',originalPlaces,values[0]]);storage.setItem('nightjar-places',values[0])}
  check('nightjar-places',writes.length?values[0]:originalPlaces);check('nightjar-place',originalPlace);
  writes.push(['nightjar-place',originalPlace,values[1]]);storage.setItem('nightjar-place',values[1]);
 }catch{
  let restored=true;
  for(const [key,raw,written] of writes.reverse())try{const stored=storage.getItem(key);if(stored===raw)continue;if(stored!==written){restored=false;continue}if(raw===null)storage.removeItem(key);else storage.setItem(key,raw)}catch{restored=false}
  throw Error(changed&&restored?'Site settings changed during saving. Your rating was not applied; review the selected site and retry.':restored?'This sky rating could not be saved. Your original settings were kept; restore browser storage access and retry.':'This sky rating could not be saved completely. Some changes may remain; review your site settings before retrying.');
 }
 return {place,places};
}
