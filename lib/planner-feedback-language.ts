import {englishMessages} from './messages/en';
import type {Translator} from './messages';

const fixedKeys=['summary.downloaded','summary.downloadFailed','summary.shareFailed','meteor.downloaded','meteor.downloadFailed'] as const;
export function plannerFeedback(message:string,t:Translator){
 for(const key of fixedKeys)if(message===englishMessages[key])return t(key);
 const shared=message.match(/^Share options completed for ([\s\S]+)\. This summary is a snapshot and will not update\.$/);
 return shared?t('summary.shareCompleted',{label:shared[1]}):message;
}
