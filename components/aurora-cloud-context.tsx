import {auroraWeatherAtForecast} from '@/lib/aurora-weather';
import type {AuroraFeed} from '@/lib/aurora';
import type {SatelliteWeather} from '@/lib/satellite-weather';
import type {Place} from '@/lib/sky';
import {useLanguage} from '@/components/language-provider';
const messages={
 'aurora-timing':'aurora.cloudTiming',
 'outside-darkness':'aurora.cloudOutside',
 loading:'aurora.cloudLoading',
 failed:'aurora.cloudFailed',
 unavailable:'aurora.cloudUnavailable',
 timing:'aurora.cloudNoTime',
 clock:'aurora.cloudClock',
 stale:'aurora.cloudStale',
 coverage:'aurora.cloudCoverage',
} as const;
export default function AuroraCloudContext({feed,place,weather,now,onRefresh}:{feed:AuroraFeed;place:Place;weather:SatelliteWeather;now:number;onRefresh:()=>void}){
 const {t}=useLanguage();
 const result=auroraWeatherAtForecast(feed,place,weather,now);
 return <section className="panel aurora-cloud-context" aria-labelledby="aurora-cloud-heading"><div className="section-label"><span>{t('aurora.cloudTitle')}</span></div><h2 id="aurora-cloud-heading">{t('aurora.cloudHeading')}</h2>{result.status==='available'?<p role="status">{t('aurora.cloudAvailable',{place:place.name,cloud:Math.round(result.minimum)})}</p>:<p role="status">{t(messages[result.status])}</p>}<p className="footnote">{t('aurora.cloudNote')}</p><button type="button" className="button" disabled={weather.loading} onClick={onRefresh}>{t(weather.loading?'aurora.refreshingWeather':'aurora.refreshWeather')}</button></section>;
}
