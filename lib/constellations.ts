// Names: https://iauarchive.eso.org/public/themes/constellations/
// OpenNGC separates Serpens into Se1 (Caput) and Se2 (Cauda):
// https://github.com/mattiaverga/OpenNGC/blob/master/NGC_guide.txt
import type {Language} from './language';
import {messageCatalogues} from './messages';
import {englishConstellationMessages} from './messages/constellations/en';
import {traditionalChineseConstellationMessages} from './messages/constellations/zh-hant';

type ConstellationKey=keyof typeof englishConstellationMessages;
function constellationKey(code:string):ConstellationKey|null{
 const key=`constellation.${code}`;
 return Object.prototype.hasOwnProperty.call(englishConstellationMessages,key)?key as ConstellationKey:null;
}
export function constellationName(code:string){
 const key=constellationKey(code);
 return key?englishConstellationMessages[key]:code;
}
// Chinese names remain searchable in either interface language.
export function traditionalChineseConstellationName(code:string){
 const key=constellationKey(code);
 return key?(traditionalChineseConstellationMessages as Partial<Record<ConstellationKey,string>>)[key]??'':'';
}
export function constellationLabel(code:string,language:Language,fallback=constellationName(code)){
 const key=constellationKey(code);
 if(!key||language==='en')return fallback;
 return messageCatalogues[language]?.[key]??fallback;
}
