import {type Place} from './sky';
import {validPlace,samePlaceCoordinates,parseSavedPlaces} from './planner-state';
import {validEquipment,type Equipment} from './photography';
export const savedPlacesLimit=100,equipmentProfilesLimit=100;
export function readSavedPlaces(storage:Pick<Storage,'getItem'>):Place[]{
 return parseSavedPlaces(storage.getItem('nightjar-places'));
}
export function removeSavedPlace(current:Place[],expected:Place):Place[]{
 const index=current.findIndex(item=>samePlaceCoordinates(item,expected));
 if(index<0)throw Error('This place was already removed elsewhere. The latest saved list is shown.');
 const actual=current[index];
 if((['name','latitude','longitude','country','timezone','bortle'] as const).some(key=>actual[key]!==expected[key]))throw Error('This place changed elsewhere. Review the latest settings before removing it.');
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
 const value:unknown=JSON.parse(raw||'[]');
 if(!Array.isArray(value)||!value.every(validEquipment))throw Error('The saved equipment contains invalid data.');
 return value;
}
export function removeEquipmentProfile(current:Equipment[],expected:Equipment):Equipment[]{
 const index=current.findIndex(item=>item.name===expected.name);
 if(index<0)throw Error('This setup was already removed elsewhere. The latest saved list is shown.');
 if((['width','height','focal','pixel'] as const).some(key=>current[index][key]!==expected[key]))throw Error('This setup changed elsewhere. Review its latest dimensions before removing it.');
 return current.filter((_,i)=>i!==index);
}
export function restoreEquipmentProfile(current:Equipment[],removed:Equipment,index:number):Equipment[]{
 if(current.some(item=>item.name===removed.name))return [...current];
 if(current.length>=equipmentProfilesLimit)throw Error(`Your ${equipmentProfilesLimit}-setup list is full. This removal cannot be undone until there is space.`);
 if(!validEquipment(removed))throw Error('This equipment setup cannot be restored.');
 const next=[...current];next.splice(Math.max(0,Math.min(index,next.length)),0,removed);return next;
}
export function upsertSavedPlace(current:Place[],place:Place):Place[]{
 if(!validPlace(place))throw Error('Enter a valid observing place before saving.');
 const matches=(item:Place)=>Math.abs(item.latitude-place.latitude)<.0001&&Math.abs(item.longitude-place.longitude)<.0001;
 const next=current.some(matches)?current.map(item=>matches(item)?{...item,...place,bortle:place.bortle??item.bortle}:item):[...current,place];
 if(next.length>savedPlacesLimit)throw Error(`You can save up to ${savedPlacesLimit} places. Remove a saved place before adding another.`);
 return next;
}
export function upsertEquipmentProfile(current:Equipment[],equipment:Equipment):Equipment[]{
 const profile={...equipment,name:equipment.name.trim()};
 if(!validEquipment(profile))throw Error('Complete a valid imaging setup before saving.');
 const next=[...current.filter(item=>item.name!==profile.name),profile];
 if(next.length>equipmentProfilesLimit)throw Error(`You can save up to ${equipmentProfilesLimit} equipment setups. Remove a saved setup before adding another.`);
 return next;
}
