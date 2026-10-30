import {observingExportFilename} from './observing-export-filename';
import {localizedDarknessSummaryLines} from './darkness-summary-language';
import {validPlace} from './planner-state';
import {validObservingDate} from './observing-time';
import {forecastSnapshotNotes} from './forecast-freshness';
import {forecastHourIndex,parseWeatherForecast,type WeatherForecast} from './weather-hours';
import {moonInfo,scoreAt,sunAltitude,type Place} from './sky';
import {languageLocale,moonPhaseLabel,type Language} from './language';
import {createTranslator} from './messages';

type Input={date:Date;place:Place;forecast?:WeatherForecast|null;fetchedAt?:number;refreshing?:boolean;refreshFailed?:boolean;language?:Language};
const oneLine=(text:string)=>text.replace(/[\r\n\t]+/g,' ').trim();

export function observingSummary(input:Input,created=new Date()){
 const {date,place}=input,language=input.language==='zh-Hant'?'zh-Hant':'en',t=createTranslator(language);
 if(!validObservingDate(date)||!validObservingDate(created)||!validPlace(place))throw Error('The observing summary needs a valid site and time.');
 const forecast=input.forecast?parseWeatherForecast(input.forecast):null;
 const index=forecastHourIndex(forecast?.hourly.time,date),hourly=forecast?.hourly;
 const timezone=place.timezone||'UTC';
 const local=new Intl.DateTimeFormat(languageLocale(language),{timeZone:timezone,day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'shortOffset',...(date.getUTCFullYear()<=1?{era:'short' as const}:{})}).format(date);
 const sun=sunAltitude(date,place),moon=moonInfo(date,place),missing=t('summary.unavailable');
 const measurement=(value:number|null|undefined,unit:string)=>typeof value==='number'&&Number.isFinite(value)?`${value}${unit}`:missing;
 const lines=[
  t('summary.title'),t('summary.prepared',{time:created.toISOString()}),'',
  t('summary.site',{site:oneLine(place.name)+(place.country?` · ${oneLine(place.country)}`:'')}),
  t('summary.coordinates',{latitude:place.latitude,longitude:place.longitude}),
  t('summary.observingUtc',{time:date.toISOString()}),t('summary.observingLocal',{time:local}),t('summary.zone',{zone:place.timezone||t('summary.noZone')}),
  t('summary.rating',{rating:place.bortle?t('summary.bortle',{rating:place.bortle}):t('summary.notRecorded')}),'',t('summary.skyHeading'),
  t('summary.sky',{sky:t(sun<-18?'plan.darkness':sun<=-6?'plan.twilight':'plan.daylight')}),t('summary.sun',{altitude:sun.toFixed(1)}),
  ...localizedDarknessSummaryLines(date,place,language),
  t('summary.moon',{phase:moonPhaseLabel(moon.name,language),illumination:Math.round(moon.illumination*100)}),
  t('summary.moonAltitude',{altitude:moon.altitude.toFixed(1),position:t(moon.altitude>0?'summary.above':'summary.atOrBelow')}),'',t('summary.weatherHeading'),
 ];
 if(input.refreshing)lines.push(t(forecast?'summary.refreshingPrevious':'summary.loading'));
 if(input.refreshFailed)lines.push(t(forecast?'summary.failedPrevious':'summary.failed'));
 if(forecast)lines.push(...forecastSnapshotNotes({fetchedAt:input.fetchedAt},created,language));
 if(index<0)lines.push(t(forecast?'summary.noCoverage':'summary.unavailableWeather'),t('summary.score',{value:missing}));
 else{
  const cloud=hourly!.cloud_cover[index],score=typeof cloud==='number'&&Number.isFinite(cloud)?scoreAt(cloud,date,place):null;
  const degrees=language==='zh-Hant'?' °C':' degrees C',metres=language==='zh-Hant'?' 公尺':' metres';
  lines.push(t('summary.forecastHour',{time:new Date(hourly!.time[index]*1000).toISOString()}),
   t('summary.cloud',{value:measurement(cloud,'%')}),t('summary.cloudLow',{value:measurement(hourly!.cloud_cover_low?.[index],'%')}),
   t('summary.cloudMid',{value:measurement(hourly!.cloud_cover_mid?.[index],'%')}),t('summary.cloudHigh',{value:measurement(hourly!.cloud_cover_high?.[index],'%')}),
   t('summary.temperature',{value:measurement(hourly!.temperature_2m?.[index],degrees)}),t('summary.dew',{value:measurement(hourly!.dew_point_2m?.[index],degrees)}),
   t('summary.visibility',{value:measurement(hourly!.visibility?.[index],metres)}),t('summary.wind',{value:measurement(hourly!.wind_speed_10m?.[index],' km/h')}),
   t('summary.humidity',{value:measurement(hourly!.relative_humidity_2m?.[index],'%')}),t('summary.score',{value:score===null?missing:`${score}/100`}));
 }
 lines.push('',t('summary.snapshotHint'),t('summary.cloudHint'),t('summary.visibilityHint'),t('summary.scoreHint'),t('summary.darknessHint'),t('summary.horizonHint'),t('summary.source'));
 return {text:lines.join('\r\n')+'\r\n',filename:observingExportFilename('observing-summary',place,date)};
}
