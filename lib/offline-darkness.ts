import {darknessSummaryLines} from './darkness-remaining';
import {validObservingDate} from './observing-time';
import type {Place} from './sky';

// The offline page supplies an explicitly selected saved snapshot, not live weather.
export function offlineDarkness(time:string,place:Place){
 const date=new Date(time);
 if(!validObservingDate(date)||date.toISOString()!==time||!Number.isFinite(place.latitude)||Math.abs(place.latitude)>90||!Number.isFinite(place.longitude)||Math.abs(place.longitude)>180)throw Error('A valid saved time and site are required.');
 return darknessSummaryLines(date,place);
}
