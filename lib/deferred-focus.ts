type Destination=Pick<HTMLElement,'isConnected'|'closest'|'focus'|'scrollIntoView'>;
type Page=Pick<Document,'hidden'|'activeElement'|'body'>;

// Dialog cleanup can defer navigation focus until the next frame. A later
// action owns its focus; resolve the destination only if this handoff still does.
export function deferFocusAndScroll(resolve:()=>Destination|null,{page=document,schedule=requestAnimationFrame,owner=page.activeElement}:{page?:Page;schedule?:typeof requestAnimationFrame;owner?:Element|null}={}){
 schedule(()=>{
  if(page.hidden||page.activeElement!==owner&&page.activeElement!==page.body)return;
  const destination=resolve();
  if(!destination?.isConnected||destination.closest('[aria-hidden="true"]'))return;
  destination.focus({preventScroll:true});
  destination.scrollIntoView({block:'start',behavior:'instant'});
 });
}
