export type TargetExtent={major:number|null;minor:number|null;positionAngle:number|null};
export function framingGuide(width:number,height:number,cols:number,rows:number,overlap:number,rotation:number,target?:TargetExtent){
 if(![width,height,cols,rows,overlap,rotation].every(Number.isFinite)||width<=0||height<=0||width>10||height>10||!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1||cols>6||rows>6||overlap<0||overlap>50)return null;
 const rad=Math.PI/180,w=2*Math.tan(width*rad/2),h=2*Math.tan(height*rad/2),theta=rotation*rad;
 const rotate=(x:number,y:number)=>({x:x*Math.cos(theta)+y*Math.sin(theta),y:-x*Math.sin(theta)+y*Math.cos(theta)});
 const spanW=w*(1+(cols-1)*(1-overlap/100)),spanH=h*(1+(rows-1)*(1-overlap/100));
 const panels=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const x=(col-(cols-1)/2)*w*(1-overlap/100),y=((rows-1)/2-row)*h*(1-overlap/100);
  panels.push({number:panels.length+1,centre:rotate(x,y),corners:[rotate(x-w/2,y+h/2),rotate(x+w/2,y+h/2),rotate(x+w/2,y-h/2),rotate(x-w/2,y-h/2)]});
 }
 let object:null|{rx:number;ry:number;angle:number;uncertain:boolean;fitsFrame:boolean;fitsMosaic:boolean}=null;
 if(target?.major!==null&&target?.major!==undefined&&Number.isFinite(target.major)&&target.major>0&&target.major<600){
  const major=Math.tan(target.major/60*rad/2),known=target.minor!==null&&Number.isFinite(target.minor)&&target.minor>0&&target.minor<=target.major&&target.positionAngle!==null&&Number.isFinite(target.positionAngle);
  const minor=known?Math.tan(target.minor!/60*rad/2):major,angle=known?target.positionAngle!:0,relative=angle*rad-theta;
  const extentW=Math.hypot(minor*Math.cos(relative),major*Math.sin(relative)),extentH=Math.hypot(minor*Math.sin(relative),major*Math.cos(relative));
  object={rx:minor,ry:major,angle,uncertain:!known,fitsFrame:extentW<=w/2&&extentH<=h/2,fitsMosaic:extentW<=spanW/2&&extentH<=spanH/2};
 }
 const points=panels.flatMap(panel=>panel.corners),objectRad=object?Math.max(object.rx,object.ry):0;
 const extentX=Math.max(objectRad,...points.map(point=>Math.abs(point.x))),extentY=Math.max(objectRad,...points.map(point=>Math.abs(point.y)));
 return {panels,object,extentX,extentY,width,height,spanWidth:2*Math.atan(spanW/2)/rad,spanHeight:2*Math.atan(spanH/2)/rad};
}
