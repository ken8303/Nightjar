import {createTranslator,messageCatalogues} from './messages';
import {englishMessages} from './messages/en';
export type Language='en'|'zh-Hant';
export const languageKey='nightjar-language-v1';
export const supportedLanguages:ReadonlyArray<{id:Language;label:string}>=[{id:'en',label:'English'},{id:'zh-Hant',label:'繁體中文'}];
export function parseLanguage(value:unknown):Language{return supportedLanguages.find(item=>item.id===value)?.id??'en'}
export function languageLocale(language:Language){return language==='en'?'en-GB':language}
const sectionKeys={tonight:'nav.tonight',sky:'nav.sky',moon:'nav.moon',places:'nav.places',aurora:'nav.aurora',events:'nav.events',tools:'nav.tools'} as const;
export function sectionLabel(key:string,language:Language,fallback:string){
 if(!Object.prototype.hasOwnProperty.call(sectionKeys,key))return fallback;
 return createTranslator(language)(sectionKeys[key as keyof typeof sectionKeys]);
}
const phaseKeys={"New Moon":"phase.new","Waxing crescent":"phase.waxingCrescent","First quarter":"phase.firstQuarter","Waxing gibbous":"phase.waxingGibbous","Full Moon":"phase.full","Waning gibbous":"phase.waningGibbous","Last quarter":"phase.lastQuarter","Waning crescent":"phase.waningCrescent"} as const;
const pendingKeys={"observing-time changes":"pending.time","coordinate entry":"pending.coordinates","imaging draft fields":"pending.imaging","unfinished diary forms":"pending.diary","target note edits":"pending.targetNotes","site name edits":"pending.siteName"} as const;
const shortcutKeys={"sky-chart":"shortcut.skyChart","deep-sky-finder":"shortcut.deepSky","target-finder":"shortcut.brightTargets","observing-diary":"shortcut.diary","visibility-planner":"shortcut.visibility"} as const;
const deepSkyTypeKeys={"Cluster and nebula":"deepSkyType.clusterNebula","Cluster with nebulosity":"deepSkyType.clusterWithNebulosity","Double star":"deepSkyType.doubleStar","Emission nebula":"deepSkyType.emissionNebula","Galaxy":"deepSkyType.galaxy","Globular cluster":"deepSkyType.globularCluster","H II region":"deepSkyType.hiiRegion","Nebula":"deepSkyType.nebula","Open cluster":"deepSkyType.openCluster","Other":"deepSkyType.other","Planetary nebula":"deepSkyType.planetaryNebula","Reflection nebula":"deepSkyType.reflectionNebula","Star association":"deepSkyType.starAssociation","Supernova remnant":"deepSkyType.supernovaRemnant"} as const;
const skyTargetKeys={"Moon":"target.Moon","Mercury":"target.Mercury","Venus":"target.Venus","Mars":"target.Mars","Jupiter":"target.Jupiter","Saturn":"target.Saturn","Uranus":"target.Uranus","Neptune":"target.Neptune","Sirius":"target.Sirius","Vega":"target.Vega","Polaris":"target.Polaris","Arcturus":"target.Arcturus","Capella":"target.Capella","Rigel":"target.Rigel","Betelgeuse":"target.Betelgeuse","Altair":"target.Altair","Deneb":"target.Deneb"} as const;
// Unknown source values remain unchanged. The catalogue also supplies English
// when a supported language does not yet have a particular translation.
type StaticLabelKey=typeof phaseKeys[keyof typeof phaseKeys]|typeof pendingKeys[keyof typeof pendingKeys]|typeof shortcutKeys[keyof typeof shortcutKeys]|typeof deepSkyTypeKeys[keyof typeof deepSkyTypeKeys]|typeof skyTargetKeys[keyof typeof skyTargetKeys];
function labelFor(keys:Readonly<Record<string,StaticLabelKey>>,value:string,language:Language,fallback:string){
 if(!Object.prototype.hasOwnProperty.call(keys,value))return fallback;
 const key=keys[value];
 return messageCatalogues[language]?.[key]??englishMessages[key];
}
export function moonPhaseLabel(name:string,language:Language){return labelFor(phaseKeys,name,language,name)}
export function pendingEditLabel(value:string,language:Language){
 const separator=messageCatalogues[language]?.['pending.separator']??englishMessages['pending.separator'];
 return value.split(', ').map(item=>labelFor(pendingKeys,item,language,item)).join(separator);
}
export function skyShortcutLabel(id:string,language:Language,fallback:string){return labelFor(shortcutKeys,id,language,fallback)}
export function deepSkyTypeLabel(value:string,language:Language){return labelFor(deepSkyTypeKeys,value,language,value)}
// Chinese aliases stay searchable independently of the active interface language.
export function skyTargetAlias(name:string,language:Language='zh-Hant'){
 const translated=labelFor(skyTargetKeys,name,language,name);
 return translated===name?'':translated;
}
export function skyTargetLabel(name:string,language:Language){
 const translated=labelFor(skyTargetKeys,name,language,name);
 return translated===name?name:`${translated} (${name})`;
}
