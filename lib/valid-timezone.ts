// Diary autosave validates many records from the same observing site. Reusing
// the validity of a zone avoids constructing hundreds of Intl formatters for
// each character, while still validating every record's other fields.
const knownZones=new Map<string,boolean>();
export function validTimeZone(value:unknown):value is string{
 if(typeof value!=='string')return false;
 const known=knownZones.get(value);
 if(known!==undefined)return known;
 let valid=false;
 try{new Intl.DateTimeFormat('en',{timeZone:value});valid=true}catch{}
 // Imported values must not grow the cache without bound or retain huge keys.
 if(value.length<=100){
  if(knownZones.size>=128)knownZones.delete(knownZones.keys().next().value!);
  knownZones.set(value,valid);
 }
 return valid;
}
