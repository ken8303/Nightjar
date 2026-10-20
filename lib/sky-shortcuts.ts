export const skyShortcutSections=[['sky-chart','Sky chart'],['deep-sky-finder','Deep-sky explorer'],['observing-diary','Observing diary'],['visibility-planner','When to look']] as const;
export function readSkyShortcutHash(hash:unknown){
 if(typeof hash!=='string'||hash.length>256||!hash.startsWith('#'))return null;
 let id:string;try{id=decodeURIComponent(hash.slice(1))}catch{return null}
 const section=skyShortcutSections.find(([key])=>key===id);return section?{id:section[0],label:section[1]}:null;
}
// A guarded same-page link may already have changed the fragment. Restore
// only that page's previous fragment; never accept another route or origin.
export function previousShortcutURL(oldURL:unknown,currentURL:string){
 if(typeof oldURL!=='string')return null;
 try{
  const previous=new URL(oldURL),current=new URL(currentURL);
  return previous.origin===current.origin&&previous.pathname===current.pathname&&previous.search===current.search?current.pathname+current.search+previous.hash:null;
 }catch{return null}
}
