import {type Place} from './sky';
import {validPlace} from './planner-state';
import {validEquipment,type Equipment} from './photography';
export const savedPlacesLimit=100,equipmentProfilesLimit=100;
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
