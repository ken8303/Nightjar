export function viewerZoomKey(zoom:number,key:string){
 switch(key){
  case '+':case '=':return Math.min(3,zoom+.5);
  case '-':return Math.max(1,zoom-.5);
  case '0':return 1;
  default:return undefined;
 }
}
