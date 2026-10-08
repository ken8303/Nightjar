export const skyShortcutSections=[['sky-chart','Sky chart'],['deep-sky-finder','Deep-sky explorer'],['observing-diary','Observing diary'],['visibility-planner','When to look']] as const;
export function readSkyShortcutHash(hash:unknown){
 if(typeof hash!=='string'||hash.length>256||!hash.startsWith('#'))return null;
 let id:string;try{id=decodeURIComponent(hash.slice(1))}catch{return null}
 const section=skyShortcutSections.find(([key])=>key===id);return section?{id:section[0],label:section[1]}:null;
}
