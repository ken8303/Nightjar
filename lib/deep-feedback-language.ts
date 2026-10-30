import {englishMessages} from './messages/en';
import type {Translator} from './messages';

const fixedKeys=[
 'deepFeedback.loadedError',
 'deepFeedback.readError',
 'deepFeedback.loaded',
 'deepFeedback.unavailable',
 'deepFeedback.saved',
 'deepFeedback.saveError',
 'deepFeedback.undoError',
 'deepFeedback.planReady',
 'deepFeedback.planError',
 'deepFeedback.invalidEntries',
 'deepFeedback.invalidList',
 'bright.statusListFull',
] as const;

export function deepFeedback(message:string,t:Translator){
 for(const key of fixedKeys)if(message===englishMessages[key])return t(key);
 const already=message.match(/^([\s\S]+) is already saved\. Your current list was kept\.$/);if(already)return t('bright.statusAlreadySaved',{name:already[1]});
 const restored=message.match(/^([\s\S]+) restored to your deep-sky list\.$/);if(restored)return t('deepFeedback.restored',{name:restored[1]});
 return message;
}
