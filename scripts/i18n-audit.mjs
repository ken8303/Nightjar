// Validate catalogue structure without requiring every language to be complete.
const placeholders=value=>[...new Set([...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match=>match[1]))].sort();
export function auditCatalogues(catalogues,languages){
 const errors=[],reports=[],ids=languages.map(item=>item.id),registered=new Set(ids);
 if(registered.size!==ids.length)errors.push('Language identifiers must be unique.');
 if(!registered.has('en'))errors.push('The English source language must be registered.');
 const source=catalogues.en;
 if(!source||typeof source!=='object')return {errors:[...errors,'The English source catalogue is missing.'],reports};
 const keys=Object.keys(source).sort();
 if(!keys.length)errors.push('The English source catalogue is empty.');
 for(const key of keys)if(typeof source[key]!=='string'||!source[key].trim())errors.push(`English message ${key} must be a non-empty string.`);
 for(const id of Object.keys(catalogues))if(!registered.has(id))errors.push(`Catalogue ${id} is not registered in the language selector.`);
 for(const id of ids){
  const catalogue=catalogues[id];
  if(!catalogue||typeof catalogue!=='object'){errors.push(`Registered language ${id} has no catalogue.`);continue}
  for(const key of Object.keys(catalogue))if(!Object.hasOwn(source,key))errors.push(`${id}: unknown message ${key}.`);
  const missing=[];
  for(const key of keys){
   if(!Object.hasOwn(catalogue,key)){missing.push(key);continue}
   const value=catalogue[key];
   if(typeof value!=='string'||!value.trim()){errors.push(`${id}: message ${key} must be a non-empty string.`);continue}
   if(typeof source[key]==='string'&&JSON.stringify(placeholders(value))!==JSON.stringify(placeholders(source[key])))errors.push(`${id}: placeholders do not match for ${key}.`);
  }
  reports.push({id,total:keys.length,translated:keys.length-missing.length,missing});
 }
 return {errors,reports};
}
