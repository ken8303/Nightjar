type EditOwner={section:string;label:string};
export function createPendingEdits(){
 const owners=new Map<symbol,EditOwner>(),listeners=new Set<()=>void>();
 function snapshot(section?:string){return [...new Set([...owners.values()].filter(owner=>section===undefined||owner.section===section).map(owner=>owner.label))].sort().join(', ')}
 function change(owner:symbol,value:EditOwner|null){
  const prior=owners.get(owner);if(value?prior?.section===value.section&&prior.label===value.label:!prior)return;
  if(value)owners.set(owner,value);else owners.delete(owner);
  for(const listener of listeners)listener();
 }
 return {snapshot,change,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}}};
}
export function preventPendingEditUnload(event:Pick<BeforeUnloadEvent,'preventDefault'|'returnValue'>,pending:string){if(!pending)return;event.preventDefault();event.returnValue=''}
