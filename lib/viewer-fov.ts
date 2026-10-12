// Preserve the baseline field of view on the viewer's shortest dimension.
// PerspectiveCamera stores the vertical angle, which must widen in portrait.
export function viewerVerticalFov(baseline:number,aspect:number){
 if(!Number.isFinite(baseline)||baseline<=0||baseline>=180||!Number.isFinite(aspect)||aspect<=0)throw Error('Invalid viewer field of view.');
 return aspect<1?2*Math.atan(Math.tan(baseline*Math.PI/360)/aspect)*180/Math.PI:baseline;
}
