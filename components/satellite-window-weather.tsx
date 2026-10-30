import {satelliteWindowWeather,type SatelliteWeather} from '@/lib/satellite-weather';
import {useLanguage} from '@/components/language-provider';
const utc=(time:number)=>new Date(time).toISOString().replace('T',' ').replace(/\.\d{3}Z$/,' UTC');
const messages={loading:'iss.cloudLoading',failed:'iss.cloudFailed',unavailable:'iss.cloudUnavailable',timing:'iss.cloudTiming',clock:'iss.cloudClock',stale:'iss.cloudStale',coverage:'iss.cloudCoverage'} as const;
export default function SatelliteWindowWeather({start,end,weather,now}:{start:number;end:number;weather:SatelliteWeather;now:number}){
 const {t}=useLanguage();
 const result=satelliteWindowWeather(start,end,weather,now);
 if(result.status!=='available')return <p className="footnote satellite-window-weather" role="status">{t(messages[result.status])}</p>;
 const minimum=Math.round(result.minimum),maximum=Math.round(result.maximum);
 const cloud=minimum===maximum?`${minimum}%`:`${minimum}–${maximum}%`;
 return <div className="satellite-window-weather"><p role="status">{t(result.hours===1?'iss.cloudWindowOne':'iss.cloudWindowMany',{cloud,hours:result.hours})}</p><p className="footnote">{t('iss.cloudWindowNote')}<time className="block" dateTime={new Date(result.fetchedAt).toISOString()}>{utc(result.fetchedAt)}</time></p></div>;
}
