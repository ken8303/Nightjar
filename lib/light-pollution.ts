// Pinned visual product. This is artificial zenith brightness, never a Bortle class.
export const lightPollutionAtlas={
 year:2025,
 provider:'David Lorenz',
 source:'https://djlorenz.github.io/astronomy/lp/',
 legend:'https://djlorenz.github.io/astronomy/lp/colors.html',
 tiles:'https://djlorenz.github.io/astronomy/image_tiles/tiles2025/tile_{z}_{x}_{y}.png',
 south:-65,north:75,minZoom:2,maxNativeZoom:8,maxZoom:12,tileSize:1024,zoomOffset:-2,
} as const;

export function hasLightPollutionCoverage(latitude:number,longitude:number){
 return Number.isFinite(latitude)&&Number.isFinite(longitude)&&latitude>=lightPollutionAtlas.south&&latitude<lightPollutionAtlas.north&&longitude>=-180&&longitude<=180;
}

// Provider's expanded colour scale. Ratios are artificial / assumed natural
// zenith brightness; the natural reference is 22.0 mag/arcsec². The upper
// latitude is exclusive, matching the provider's numeric tile domain.
export const lightPollutionZones=[
 {zone:'0',below:.01,color:'#000000'},
 {zone:'1a',below:.06,color:'#222222'},
 {zone:'1b',below:.11,color:'#424242'},
 {zone:'2a',below:.19,color:'#142f72'},
 {zone:'2b',below:.33,color:'#2154d8'},
 {zone:'3a',below:.58,color:'#0f5714'},
 {zone:'3b',below:1,color:'#1fa12a'},
 {zone:'4a',below:1.73,color:'#6e641e'},
 {zone:'4b',below:3,color:'#b8a625'},
 {zone:'5a',below:5.2,color:'#bf641e'},
 {zone:'5b',below:9,color:'#fd9650'},
 {zone:'6a',below:15.59,color:'#fb5a49'},
 {zone:'6b',below:27,color:'#fb998a'},
 {zone:'7a',below:46.77,color:'#a0a0a0'},
 {zone:'7b',below:Infinity,color:'#f2f2f2'},
] as const;

export function lightPollutionZone(ratio:number){
 if(!Number.isFinite(ratio)||ratio<0)return null;
 return lightPollutionZones.find(zone=>ratio<zone.below)??null;
}

export type MapTileState='loading'|'loaded'|'failed';
export function mapTileHealth(tiles:ReadonlyMap<unknown,MapTileState>){
 let loading=0,loaded=0,failed=0;
 for(const value of tiles.values())if(value==='loading')loading++;else if(value==='loaded')loaded++;else failed++;
 return {loading,loaded,failed};
}

// Aborted/unloaded tile callbacks can arrive after the viewport has changed.
// A successfully loaded error placeholder is still missing data.
export function createMapTileTracker<T>(report:(health:ReturnType<typeof mapTileHealth>)=>void){
 const tiles=new Map<T,MapTileState>();
 let active=true;
 return {
  start(tile:T){if(!active)return;tiles.set(tile,'loading');report(mapTileHealth(tiles))},
  settle(tile:T,state:'loaded'|'failed'){if(!active||!tiles.has(tile)||tiles.get(tile)==='failed'&&state==='loaded')return;tiles.set(tile,state);report(mapTileHealth(tiles))},
  forget(tile:T){if(!active||!tiles.delete(tile))return;report(mapTileHealth(tiles))},
  dispose(){active=false;tiles.clear()},
 };
}
