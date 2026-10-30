import {createTranslator} from './messages';
import type {Language} from './language';
export const eventMessages={
 Quadrantids:['meteor.quadrantids.name','meteor.quadrantids.date','meteor.quadrantids.rate','meteor.quadrantids.note'],
 Lyrids:['meteor.lyrids.name','meteor.lyrids.date','meteor.lyrids.rate','meteor.lyrids.note'],
 'Eta Aquariids':['meteor.etaAquariids.name','meteor.etaAquariids.date','meteor.etaAquariids.rate','meteor.etaAquariids.note'],
 Perseids:['meteor.perseids.name','meteor.perseids.date','meteor.perseids.rate','meteor.perseids.note'],
 Orionids:['meteor.orionids.name','meteor.orionids.date','meteor.orionids.rate','meteor.orionids.note'],
 Leonids:['meteor.leonids.name','meteor.leonids.date','meteor.leonids.rate','meteor.leonids.note'],
 Geminids:['meteor.geminids.name','meteor.geminids.date','meteor.geminids.rate','meteor.geminids.note'],
} as const;
export function meteorNameLabel(name:string,language:Language){
 return Object.hasOwn(eventMessages,name)?createTranslator(language)(eventMessages[name as keyof typeof eventMessages][0]):name;
}
