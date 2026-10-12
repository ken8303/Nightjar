type Candidate={id:number;x:number;y:number;width:number;height:number};
// Labels stay inside the viewer and do not obscure one another. Selected
// landmarks take priority; every landmark remains available in the side list.
export function layoutLunarLabels(candidates:readonly Candidate[],bounds:{width:number;height:number},selected:number){
 const gap=4;
 if(!Number.isFinite(bounds.width)||!Number.isFinite(bounds.height)||bounds.width<=gap*2||bounds.height<=gap*2)return [];
 const placed:{id:number;left:number;top:number;width:number;height:number}[]=[];
 for(const candidate of [...candidates].sort((a,b)=>Number(b.id===selected)-Number(a.id===selected)||a.id-b.id)){
  const {id,x,y,width,height}=candidate;
  if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0||width>bounds.width-gap*2||height>bounds.height-gap*2||x<0||x>bounds.width||y<0||y>bounds.height)continue;
  const left=Math.max(gap,Math.min(bounds.width-width-gap,x)),top=Math.max(gap,Math.min(bounds.height-height-gap,y-height/2));
  if(placed.some(label=>left<label.left+label.width+gap&&left+width+gap>label.left&&top<label.top+label.height+gap&&top+height+gap>label.top))continue;
  placed.push({id,left,top,width,height});
 }
 return placed;
}
