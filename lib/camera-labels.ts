type Candidate={name:string;x:number;y:number;mag:number};
type Frame={width:number;height:number;left:number;top:number};
// Retain identities, not old positions. Entry margins exceed exit margins so
// tiny movements do not repeatedly swap labels at edges or collisions.
export function layoutCameraLabels(candidates:Candidate[],frame:Frame,width:number,selected:string,previous:string[]){
 const retained=new Set(previous),placed:{name:string;x:number;y:number}[]=[];
 const ordered=[...candidates].sort((a,b)=>Number(b.name===selected)-Number(a.name===selected)||Number(retained.has(b.name))-Number(retained.has(a.name))||a.mag-b.mag||a.name.localeCompare(b.name));
 for(const target of ordered){
  if(!Number.isFinite(target.x)||!Number.isFinite(target.y)||placed.some(item=>item.name===target.name))continue;
  const established=retained.has(target.name)||target.name===selected;
  const margin=established?2:10,vertical=established?24:32;
  const x=target.x-frame.left,y=target.y-frame.top;
  if(x<width/2+margin||x>frame.width-width/2-margin||y<vertical||y>frame.height-vertical)continue;
  const gap=established?4:12,height=established?48:56;
  if(placed.some(item=>Math.abs(item.x-target.x)<width+gap&&Math.abs(item.y-target.y)<height))continue;
  placed.push({name:target.name,x:target.x,y:target.y});if(placed.length===8)break;
 }
 return placed;
}
