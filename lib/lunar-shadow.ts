import {A,type Place,isAstronomicalNight} from './sky';
import {lunarEclipseContacts} from './lunar-events';
import {validObservingDate} from './observing-time';

// Matches Astronomy Engine's eclipse model: mean Earth radius plus an 88 km
// effective atmosphere, and the mean lunar radius. Coordinates are geocentric.
const sunRadius=695700,earthRadius=6371+88,moonRadius=1737.4;
type Vector={x:number;y:number;z:number};
const dot=(a:Vector,b:Vector)=>a.x*b.x+a.y*b.y+a.z*b.z;
const scale=(a:Vector,n:number):Vector=>({x:a.x*n,y:a.y*n,z:a.z*n});
const subtract=(a:Vector,b:Vector):Vector=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const unit=(v:Vector)=>scale(v,1/Math.hypot(v.x,v.y,v.z));
const cross=(a:Vector,b:Vector):Vector=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});

/** Shadow centre and radii in lunar radii, with celestial north up. */
export function lunarShadow(date:Date){
 if(!validObservingDate(date))throw Error('Choose a supported observing time.');
 const sun=A.GeoVector(A.Body.Sun,date,true),moon=A.GeoMoon(date),axis=unit(scale(sun,-1));
 const distance=dot(moon,axis),sunDistance=Math.hypot(sun.x,sun.y,sun.z);
 // Project the shadow axis and the Moon into the plane normal to sunlight.
 const offset=subtract(scale(axis,distance),moon),north=unit(subtract({x:0,y:0,z:1},scale(axis,axis.z))),east=unit(cross(north,axis));
 const ratio=distance/sunDistance;
 return {x:dot(offset,east)*A.KM_PER_AU/moonRadius,y:dot(offset,north)*A.KM_PER_AU/moonRadius,umbra:(earthRadius-ratio*(sunRadius-earthRadius))/moonRadius,penumbra:(earthRadius+ratio*(sunRadius+earthRadius))/moonRadius};
}

/** Fraction of the lunar disc inside a circular shadow boundary. */
export function lunarShadowOverlap(distance:number,radius:number){
 if(!Number.isFinite(distance)||!Number.isFinite(radius)||distance<0||radius<=0)throw Error('Invalid shadow geometry.');
 if(distance>=1+radius)return 0;
 if(distance<=Math.abs(radius-1))return radius>=1?1:radius*radius;
 const clamp=(value:number)=>Math.max(-1,Math.min(1,value));
 const a=Math.acos(clamp((distance*distance+1-radius*radius)/(2*distance)));
 const b=Math.acos(clamp((distance*distance+radius*radius-1)/(2*distance*radius)));
 const area=a+radius*radius*b-.5*Math.sqrt(Math.max(0,(-distance+1+radius)*(distance+1-radius)*(distance-1+radius)*(distance+1+radius)));
 return Math.max(0,Math.min(1,area/Math.PI));
}

/** Event samples retain exact contacts and never expose a non-dark instant. */
export function lunarShadowSamples(event:ReturnType<typeof A.SearchLunarEclipse>,place:Place,additional?:Date){
 const contacts=lunarEclipseContacts(event),start=+contacts[0].time,end=+contacts[contacts.length-1].time;
 const values=new Set(contacts.map(contact=>+contact.time));
 if(additional&&validObservingDate(additional)&&+additional>=start&&+additional<=end)values.add(+additional);
 for(let t=start;t<end;t+=10*60000)values.add(t);
 return [...values].sort((a,b)=>a-b).map(value=>new Date(value)).filter(date=>validObservingDate(date)&&isAstronomicalNight(date,place));
}
