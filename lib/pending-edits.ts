type EditOwner={section:string;label:string;retainedAcrossSections?:boolean};
export function createPendingEdits(){
 const owners=new Map<symbol,EditOwner>(),listeners=new Set<()=>void>();
 function snapshot(section?:string){return [...new Set([...owners.values()].filter(owner=>section===undefined||owner.section===section&&!owner.retainedAcrossSections).map(owner=>owner.label))].sort().join(', ')}
 function change(owner:symbol,value:EditOwner|null){
  const prior=owners.get(owner);if(value?prior?.section===value.section&&prior.label===value.label&&Boolean(prior.retainedAcrossSections)===Boolean(value.retainedAcrossSections):!prior)return;
  if(value)owners.set(owner,value);else owners.delete(owner);
  for(const listener of listeners)listener();
 }
 return {snapshot,change,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}}};
}
export function preventPendingEditUnload(event:Pick<BeforeUnloadEvent,'preventDefault'|'returnValue'>,pending:string){if(!pending)return;event.preventDefault();event.returnValue='true'}
export function watchPendingEditUnload(events:Pick<EventTarget,'addEventListener'|'removeEventListener'>,store:ReturnType<typeof createPendingEdits>){
 let attached=false;
 const guard=(event:Event)=>preventPendingEditUnload(event as BeforeUnloadEvent,store.snapshot());
 const sync=()=>{const needed=Boolean(store.snapshot());if(needed===attached)return;attached=needed;if(needed)events.addEventListener('beforeunload',guard);else events.removeEventListener('beforeunload',guard)};
 const unsubscribe=store.subscribe(sync);sync();
 return()=>{unsubscribe();if(attached){events.removeEventListener('beforeunload',guard);attached=false}};
}
