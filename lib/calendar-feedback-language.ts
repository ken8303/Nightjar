import {englishMessages} from './messages/en';
import type {Translator} from './messages';
const fixedKeys=["calendar.errorCoordinates","calendar.errorWindow","calendar.errorWindowRange","calendar.errorWindowDark","calendar.errorDeepInvalid","calendar.errorDeepSamples","calendar.errorDeepDark","calendar.errorDeepGeneric","calendar.errorGeneric"] as const;
export function calendarFeedback(message:string,t:Translator){
 for(const key of fixedKeys)if(message===englishMessages[key])return t(key);
 return message;
}
