import {type Place} from './sky';
import {validPlace,samePlaceCoordinates,parseSavedPlaces} from './planner-state';
import {validEquipment,type Equipment} from './photography';
export const savedPlacesLimit=100,equipmentProfilesLimit=100;
export function readSavedPlaces(storage:Pick<Storage,'getItem'>):Place[]{
 return parseSavedPlaces(storage.getItem('nightjar-places'));
}
export function removeSavedPlace(current:Place[],expected:Place):Place[]{
 const index=current.findIndex(item=>samePlaceCoordinates(item,expected)&&(['name','latitude','longitude','country','timezone','bortle'] as const).every(key=>item[key]===expected[key]));
 if(index<0){
  if(current.some(item=>samePlaceCoordinates(item,expected)))throw Error('This place changed elsewhere. Review the latest settings before removing it.');
  throw Error('This place was already removed elsewhere. The latest saved list is shown.');
 }
 return current.filter((_,i)=>i!==index);
}
export function restoreSavedPlace(current:Place[],removed:Place,index:number):Place[]{
 if(current.some(item=>samePlaceCoordinates(item,removed)))return [...current];
 if(current.length>=savedPlacesLimit)throw Error(`Your ${savedPlacesLimit}-place list is full. This removal cannot be undone until there is space.`);
 if(!validPlace(removed))throw Error('This observing place cannot be restored.');
 const next=[...current];next.splice(Math.max(0,Math.min(index,next.length)),0,removed);return next;
}
export function readEquipmentProfiles(storage:Pick<Storage,'getItem'>):Equipment[]{
 const raw=storage.getItem('nightjar-equipment');
 if(raw&&raw.length>5*1024*1024)throw Error('The saved equipment could not be read.');
 const value:unknown=JSON.parse(raw===null?'[]':raw);
 if(!Array.isArray(value)||!value.every(validEquipment))throw Error('The saved equipment contains invalid data.');
 return value;
}
export function removeEquipmentProfile(current:Equipment[],expected:Equipment):Equipment[]{
 const index=current.findIndex(item=>item.name===expected.name&&(['width','height','focal','pixel'] as const).every(key=>item[key]===expected[key]));
 if(index<0){
  if(current.some(item=>item.name===expected.name))throw Error('This setup changed elsewhere. Review its latest dimensions before removing it.');
  throw Error('This setup was already removed elsewhere. The latest saved list is shown.');
 }
 return current.filter((_,i)=>i!==index);
}
export function restoreEquipmentProfile(current:Equipment[],removed:Equipment,index:number):Equipment[]{
 // Saving trims legacy names; Undo must recognise the same identity after
 // another tab re-saves it, rather than reintroducing an ambiguous duplicate.
 if(current.some(item=>item.name.trim()===removed.name.trim()))return [...current];
 if(current.length>=equipmentProfilesLimit)throw Error(`Your ${equipmentProfilesLimit}-setup list is full. This removal cannot be undone until there is space.`);
 if(!validEquipment(removed))throw Error('This equipment setup cannot be restored.');
 const next=[...current];next.splice(Math.max(0,Math.min(index,next.length)),0,removed);return next;
}
// Legacy lists can contain several names at the same coordinates. A chosen
// name identifies one alias; never replace every version during one edit.
export function savedPlaceUpdateIndex(current:Place[],place:Place){
 const matches=current.map((item,index)=>samePlaceCoordinates(item,place)?index:-1).filter(index=>index>=0);
 if(matches.length<=1)return matches[0]??-1;
 const named=matches.filter(index=>current[index].name===place.name);
 if(named.length===1)return named[0];
 throw Error('More than one saved place uses these coordinates. Review the saved list and choose a uniquely named entry before changing this site.');
}
export function upsertSavedPlace(current:Place[],place:Place):Place[]{
 if(!validPlace(place))throw Error('Enter a valid observing place before saving.');
 const index=savedPlaceUpdateIndex(current,place);
 const next=index>=0?current.map((item,i)=>i===index?{...item,...place,bortle:place.bortle??item.bortle}:item):[...current,place];
 if(next.length>savedPlacesLimit&&next.length>current.length)throw Error(`You can save up to ${savedPlacesLimit} places. Remove a saved place before adding another.`);
 return next;
}
export function upsertEquipmentProfile(current:Equipment[],equipment:Equipment):Equipment[]{
 const profile={...equipment,name:equipment.name.trim()};
 if(!validEquipment(profile))throw Error('Complete a valid imaging setup before saving.');
 const matches=current.map((item,index)=>item.name.trim()===profile.name?index:-1).filter(index=>index>=0);
 if(matches.length>1)throw Error('More than one saved setup uses this name. Enter a different setup name to keep existing versions.');
 const index=matches[0]??-1,updated=index<0?profile:{...current[index],...profile};
 const next=[...current.filter((_,i)=>i!==index),updated];
 if(next.length>equipmentProfilesLimit&&next.length>current.length)throw Error(`You can save up to ${equipmentProfilesLimit} equipment setups. Remove a saved setup before adding another.`);
 return next;
}

// Row identity follows the profile, not its array position. Include dimensions
// because legacy collections can repeat names; distinguish exact duplicates
// without introducing persisted IDs or changing backup compatibility.
export function equipmentProfileRowKeys(profiles:readonly Equipment[]){
 const occurrences=new Map<string,number>();
 return profiles.map(profile=>{
  const signature=JSON.stringify([profile.name,profile.width,profile.height,profile.focal,profile.pixel]);
  const occurrence=occurrences.get(signature)??0;occurrences.set(signature,occurrence+1);
  return `${signature}:${occurrence}`;
 });
}
