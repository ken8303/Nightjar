import {validPlace} from './planner-state';
import {type Place} from './sky';
// A forecast may finish after another tab chooses or edits its observing site.
export function saveForecastTimezone(storage:Pick<Storage,'getItem'|'setItem'>,expected:Place,timezone:string){
 try{
  if(!validPlace({...expected,timezone}))return false;
  const raw=storage.getItem('nightjar-place');if(raw===null||raw.length>5*1024*1024)return false;
  const stored:unknown=JSON.parse(raw);if(!validPlace(stored))return false;
  if((['name','latitude','longitude','country','timezone','bortle'] as const).some(key=>stored[key]!==expected[key]))return false;
  if(stored.timezone!==timezone)storage.setItem('nightjar-place',JSON.stringify({...stored,timezone}));
  return true;
 }catch{return false}
}
