import {A,isAstronomicalNight,observer,type Place} from './sky';
import {validObservingDate} from './observing-time';
const lastInstant=Date.parse('9999-12-31T23:59:59.999Z');

export function remainingDarkness(date:Date,place:Place){
 if(!isAstronomicalNight(date,place))return null;
 const start=new Date(+date),searchEnd=new Date(Math.min(+date+48*3600000,lastInstant));
 const days=(+searchEnd-+start)/86400000;
 const crossing=days>0?A.SearchAltitude(A.Body.Sun,observer(place),1,start,days,-18)?.date:undefined;
 const end=crossing&&validObservingDate(crossing)&&+crossing>=+start&&+crossing<=+searchEnd?crossing:null;
 return {start,end,searchEnd,dateLimited:+searchEnd-+start<48*3600000};
}

export function darknessDuration(start:Date,end:Date){
 if(!validObservingDate(start)||!validObservingDate(end)||+end<+start)throw Error('Invalid darkness duration.');
 const minutes=Math.floor((+end-+start)/60000);
 if(minutes<1)return 'Less than a minute';
 const hours=Math.floor(minutes/60),rest=minutes%60;
 return [hours?`${hours} ${hours===1?'hour':'hours'}`:'',rest?`${rest} ${rest===1?'minute':'minutes'}`:''].filter(Boolean).join(' ');
}

/** Shared wording for text exports, including bounded polar-night searches. */
export function darknessSummaryLines(date:Date,place:Place,darkness=remainingDarkness(date,place)){
 return darkness?.end?[`Full darkness remaining: ${darknessDuration(darkness.start,darkness.end)} after the selected observing time.`,`Full darkness ends UTC: ${darkness.end.toISOString()}`]:[darkness?`Full darkness end: not found ${darkness.dateLimited?'before the supported UTC date limit':'within 48 hours of the selected observing time'}.`:'Full darkness remaining: the selected time is outside full astronomical darkness.'];
}

/** True only for a supported, continuously dark interval of at most 24 hours. */
export function isFullDarknessInterval(start:Date,end:Date,place:Place){
 if(!validObservingDate(start)||!validObservingDate(end)||+end<+start||+end-+start>86400000)return false;
 if(!isAstronomicalNight(start,place)||!isAstronomicalNight(end,place))return false;
 return +end===+start||A.SearchAltitude(A.Body.Sun,observer(place),1,start,(+end-+start)/86400000,-18)===null;
}
