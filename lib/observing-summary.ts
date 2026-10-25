import {darknessSummaryLines} from './darkness-remaining';
import {validPlace} from './planner-state';
import {validObservingDate} from './observing-time';
import {forecastSnapshotNotes} from './forecast-freshness';
import {forecastHourIndex,parseWeatherForecast,type WeatherForecast} from './weather-hours';
import {moonInfo,scoreAt,sunAltitude,type Place} from './sky';

type Input={date:Date;place:Place;forecast?:WeatherForecast|null;fetchedAt?:number;refreshing?:boolean;refreshFailed?:boolean};
const oneLine=(text:string)=>text.replace(/[\r\n\t]+/g,' ').trim();
const measurement=(value:number|null|undefined,unit:string)=>typeof value==='number'&&Number.isFinite(value)?`${value}${unit}`:'Unavailable';
function summaryFilename(place:Place,date:Date){
 // Bound Unicode code points so the full UTF-8 filename fits common file
 // systems, and remove path separators, controls and reserved punctuation.
 const cleaned=place.name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'');
 const site=Array.from(cleaned).slice(0,40).join('').replace(/-+$/,'')||'site';
 return `nightjar-observing-summary-${site}-${date.toISOString().replace(/[:.]/g,'-')}.txt`;
}

export function observingSummary(input:Input,created=new Date()){
 const {date,place}=input;
 if(!validObservingDate(date)||!validObservingDate(created)||!validPlace(place))throw Error('The observing summary needs a valid site and time.');
 const forecast=input.forecast?parseWeatherForecast(input.forecast):null;
 const index=forecastHourIndex(forecast?.hourly.time,date),hourly=forecast?.hourly;
 const timezone=place.timezone||'UTC';
 const local=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'shortOffset',...(date.getUTCFullYear()<=1?{era:'short' as const}:{})}).format(date);
 const sun=sunAltitude(date,place),moon=moonInfo(date,place);
 const lines=[
  'NIGHTJAR OBSERVING SUMMARY',
  `Prepared: ${created.toISOString()} (UTC)`,
  '',
  `Site: ${oneLine(place.name)}${place.country?` · ${oneLine(place.country)}`:''}`,
  `Coordinates: latitude ${place.latitude}, longitude ${place.longitude}`,
  `Observing UTC: ${date.toISOString()}`,
  `Observing at site: ${local}`,
  `Time zone: ${place.timezone||'UTC fallback; site time zone unavailable'}`,
  `Personal sky rating: ${place.bortle?`Bortle ${place.bortle}/9; user entered`:'Not recorded'}`,
  '',
  'SKY AT THE SELECTED TIME',
  `Sky: ${sun<-18?'Astronomical darkness':sun<=-6?'Twilight':'Daylight / civil twilight'}`,
  `Sun altitude: ${sun.toFixed(1)} degrees`,
  ...darknessSummaryLines(date,place),
  `Moon: ${moon.name}; ${Math.round(moon.illumination*100)}% illuminated`,
  `Moon altitude: ${moon.altitude.toFixed(1)} degrees; ${moon.altitude>0?'above':'at or below'} the ideal horizon`,
  '',
  'WEATHER SNAPSHOT',
 ];
 if(input.refreshing)lines.push(forecast?'Weather refresh in progress; previous forecast shown.':'Weather is still loading.');
 if(input.refreshFailed)lines.push(forecast?'Weather refresh failed; previous forecast shown.':'Weather could not be loaded.');
 if(forecast)lines.push(...forecastSnapshotNotes({fetchedAt:input.fetchedAt},created));
 if(index<0){lines.push(forecast?'No weather forecast covers the selected time.':'Weather unavailable.','Planning score: Unavailable');}
 else{
  const cloud=hourly!.cloud_cover[index],score=typeof cloud==='number'&&Number.isFinite(cloud)?scoreAt(cloud,date,place):null;
  lines.push(`Forecast hour UTC: ${new Date(hourly!.time[index]*1000).toISOString()}`,
   `Cloud cover: ${measurement(cloud,'%')}`,
   `Low cloud cover: ${measurement(hourly!.cloud_cover_low?.[index],'%')}`,
   `Mid cloud cover: ${measurement(hourly!.cloud_cover_mid?.[index],'%')}`,
   `High cloud cover: ${measurement(hourly!.cloud_cover_high?.[index],'%')}`,
   `Temperature: ${measurement(hourly!.temperature_2m?.[index],' degrees C')}`,
   `Dew point: ${measurement(hourly!.dew_point_2m?.[index],' degrees C')}`,
   `Near-surface visibility: ${measurement(hourly!.visibility?.[index],' metres')}`,
   `Wind speed: ${measurement(hourly!.wind_speed_10m?.[index],' km/h')}`,
   `Humidity: ${measurement(hourly!.relative_humidity_2m?.[index],'%')}`,
   `Planning score: ${score===null?'Unavailable':`${score}/100`}`);
 }
 lines.push('','This is a saved snapshot; weather and sky conditions do not update in this file.',
  'Cloud layers can overlap; their percentages do not add up to total cloud cover.',
  'Near-surface visibility is horizontal visibility, not astronomical transparency or seeing.',
  'Planning scores are estimates based on clouds, darkness and moonlight, not astronomical seeing or transparency.',
  'Darkness duration uses elapsed time with the geometric Sun centre below -18 degrees; it is not a weather or visibility guarantee.',
  'Positions use an ideal horizon; terrain, buildings and local conditions can obstruct the view.',
  'Weather source: Open-Meteo. Recheck conditions before heading out.');
 return {text:lines.join('\r\n')+'\r\n',filename:summaryFilename(place,date)};
}
