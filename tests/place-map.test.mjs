import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {placeMapSource,placeMapLatitudeLimit:limit}=await vite.ssrLoadModule('/lib/place-map.ts');
test('polar sites offer no misleading Mercator map or invalid latitude bounds',()=>{
 assert(limit>85&&limit<86);
 for(const latitude of [-90,-85.1,-limit,-limit+1e-8,limit-1e-8,limit,85.1,90])assert.equal(placeMapSource({latitude,longitude:180}),null);
});
test('near-edge maps bound their view while preserving the exact observing marker',()=>{
 for(const latitude of [-limit+.001,-85.05,0,85.05,limit-.001])for(const longitude of [-180,0,180]){
  const site={latitude,longitude},before={...site},url=new URL(placeMapSource(site));
  const [west,south,east,north]=url.searchParams.get('bbox').split(',').map(Number);
  assert.deepEqual(site,before);assert.equal(url.searchParams.get('marker'),`${latitude},${longitude}`);
  assert(south>=-limit&&north<=limit&&south<north);assert(latitude>=south&&latitude<=north);
  assert(Math.abs((south+north)/2-latitude)<1e-12,'the requested site stays at the centre instead of clipping its marker at an edge');
  const expectedWidth=.24*Math.min(1,(limit-Math.abs(latitude))/.08);
  assert(Math.abs(east-west-expectedWidth)<1e-10);assert(longitude>=west&&longitude<=east);
  assert(Math.abs((east+west)/2-longitude)<1e-12);
 }
});
test('ordinary maps retain their source and invalid coordinates cannot reach the provider',()=>{
 assert.equal(placeMapSource({latitude:51.5,longitude:0}),'https://www.openstreetmap.org/export/embed.html?bbox=-0.12%2C51.42%2C0.12%2C51.58&layer=mapnik&marker=51.5%2C0');
 for(const site of [{latitude:NaN,longitude:0},{latitude:0,longitude:Infinity},{latitude:0,longitude:180.1},{latitude:0,longitude:-180.1}])assert.equal(placeMapSource(site),null);
});
