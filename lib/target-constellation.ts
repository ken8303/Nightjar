import {A,isAstronomicalNight,observer,skyBodies,stars,type Place} from './sky';
import {validObservingDate} from './observing-time';

// Astronomy Engine's IAU lookup expects J2000 equatorial coordinates.
// Solar-system coordinates are topocentric, so lunar parallax is included.
export function targetConstellation(name:string,date:Date,place:Place):{name:string;symbol:string}|null{
 if(!validObservingDate(date)||!Number.isFinite(place.latitude)||Math.abs(place.latitude)>90||!Number.isFinite(place.longitude)||Math.abs(place.longitude)>180)return null;
 try{
  if(!isAstronomicalNight(date,place))return null;
  const star=stars.find(item=>item[0]===name),body=skyBodies.find(item=>String(item)===name);
  if(!star&&!body)return null;
  const coordinates=star?{ra:star[1],dec:star[2]}:A.Equator(body as A.Body,date,observer(place),false,true);
  const constellation=A.Constellation(coordinates.ra,coordinates.dec);
  return {name:constellation.name,symbol:constellation.symbol};
 }catch{return null}
}
