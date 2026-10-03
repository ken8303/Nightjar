/** Place chart labels without moving astronomical positions. Coordinates use the 440×390 SVG. */
export type SkyLabelPoint={name:string;x:number;y:number;mag:number;planet?:boolean};
export type SkyLabel={x:number;y:number;width:number;height:number};
const bounds={left:24,right:416,top:32,bottom:358};
function overlaps(a:SkyLabel,b:SkyLabel){
 return a.x<b.x+b.width+3&&a.x+a.width+3>b.x&&a.y-a.height<b.y+3&&a.y+3>b.y-b.height;
}
export function layoutSkyLabels(points:readonly SkyLabelPoint[],visibleNames:readonly string[],selected=''){
 const visible=new Set(visibleNames);if(selected)visible.add(selected);
 const labels=new Map<string,SkyLabel>();
 const candidates=points.filter(point=>visible.has(point.name)).sort((a,b)=>Number(b.name===selected)-Number(a.name===selected)||Number(Boolean(b.planet))-Number(Boolean(a.planet))||a.mag-b.mag||a.name.localeCompare(b.name));
 for(const point of candidates){
  const width=Math.min(bounds.right-bounds.left,Math.max(16,point.name.length*6.3)),height=12;
  const offsets=[[8,-8],[8,18],[-width-8,-8],[-width-8,18],[-width/2,-14],[-width/2,24]];
  const options=offsets.map(([dx,dy])=>({x:point.x+dx,y:point.y+dy,width,height}));
  const fits=(label:SkyLabel)=>label.x>=bounds.left&&label.x+label.width<=bounds.right&&label.y-label.height>=bounds.top&&label.y<=bounds.bottom;
  const clear=(label:SkyLabel)=>![...labels.values()].some(other=>overlaps(label,other))&&!points.some(other=>other.name!==point.name&&overlaps(label,{x:other.x-3,y:other.y+3,width:6,height:6}));
  const chosen=options.find(label=>fits(label)&&clear(label));
  if(chosen)labels.set(point.name,chosen);
  else if(point.name===selected){
   // A selected target must remain identified even in a dense cluster.
   const fallback=options[0];labels.set(point.name,{...fallback,x:Math.max(bounds.left,Math.min(bounds.right-width,fallback.x)),y:Math.max(bounds.top+height,Math.min(bounds.bottom,fallback.y))});
  }
 }
 return labels;
}

/** Resolve overlapping hit areas using the pointer's actual chart coordinates. */
export function nearestSkyPoint(points:readonly SkyLabelPoint[],x:number,y:number,maxDistance=22){
 let nearest:SkyLabelPoint|undefined,distance=maxDistance;
 for(const point of points){
  const candidate=Math.hypot(point.x-x,point.y-y);
  if(candidate<=distance&&(!nearest||candidate<distance)){nearest=point;distance=candidate}
 }
 return nearest?.name;
}
