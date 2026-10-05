// East, north, up; W3C intrinsic Z-X'-Y'' device rotations.
export type Vector=[number,number,number];
export type CameraBasis={right:Vector;up:Vector;forward:Vector};
const rad=Math.PI/180;
export const wrapBearing=(value:number)=>(value%360+360)%360;
export const bearingDifference=(to:number,from:number)=>((to-from+540)%360)-180;
export function skyVector(altitude:number,azimuth:number):Vector{
 const a=altitude*rad,b=azimuth*rad;
 return [Math.cos(a)*Math.sin(b),Math.cos(a)*Math.cos(b),Math.sin(a)];
}
export function manualCameraBasis(bearing:number,altitude:number):CameraBasis{
 const b=bearing*rad,a=altitude*rad;
 return {forward:skyVector(altitude,bearing),right:[Math.cos(b),-Math.sin(b),0],up:[-Math.sin(a)*Math.sin(b),-Math.sin(a)*Math.cos(b),Math.cos(a)]};
}
export function deviceCameraBasis(alpha:number|null,beta:number|null,gamma:number|null,screenAngle=0):CameraBasis|null{
 if([alpha,beta,gamma,screenAngle].some(value=>value===null||!Number.isFinite(value)))return null;
 const a=alpha!*rad,b=beta!*rad,g=gamma!*rad,s=-screenAngle*rad;
 const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cg=Math.cos(g),sg=Math.sin(g);
 const x:Vector=[ca*cg-sa*sb*sg,sa*cg+ca*sb*sg,-cb*sg];
 const y:Vector=[-cb*sa,ca*cb,sb];
 const forward:Vector=[-cg*sa*sb-ca*sg,-sa*sg+ca*cg*sb,-cb*cg];
 return {forward,right:x.map((v,i)=>v*Math.cos(s)+y[i]*Math.sin(s)) as Vector,up:y.map((v,i)=>v*Math.cos(s)-x[i]*Math.sin(s)) as Vector};
}
// Safari compass heading follows the device's top edge, not the rear lens.
// Rotate the entire relative basis to that heading, preserving pitch and roll.
export function safariHeadingOffset(alpha:number|null,beta:number|null,gamma:number|null,heading:number):number|null{
 const device=deviceCameraBasis(alpha,beta,gamma,0);
 if(!device||!Number.isFinite(heading)||heading<0||heading>=360)return null;
 const [east,north]=device.up;
 if(Math.hypot(east,north)<.1)return null;
 return bearingDifference(heading,wrapBearing(Math.atan2(east,north)/rad));
}
export function safariCameraBasis(alpha:number|null,beta:number|null,gamma:number|null,heading:number,screenAngle=0):CameraBasis|null{
 const offset=safariHeadingOffset(alpha,beta,gamma,heading);
 const screen=deviceCameraBasis(alpha,beta,gamma,screenAngle);
 return offset===null||!screen?null:rotateCameraBearing(screen,offset);
}
export function rotateCameraBearing(basis:CameraBasis,offset:number):CameraBasis{
 const a=offset*rad,c=Math.cos(a),s=Math.sin(a);
 const rotate=([e,n,u]:Vector):Vector=>[e*c+n*s,n*c-e*s,u];
 return {forward:rotate(basis.forward),right:rotate(basis.right),up:rotate(basis.up)};
}
export function cameraDirection(basis:CameraBasis){
 const [e,n,u]=basis.forward;
 return {bearing:wrapBearing(Math.atan2(e,n)/rad),altitude:Math.asin(Math.max(-1,Math.min(1,u)))/rad};
}
// Bearing calibration needs a meaningful horizontal direction. Near zenith,
// very small pointing errors can imply a large change in compass bearing.
export function cameraHeadingAlignment(basis:CameraBasis,altitude:number,azimuth:number){
 const direction=cameraDirection(basis);
 if(!Number.isFinite(altitude)||!Number.isFinite(azimuth)||!Number.isFinite(direction.bearing)||!Number.isFinite(direction.altitude))return {reason:'invalid'} as const;
 if(altitude<=0)return {reason:'horizon'} as const;
 if(altitude>=85||Math.abs(direction.altitude)>=85)return {reason:'zenith'} as const;
 if(Math.abs(direction.altitude-altitude)>10)return {reason:'pitch'} as const;
 return {reason:'ready',offset:bearingDifference(azimuth,direction.bearing)} as const;
}
export function targetDirectionGuide(basis:CameraBasis,altitude:number,azimuth:number){
 if(!Number.isFinite(altitude)||!Number.isFinite(azimuth))return null;
 if(altitude<=0)return {below:true,separation:0,bearingDelta:0,elevationDelta:0};
 const direction=cameraDirection(basis),target=skyVector(altitude,azimuth);
 const dot=target.reduce((sum,value,i)=>sum+value*basis.forward[i],0);
 return {below:false,separation:Math.acos(Math.max(-1,Math.min(1,dot)))/rad,bearingDelta:bearingDifference(azimuth,direction.bearing),elevationDelta:altitude-direction.altitude};
}
// The calibrated long side stays the same when an uncropped image rotates.
// Derive the vertical angle from that lens angle and the actual video shape.
export function cameraVerticalFov(longEdgeFov:number,aspect:number){
 if(!Number.isFinite(longEdgeFov)||longEdgeFov<=0||longEdgeFov>=180||!Number.isFinite(aspect)||aspect<=0)return null;
 return 2*Math.atan(Math.tan(longEdgeFov*rad/2)/Math.max(1,aspect))/rad;
}
export function projectSkyTarget(altitude:number,azimuth:number,basis:CameraBasis,aspect:number,verticalFov:number){
 if(!Number.isFinite(altitude)||!Number.isFinite(azimuth)||altitude<=0||!(aspect>0)||!Number.isFinite(aspect)||verticalFov<=0||verticalFov>=180||!Number.isFinite(verticalFov))return null;
 const v=skyVector(altitude,azimuth),dot=(axis:Vector)=>v.reduce((sum,value,i)=>sum+value*axis[i],0);
 const depth=dot(basis.forward);if(depth<=0)return null;
 const scale=Math.tan(verticalFov*rad/2);
 const x=.5+dot(basis.right)/(depth*scale*aspect*2),y=.5-dot(basis.up)/(depth*scale*2);
 return x>=0&&x<=1&&y>=0&&y<=1?{x,y}:null;
}
export function cameraErrorMessage(error:unknown){
 const name=error&&typeof error==='object'&&'name' in error?error.name:'';
 if(name==='NotAllowedError'||name==='SecurityError')return 'Camera access was denied. Allow camera access in your browser settings, then try again. Manual direction preview is still available.';
 if(name==='NotFoundError'||name==='OverconstrainedError')return 'No rear camera is available. Try a phone with a rear camera, or use manual direction preview.';
 if(name==='NotReadableError')return 'The camera is busy or unavailable. Close other camera apps, then try again.';
 return 'The camera could not start. Try again, or use manual direction preview.';
}
export function stopCameraStream(stream:Pick<MediaStream,'getTracks'>|null){stream?.getTracks().forEach(track=>track.stop())}

export function canShowCameraLabels(camera:'off'|'starting'|'on',paused:boolean,tracking:boolean,sensor:{absolute:boolean}|null,aligned:boolean){
 return !paused&&(tracking?!!sensor&&(sensor.absolute||aligned):camera==='off');
}

export function cameraImageFrame(width:number,height:number,ratio:number){
 if(!(width>0)||!(height>0)||!(ratio>0)||![width,height,ratio].every(Number.isFinite))return {width:0,height:0,left:0,top:0};
 const frameWidth=Math.min(width,height*ratio),frameHeight=frameWidth/ratio;
 return {width:frameWidth,height:frameHeight,left:(width-frameWidth)/2,top:(height-frameHeight)/2};
}

// Without a live image the entire stage is the preview canvas. Live/starting
// camera sessions keep the video's fitted rectangle so labels cannot drift into bars.
export function cameraOverlayFrame(camera:'off'|'starting'|'on',width:number,height:number,ratio:number){
 return cameraImageFrame(width,height,camera==='off'?width/height:ratio);
}
