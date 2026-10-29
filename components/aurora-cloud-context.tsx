import {auroraWeatherAtForecast} from '@/lib/aurora-weather';
import type {AuroraFeed} from '@/lib/aurora';
import type {SatelliteWeather} from '@/lib/satellite-weather';
import type {Place} from '@/lib/sky';
const messages={
 'aurora-timing':'Aurora timing needs attention before matching weather. Refresh the aurora outlook.',
 'outside-darkness':'Cloud context is hidden because the aurora forecast time is outside full astronomical darkness.',
 loading:'The site weather forecast is loading.',
 failed:'The weather refresh failed; cloud context is unavailable until it succeeds.',
 unavailable:'No site weather forecast is available for this time.',
 timing:'Weather retrieval time is unavailable; refresh before using cloud context.',
 clock:'Weather retrieval time is ahead of this device clock. Check the clock and refresh weather.',
 stale:'Weather is at least 30 minutes old; refresh before using cloud context.',
 coverage:'The hourly cloud forecast does not cover the aurora forecast time with a valid value.',
};
export default function AuroraCloudContext({feed,place,weather,now,onRefresh}:{feed:AuroraFeed;place:Place;weather:SatelliteWeather;now:number;onRefresh:()=>void}){
 const result=auroraWeatherAtForecast(feed,place,weather,now);
 return <section className="panel aurora-cloud-context" aria-labelledby="aurora-cloud-heading"><div className="section-label"><span>CLOUDS AT THE AURORA FORECAST TIME</span></div><h2 id="aurora-cloud-heading">Check the local sky too.</h2>{result.status==='available'?<p role="status">Forecast cloud cover at {place.name}: <strong>{Math.round(result.minimum)}%</strong> at NOAA’s forecast time.</p>:<p role="status">{messages[result.status]}</p>}<p className="footnote">Cloud cover comes from the Open-Meteo hourly forecast covering NOAA’s actual forecast time, not the planner’s selected time. Clouds, aurora strength and local visibility are separate estimates; none guarantees a visible display.</p><button type="button" className="button" disabled={weather.loading} onClick={onRefresh}>{weather.loading?'Refreshing weather…':'Refresh weather'}</button></section>;
}
