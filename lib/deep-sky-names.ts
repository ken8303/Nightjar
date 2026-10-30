import type {Language} from './language';
import {messageCatalogues} from './messages';
export function deepSkyNames(target:{name:string;catalogue:string;id:string}){
 const names=[...new Set(target.name.split(',').map(name=>name.trim()).filter(Boolean))];
 return {primary:names[0]||target.catalogue||target.id,aliases:names.slice(1)};
}
export function deepSkyName(target:{name:string;catalogue:string;id:string}){return deepSkyNames(target).primary}

const translatedNames={"M1":"dso.M1","M6":"dso.M6","M7":"dso.M7","M8":"dso.M8","M11":"dso.M11","M13":"dso.M13","M16":"dso.M16","M17":"dso.M17","M20":"dso.M20","M27":"dso.M27","M31":"dso.M31","M33":"dso.M33","M42":"dso.M42","M44":"dso.M44","M45":"dso.M45","M51":"dso.M51","M57":"dso.M57","M63":"dso.M63","M64":"dso.M64","M81":"dso.M81","M82":"dso.M82","M101":"dso.M101","M104":"dso.M104","NGC104":"dso.NGC104","NGC253":"dso.NGC253","NGC3372":"dso.NGC3372","NGC5139":"dso.NGC5139","NGC6543":"dso.NGC6543","NGC6960":"dso.NGC6960","NGC6992":"dso.NGC6992","NGC7000":"dso.NGC7000","NGC7293":"dso.NGC7293","IC5070":"dso.IC5070"} as const;
export const deepSkyTranslationIds:readonly string[]=Object.freeze(Object.keys(translatedNames));
export function deepSkyChineseName(id:string){return Object.hasOwn(translatedNames,id)?messageCatalogues['zh-Hant'][translatedNames[id as keyof typeof translatedNames]]??'':''}
export function deepSkyLabel(target:{name:string;catalogue:string;id:string},language:Language){const original=deepSkyName(target),translated=language==='zh-Hant'?deepSkyChineseName(target.id):'';return translated&&translated!==original?`${translated} (${original})`:original}
