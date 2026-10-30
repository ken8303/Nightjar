import type {Language} from './language';
import type {Translator} from './messages';
import {englishMessages} from './messages/en';

const statusKeys=['iss.cancelled','iss.timeout','iss.unavailable','iss.issueInvalid','iss.issueFuture','iss.issueOld','iss.issueEpochNow','iss.issueEpochSelected','iss.issueRefreshIncomplete','iss.issueInvalidFeed','iss.issueProviderOffline','iss.passCancelled','iss.passTimeout','iss.passUnavailable','iss.passWorkerFailed','iss.passUnreadable','iss.passUnsupported','iss.calendarPrepared','iss.calendarFailed',"iss.errorOrbitalUnavailable","iss.errorCache","iss.errorCacheClock","iss.errorCoordinate","iss.errorCacheWrite","iss.errorInvalidNumber","iss.errorElements","iss.errorIdentity","iss.errorEpoch","iss.errorFrame","iss.errorVersion","iss.errorEphemeris","iss.errorBounds","iss.errorAngle","iss.errorElementSet","iss.errorMetadata","iss.errorSearchWindow","iss.errorSearchLimit","iss.errorSearchPropagation","iss.errorDuration","iss.errorInterval","iss.errorSelectedEpoch","iss.errorSite","iss.errorNoTime","iss.errorWindowLimit","iss.errorWindowInvalid","iss.errorWindowBright","iss.errorCalendarShort","iss.errorWorkerUnavailable"] as const;
// Keep unknown source messages intact: they may contain useful provider detail.
export function satelliteStatusLabel(value:string,language:Language,t:Translator){
 if(language==='en'||!value)return value;
 const key=statusKeys.find(key=>englishMessages[key]===value);if(key)return t(key);
 const http=/^Orbital provider returned HTTP (\d{3})\. Automatic refresh is paused for investigation\.$/.exec(value);
 return http?t('iss.issueProviderHttp',{status:http[1]}):value;
}
