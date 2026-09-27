export type Equipment={name:string;width:number;height:number;focal:number;pixel:number};
export function validEquipment(e:Equipment){return typeof e.name==='string'&&e.name.trim().length>0&&e.name.length<=80&&[e.width,e.height,e.focal,e.pixel].every(v=>Number.isFinite(v)&&v>0)&&e.width<=100&&e.height<=100&&e.focal<=20000&&e.pixel<=100}
export function fieldOfView(sensor:number,focal:number){return 2*Math.atan(sensor/(2*focal))*180/Math.PI}
export function imageScale(pixel:number,focal:number){return 206.264806*pixel/focal}
export function mosaic(ra:number,dec:number,width:number,height:number,cols:number,rows:number,overlap:number,rotation:number){
 if(![ra,dec,width,height,cols,rows,overlap,rotation].every(Number.isFinite)||ra<0||ra>=24||Math.abs(dec)>75||width<=0||height<=0||width>10||height>10||!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1||cols>6||rows>6||overlap<0||overlap>50)throw Error('Use RA 0–24 h, declination −75° to 75°, 1–6 rows/columns, 0–50% overlap, and fields no wider than 10°.');
 const rad=Math.PI/180,a=ra*15*rad,d=dec*rad,theta=rotation*rad,dx=2*Math.tan(width*rad/2)*(1-overlap/100),dy=2*Math.tan(height*rad/2)*(1-overlap/100);
 const center=[Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d)],east=[-Math.sin(a),Math.cos(a),0],north=[-Math.sin(d)*Math.cos(a),-Math.sin(d)*Math.sin(a),Math.cos(d)];
 const panels=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const u=(col-(cols-1)/2)*dx,v=((rows-1)/2-row)*dy,x=u*Math.cos(theta)+v*Math.sin(theta),y=-u*Math.sin(theta)+v*Math.cos(theta);
  const p=center.map((c,i)=>c+x*east[i]+y*north[i]);const norm=Math.hypot(...p);
  panels.push({panel:panels.length+1,row:row+1,column:col+1,raHours:((Math.atan2(p[1],p[0])/rad/15)%24+24)%24,decDegrees:Math.asin(p[2]/norm)/rad});
 }
 return panels;
}
export function mosaicCsv(panels:ReturnType<typeof mosaic>){return 'panel,row,column,ra_hours,dec_degrees\r\n'+panels.map(p=>[p.panel,p.row,p.column,p.raHours.toFixed(7),p.decDegrees.toFixed(7)].join(',')).join('\r\n')+'\r\n'}
