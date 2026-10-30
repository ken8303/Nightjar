import type {Translator} from './messages';
const names={'Tycho':'moon.tycho','Copernicus':'moon.copernicus','Mare Tranquillitatis':'moon.tranquility'} as const;
export function lunarLandmarkName(name:string,t:Translator){return Object.hasOwn(names,name)?t(names[name as keyof typeof names]):name}
export function lunarLandmarkType(type:string,t:Translator){return type==='Impact crater'?t('moon.crater'):type==='Lunar mare · Sea of Tranquility'?t('moon.mare'):type}
const contactKeys={'Penumbral begins':'eclipse.penumbralBegins','Partial begins':'eclipse.partialBegins','Totality begins':'eclipse.totalBegins','Greatest eclipse':'eclipse.greatest','Totality ends':'eclipse.totalEnds','Partial ends':'eclipse.partialEnds','Penumbral ends':'eclipse.penumbralEnds'} as const;
export function lunarContactLabel(label:string,t:Translator){return Object.hasOwn(contactKeys,label)?t(contactKeys[label as keyof typeof contactKeys]):label}
