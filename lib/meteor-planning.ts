import {A, Place, hourBelowAltitude, moonInfo} from './sky';
import {forecastHourIndex} from './weather-hours';

export const meteorEvents=[
 {name:'Quadrantids',date:'January 3–4',month:0,day:4,rate:'Up to 120',note:'A short, sharp peak. Best suited to northern latitudes.'},
 {name:'Lyrids',date:'April 21–22',month:3,day:22,rate:'About 18',note:'A modest spring shower, occasionally with bright fireballs.'},
 {name:'Eta Aquariids',date:'May 5–6',month:4,day:6,rate:'Up to 50',note:'Look before dawn. Favours the southern hemisphere.'},
 {name:'Perseids',date:'August 12–13',month:7,day:13,rate:'Up to 100',note:'A northern summer favourite. Look after midnight.'},
 {name:'Orionids',date:'October 21–22',month:9,day:22,rate:'About 20',note:'Fast meteors from Halley’s Comet. Best before dawn.'},
 {name:'Leonids',date:'November 17–18',month:10,day:18,rate:'About 15',note:'Look toward the eastern sky after midnight.'},
 {name:'Geminids',date:'December 13–14',month:11,day:14,rate:'Up to 150',note:'A prolific shower with bright, often colourful meteors.'},
] as const;

export type MeteorEvent=(typeof meteorEvents)[number];
export function nextMeteorYear(event:MeteorEvent,from:Date){
 const year=from.getUTCFullYear();
 return +from>Date.UTC(year,event.month,event.day+1)?year+1:year;
}
function localDateHour(date:Date,formatter:Intl.DateTimeFormat){
 const parts=formatter.formatToParts(date);
 const number=(type:string)=>Number(parts.find(part=>part.type===type)?.value);
 return {day:number('year')*10000+number('month')*100+number('day'),hour:number('hour')};
}
export function meteorConditions(event:MeteorEvent,year:number,place:Place,hourly?:{time:number[];cloud_cover:(number|null)[]}){
 const timezone=place.timezone||'UTC';
 const dayFormatter=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'numeric',day:'numeric',hour:'numeric',hourCycle:'h23'});
 const firstLocal=new Date(Date.UTC(year,event.month,event.day-1));
 const lastLocal=new Date(Date.UTC(year,event.month,event.day));
 const firstDay=firstLocal.getUTCFullYear()*10000+(firstLocal.getUTCMonth()+1)*100+firstLocal.getUTCDate();
 const lastDay=lastLocal.getUTCFullYear()*10000+(lastLocal.getUTCMonth()+1)*100+lastLocal.getUTCDate();
 const dark:{date:Date;moonBelow:boolean}[]=[];
 for(let hour=-48;hour<=72;hour++){
  const date=new Date(Date.UTC(year,event.month,event.day)+hour*3600000);
  const local=localDateHour(date,dayFormatter);
  if(!((local.day===firstDay&&local.hour>=12)||(local.day===lastDay&&local.hour<12)))continue;
  if(!hourBelowAltitude(A.Body.Sun,date,place,-18))continue;
  dark.push({date,moonBelow:hourBelowAltitude(A.Body.Moon,date,place,0)});
 }
 const moonFree=dark.filter(sample=>sample.moonBelow);
 let longest:{start:Date;end:Date}|null=null;
 for(let i=0;i<moonFree.length;){
  let j=i;
  while(j+1<moonFree.length&&+moonFree[j+1].date-+moonFree[j].date===3600000)j++;
  if(!longest||j-i+1>(+longest.end-+longest.start)/3600000)longest={start:moonFree[i].date,end:new Date(+moonFree[j].date+3600000)};
  i=j+1;
 }
 const sampleForWeather=moonFree.length?moonFree:dark;
 const cloudValues=sampleForWeather.flatMap(sample=>{
  const index=forecastHourIndex(hourly?.time,sample.date);
  const cloud=index>=0?hourly?.cloud_cover?.[index]:null;
  return typeof cloud==='number'&&Number.isFinite(cloud)&&cloud>=0&&cloud<=100?[cloud]:[];
 });
 const moon=moonInfo(new Date(Date.UTC(year,event.month,event.day,12)),place);
 return {darkHours:dark.length,moonFreeHours:moonFree.length,window:longest,moonIllumination:moon.illumination,cloudCover:cloudValues.length?Math.round(cloudValues.reduce((sum,n)=>sum+n,0)/cloudValues.length):null};
}
