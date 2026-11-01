import {sunAltitude,type Place} from './sky';
import {validObservingDate} from './observing-time';

// The displayed cell extends half a degree from its centre in latitude and
// longitude. A 1.1° solar-altitude margin exceeds the cell's maximum angular
// radius and keeps the full cell below the strict -18° darkness boundary.
export function auroraCellIsFullyDark(date:Date,latitude:number,longitude:number){
 if(!validObservingDate(date)||!Number.isFinite(latitude)||Math.abs(latitude)>85.5||!Number.isFinite(longitude)||Math.abs(longitude)>180)return false;
 const site:Place={name:'',latitude,longitude};
 return sunAltitude(date,site)<-19.1;
}
