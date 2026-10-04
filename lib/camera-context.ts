import {A,observer,type Place} from './sky';
// Geometric Sun-centre altitude, without atmospheric refraction. Twilight
// boundaries follow USNO definitions; this does not measure actual visibility.
export function cameraLightPhase(altitude:number){
 if(!Number.isFinite(altitude))return {label:'Lighting unavailable',message:'Could not calculate the Sun position.'};
 if(altitude>=0)return {label:'Daylight',message:'Daylight may hide stars and planets even when a name is shown.'};
 if(altitude>-6)return {label:'Civil twilight',message:'Twilight may hide faint objects even when a name is shown.'};
 if(altitude>-12)return {label:'Nautical twilight',message:'Twilight may hide faint objects even when a name is shown.'};
 if(altitude>-18)return {label:'Astronomical twilight',message:'Some twilight remains; faint objects may be difficult to see.'};
 return {label:'Astronomical darkness',message:'Clouds, Moon light, light pollution and obstructions still affect visibility.'};
}
export function cameraSkyContext(date:Date,place:Place){
 const site=observer(place),eq=A.Equator(A.Body.Sun,date,site,true,true);
 const altitude=A.Horizon(date,site,eq.ra,eq.dec).altitude;
 return {...cameraLightPhase(altitude),altitude};
}
