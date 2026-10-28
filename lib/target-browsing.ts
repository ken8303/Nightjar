import type {DiaryFilters} from './diary-filters';
type Listener=()=>void;

// Each planner owns its stores. They retain browsing across deferred view
// unmounts, without persisting searches or keeping hidden sky renderers alive.
function browsingStore<T extends object>(initial:T){
 let snapshot:Readonly<T>=Object.freeze({...initial});
 const listeners=new Set<Listener>();
 return {
  getSnapshot:()=>snapshot,
  subscribe:(listener:Listener)=>{listeners.add(listener);return()=>{listeners.delete(listener)}},
  update:(patch:Partial<T>)=>{
   if(!Object.keys(patch).some(key=>!Object.is(snapshot[key as keyof T],patch[key as keyof T])))return;
   snapshot=Object.freeze({...snapshot,...patch});
   for(const listener of listeners)listener();
  },
 };
}

export function createDeepSkyBrowsing(){
 return {...browsingStore({query:'',type:'',constellation:'',catalogue:'' as ''|'messier'|'ngc'|'ic',magnitude:'',above:false,darkOnly:false,savedOnly:false,selected:'M31'}),diary:createDiaryBrowsing(),comparison:createDeepSkyComparisonBrowsing()};
}
function createDeepSkyComparisonBrowsing(){
 return browsingStore<{open:boolean;moonBelowOnly:boolean;chosen:string|null;horizon:{site:string;draft:string[];applied:string}|null}>({open:false,moonBelowOnly:false,chosen:null,horizon:null});
}
function createDiaryBrowsing(){
 return browsingStore<DiaryFilters&{showAll:boolean}>({query:'',outcome:'',from:'',through:'',showAll:false});
}
function createVisibilityBrowsing(){
 return browsingStore<{body:string|null}>({body:null});
}
export function createBrightTargetBrowsing(){
 return {...browsingStore({query:'',constellation:'',aboveOnly:false,aboveThirty:false,savedOnly:false}),visibility:createVisibilityBrowsing()};
}
export type DeepSkyBrowsing=ReturnType<typeof createDeepSkyBrowsing>;
export type BrightTargetBrowsing=ReturnType<typeof createBrightTargetBrowsing>;
export type DiaryBrowsing=ReturnType<typeof createDiaryBrowsing>;
export type DeepSkyComparisonBrowsing=ReturnType<typeof createDeepSkyComparisonBrowsing>;
export type VisibilityBrowsing=ReturnType<typeof createVisibilityBrowsing>;
