import {englishMessages} from './messages/en';
import type {Translator} from './messages';

const fixedKeys=["weatherError.unavailable","weatherError.unavailableShort","weatherError.unreadable","weatherError.timeout","weatherError.timestamps","weatherError.cloud","weatherError.samples"] as const;
export function weatherFeedback(message:string,t:Translator){
 for(const key of fixedKeys)if(message===englishMessages[key])return t(key);
 return message;
}
