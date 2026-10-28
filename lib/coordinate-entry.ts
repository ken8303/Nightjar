import {requestCoordinates} from './request-coordinates';
import type {Place} from './sky';

const draftText=(value:string)=>value.normalize('NFKC').trimStart();
export const coordinateIsNegative=(value:string)=>/^[-−]/.test(draftText(value));
export const coordinateMagnitude=(value:string)=>draftText(value).replace(/^[+\-−]/,'');
export function withCoordinateHemisphere(value:string,negative:boolean){
 const magnitude=coordinateMagnitude(value);
 const prefix=negative?'-':/^[+\-−]/.test(magnitude.trimStart())?'+':'';
 return prefix+magnitude;
}
export function coordinateInputDraft(value:string,negative:boolean){
 const raw=draftText(value);
 return withCoordinateHemisphere(raw,raw.startsWith('+')?false:coordinateIsNegative(raw)?true:negative);
}
function numericText(value:string){
 const raw=value.normalize('NFKC').trim().replace(/^−/,'-');
 return /^[-+]?(?:\d+,\d*|,\d+)(?:e[-+]?\d+)?$/i.test(raw)?raw.replace(',','.'):raw;
}
export function coordinateEntryValue(value:string,axis:'latitude'|'longitude'){
 const raw=numericText(value);
 const point=requestCoordinates(new URLSearchParams(axis==='latitude'?{lat:raw,lon:'0'}:{lat:'0',lon:raw}));
 return point?point[axis]:null;
}
export function coordinateEntryPoint(latitude:string,longitude:string):Place|null{
 const lat=coordinateEntryValue(latitude,'latitude'),lon=coordinateEntryValue(longitude,'longitude');
 return lat===null||lon===null?null:{name:`${lat.toFixed(3)}°, ${lon.toFixed(3)}°`,latitude:lat,longitude:lon};
}

// A comma with no following whitespace can also be a decimal separator.
// Accept it as a pair only when a decimal point or a signed second value
// makes the pair unambiguous; otherwise preserve the single-field draft.
export function coordinatePairDraft(value:string):{latitude:string;longitude:string}|null{
 if(value.length>200)return null;
 const raw=value.normalize('NFKC').trim();
 const content=raw.startsWith('(')&&raw.endsWith(')')?raw.slice(1,-1).trim():raw;
 const match=/^([+\-−]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+\-]?\d+)?)\s*,(\s*)([+\-−]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+\-]?\d+)?)$/i.exec(content);
 if(!match||match[1].length>80||match[3].length>80||!match[2]&&!match[1].includes('.')&&!match[3].includes('.')&&!/^[+\-−]/.test(match[3]))return null;
 const latitude=match[1].replace(/^−/,'-'),longitude=match[3].replace(/^−/,'-');
 return coordinateEntryPoint(latitude,longitude)?{latitude,longitude}:null;
}

export function coordinateEntryMatchesPoint(latitude:string,longitude:string,place:Pick<Place,'latitude'|'longitude'>){
 const point=coordinateEntryPoint(latitude,longitude);
 return Boolean(point&&point.latitude===place.latitude&&point.longitude===place.longitude);
}
