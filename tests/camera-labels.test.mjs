import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {layoutCameraLabels}=await vite.ssrLoadModule('/lib/camera-labels.ts');
const frame={width:400,height:600,left:20,top:40};
const item=(name,x,y=300,mag=1)=>({name,x:x+frame.left,y:y+frame.top,mag});
const names=labels=>labels.map(item=>item.name);
test('entry and exit margins prevent edge jitter without showing a clipped label',()=>{
 const target=item('Vega',88);
 assert.deepEqual(names(layoutCameraLabels([target],frame,160,'',[])),[]);
 assert.deepEqual(names(layoutCameraLabels([target],frame,160,'',['Vega'])),['Vega']);
 assert.deepEqual(names(layoutCameraLabels([item('Vega',81)],frame,160,'',['Vega'])),[]);
 assert.deepEqual(names(layoutCameraLabels([item('Vega',90)],frame,160,'',[])),['Vega']);
 assert.deepEqual(names(layoutCameraLabels([item('Vega',200,28)],frame,160,'',[])),[]);
 assert.deepEqual(names(layoutCameraLabels([item('Vega',200,28)],frame,160,'',['Vega'])),['Vega']);
});
test('existing labels keep priority over a brighter newcomer until a clear gap exists',()=>{
 const existing=item('Existing',120,200,2),bright=item('Bright',284,200,0);
 assert.deepEqual(names(layoutCameraLabels([existing,bright],frame,160,'',['Existing'])),['Existing']);
 assert.deepEqual(names(layoutCameraLabels([existing,{...bright,x:existing.x+172}],frame,160,'',['Existing'])),['Existing','Bright']);
});
test('selecting an overlapping object takes priority immediately',()=>{
 const a=item('A',200),b=item('B',210,300,0);
 assert.deepEqual(names(layoutCameraLabels([a,b],frame,160,'B',['A'])),['B']);
 assert.deepEqual(names(layoutCameraLabels([item('Selected',82)],frame,160,'Selected',[])),[]);
 assert.deepEqual(names(layoutCameraLabels([item('Selected',90)],frame,160,'Selected',[])),['Selected']);
});
test('retained objects always use new positions and disappear when not in the candidate list',()=>{
 const result=layoutCameraLabels([item('A',210,250)],frame,120,'',['A','Missing']);
 assert.deepEqual(result,[{name:'A',x:230,y:290}]);
 assert.deepEqual(layoutCameraLabels([],frame,120,'',['A']),[]);
});
test('layout stays bounded, ignores invalid coordinates and duplicates, and adapts to thumbnail widths',()=>{
 const list=Array.from({length:12},(_,i)=>({name:String(i),x:100+(i%3)*180,y:100+Math.floor(i/3)*100,mag:i}));
 assert.equal(layoutCameraLabels(list,{width:700,height:600,left:0,top:0},160,'',[]).length,8);
 assert.deepEqual(names(layoutCameraLabels([item('A',68),item('Bad',NaN)],frame,120,'',[])),[]);
 assert.deepEqual(names(layoutCameraLabels([item('A',70),item('A',200)],frame,120,'',[])),['A']);
 assert.deepEqual(names(layoutCameraLabels([item('A',70)],frame,160,'',[])),[]);
});


test('a selected object uses edge hysteresis while preserving fresh coordinates',()=>{
 let visible=[];
 for(const [x,expected] of [[91,true],[87,true],[81,false],[85,false],[89,false],[90,true]]){
  const labels=layoutCameraLabels([item('Selected',x)],frame,160,'Selected',visible);
  assert.equal(labels.length,expected?1:0);
  if(expected)assert.equal(labels[0].x,x+frame.left);
  visible=names(labels);
 }
});
