import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {lightPollutionAtlas,hasLightPollutionCoverage,lightPollutionZones,lightPollutionZone,mapTileHealth,createMapTileTracker,savedMapMarkers}=await vite.ssrLoadModule('/lib/light-pollution.ts');

test('saved map markers group date-line aliases, preserve names and omit unprojectable sites',()=>{
 const sites=[{name:'Current',latitude:51,longitude:0},{name:'East',latitude:1,longitude:180},{name:'West alias',latitude:1,longitude:-180},{name:'Near',latitude:1.00001,longitude:-180},{name:'Pole',latitude:90,longitude:0}],before=structuredClone(sites);
 assert.deepEqual(savedMapMarkers(sites,{latitude:51,longitude:0}),{markers:[{latitude:1,longitude:-180,names:['East','West alias'],omittedNames:0},{latitude:1.00001,longitude:-180,names:['Near'],omittedNames:0}],omitted:0,outside:1,selected:1});
 const many=Array.from({length:205},(_,i)=>({name:String(i),latitude:0,longitude:i/10}));
 const limited=savedMapMarkers(many,{latitude:10,longitude:0});assert.equal(limited.markers.length,200);assert.equal(limited.omitted,5);assert.deepEqual(sites,before);
 const aliases=Array.from({length:25},(_,i)=>({name:String(i),latitude:1,longitude:2}));assert.equal(savedMapMarkers(aliases,{latitude:0,longitude:0}).markers[0].omittedNames,5);
});

test('atlas coverage respects the provider domain and keeps either date-line spelling valid',()=>{
 for(const lat of [-65,0,74.999999])for(const lon of [-180,0,180])assert.equal(hasLightPollutionCoverage(lat,lon),true);
 for(const [lat,lon] of [[75,0],[-65.0001,0],[90,0],[-90,0],[0,180.0001],[0,-180.0001],[NaN,0],[0,Infinity]])assert.equal(hasLightPollutionCoverage(lat,lon),false);
});
test('visual product stays pinned to the published 2025 tile geometry',()=>{
 assert.equal(lightPollutionAtlas.year,2025);
 assert.equal(lightPollutionAtlas.tiles,'https://djlorenz.github.io/astronomy/image_tiles/tiles2025/tile_{z}_{x}_{y}.png');
 assert.equal(lightPollutionAtlas.tileSize,1024);assert.equal(lightPollutionAtlas.zoomOffset,-2);assert.equal(lightPollutionAtlas.maxNativeZoom,8);
 assert.equal(new URL(lightPollutionAtlas.source).hostname,'djlorenz.github.io');
});
test('expanded ratio zones retain provider boundaries, independently of Bortle ratings',()=>{
 const boundaries=[.01,.06,.11,.19,.33,.58,1,1.73,3,5.2,9,15.59,27,46.77];
 assert.deepEqual(lightPollutionZones.slice(0,-1).map(item=>item.below),boundaries);
 assert.equal(lightPollutionZone(0).zone,'0');assert.equal(lightPollutionZone(.99999).zone,'3b');assert.equal(lightPollutionZone(1).zone,'4a');assert.equal(lightPollutionZone(46.77).zone,'7b');
 for(const bad of [-1,NaN,Infinity])assert.equal(lightPollutionZone(bad),null);
 // All fifteen colours were independently observed in the provider's 1024²
 // PNG tile_4_7_5.png (19 October 2026); no raster is redistributed here.
 assert.deepEqual(lightPollutionZones.map(item=>item.color),['#000000','#222222','#424242','#142f72','#2154d8','#0f5714','#1fa12a','#6e641e','#b8a625','#bf641e','#fd9650','#fb5a49','#fb998a','#a0a0a0','#f2f2f2']);
});
test('unloaded or replaced tiles stop contributing failures without disguising a partial failure',()=>{
 const tiles=new Map([['old','failed'],['north','loaded'],['south','loading']]);
 assert.deepEqual(mapTileHealth(tiles),{failed:1,loaded:1,loading:1});
 tiles.delete('old');tiles.set('south','failed');
 assert.deepEqual(mapTileHealth(tiles),{failed:1,loaded:1,loading:0});
 tiles.set('south','loaded');assert.deepEqual(mapTileHealth(tiles),{failed:0,loaded:2,loading:0});
 tiles.clear();assert.deepEqual(mapTileHealth(tiles),{failed:0,loaded:0,loading:0});
});

test('tile lifecycles reject late callbacks and keep a loaded error placeholder marked unavailable',()=>{
 let latest;const tracker=createMapTileTracker(health=>{latest=health});
 tracker.start('old');tracker.forget('old');tracker.settle('old','failed');assert.deepEqual(latest,{loading:0,loaded:0,failed:0});
 tracker.start('visible');tracker.settle('visible','failed');tracker.settle('visible','loaded');assert.deepEqual(latest,{loading:0,loaded:0,failed:1});
 tracker.start('visible');tracker.settle('visible','loaded');assert.deepEqual(latest,{loading:0,loaded:1,failed:0});
 tracker.dispose();tracker.start('retired');tracker.settle('retired','failed');tracker.forget('visible');assert.deepEqual(latest,{loading:0,loaded:1,failed:0});
});

test('map site selection retains precise coordinates and has no inherited rating or place metadata',async()=>{
 const {mapCentreSite}=await vite.ssrLoadModule('/lib/light-pollution.ts');
 const {resolveObservingPlace,validPlace}=await vite.ssrLoadModule('/lib/planner-state.ts');
 const point=mapCentreSite(51.5085123456,.75323456789);
 assert.deepEqual(point,{name:'51.509°, 0.753°',latitude:51.5085123456,longitude:.75323456789});assert.equal(validPlace(point),true);
 const current={name:'Old rated site',latitude:51.5085,longitude:-.1257,bortle:7,country:'Old country',timezone:'Europe/London'};
 const next=resolveObservingPlace(point,[],current);assert.equal(next.bortle,undefined);assert.equal(next.country,undefined);assert.notEqual(next.name,current.name);
 for(const longitude of [-180,180])assert.equal(mapCentreSite(-65,longitude).longitude,longitude);
 for(const [lat,lon] of [[NaN,0],[0,Infinity],[91,0],[0,181]])assert.equal(mapCentreSite(lat,lon),null);
});
