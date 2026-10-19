import type {Plugin} from 'vite';
const wasmExport="export * from './wasm/index.js';";
// satellite.js 7.1's public root also re-exports optional pthread WASM runtimes.
// Vite analyses their workers before tree-shaking unused exports. This app uses
// only the independently tested JS SGP4 API. Filter that ONE unused root export,
// without editing node_modules, vendoring the engine or changing worker format.
export function satelliteJavaScriptOnly():Plugin{
 return {name:'nightjar-satellite-javascript',enforce:'pre',transform(code,id){
  if(!id.split('?')[0].replaceAll('\\','/').endsWith('/node_modules/satellite.js/dist/index.js'))return null;
  if(code.split(wasmExport).length!==2)throw Error('Review the pinned satellite.js root entry before updating its browser integration.');
  return {code:code.replace(wasmExport,''),map:null};
 }};
}
