import * as A from 'astronomy-engine';
export type Place={name:string;latitude:number;longitude:number;country?:string;timezone?:string};
export const stars:[string,number,number,number][]=[['Sirius',6.7525,-16.7161,-1.46],['Canopus',6.3992,-52.6957,-.74],['Arcturus',14.261,19.1824,-.05],['Vega',18.6156,38.7837,.03],['Capella',5.2782,45.998,.08],['Rigel',5.2423,-8.2016,.13],['Procyon',7.655,5.225,.34],['Betelgeuse',5.9195,7.407,.5],['Altair',19.8464,8.8683,.77],['Aldebaran',4.5987,16.509,.85],['Spica',13.4199,-11.1613,.97],['Antares',16.4901,-26.432,1.06],['Pollux',7.7553,28.0262,1.14],['Fomalhaut',22.9608,-29.622,1.16],['Deneb',20.6905,45.2803,1.25],['Regulus',10.1395,11.9672,1.35],['Castor',7.5767,31.8883,1.58],['Bellatrix',5.4189,6.3497,1.64],['Alnilam',5.6036,-1.2019,1.69],['Alnitak',5.6793,-1.9426,1.74],['Dubhe',11.0621,61.751,1.79],['Merak',11.0307,56.3824,2.37],['Phecda',11.8972,53.6948,2.44],['Megrez',12.257,57.0326,3.31],['Alioth',12.9005,55.9598,1.77],['Mizar',13.3987,54.9254,2.23],['Alkaid',13.7923,49.3133,1.86],['Polaris',2.5303,89.2641,1.98],['Achernar',1.6286,-57.2367,.46],['Hadar',14.0637,-60.373,.61],['Acrux',12.4433,-63.0991,.76],['Mimosa',12.7953,-59.6888,1.25],['Gacrux',12.5194,-57.1132,1.63],['Alpha Centauri',14.6601,-60.8351,-.27]];
export const lines=[['Dubhe','Merak','Phecda','Megrez','Alioth','Mizar','Alkaid'],['Megrez','Dubhe'],['Vega','Deneb','Altair','Vega'],['Betelgeuse','Bellatrix','Rigel','Alnitak','Betelgeuse'],['Acrux','Gacrux'],['Mimosa','Alpha Centauri']];
export function observer(p:Place){return new A.Observer(p.latitude,p.longitude,0)}
export function bodyPosition(body:A.Body,date:Date,p:Place){const eq=A.Equator(body,date,observer(p),true,true);return A.Horizon(date,observer(p),eq.ra,eq.dec,'normal')}
export function moonInfo(date:Date,p:Place){const phase=A.MoonPhase(date),illumination=(1-Math.cos(phase*Math.PI/180))/2;const name=phase<22.5?'New Moon':phase<67.5?'Waxing crescent':phase<112.5?'First quarter':phase<157.5?'Waxing gibbous':phase<202.5?'Full Moon':phase<247.5?'Waning gibbous':phase<292.5?'Last quarter':'Waning crescent';return {phase,illumination,name,altitude:bodyPosition(A.Body.Moon,date,p).altitude}}
export function scoreAt(cloud:number,date:Date,p:Place){const sun=bodyPosition(A.Body.Sun,date,p).altitude,moon=moonInfo(date,p);if(sun>-6)return 0;return Math.round(Math.max(0,Math.min(100,(100-cloud)*.8+Math.min(1,(-sun-6)/12)*20-(moon.altitude>0?moon.illumination*20:0))))}
export function timeLabel(date:Date,tz?:string){return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:tz||'UTC'}).format(date)}
export {A};
export function observingMilestones(date:Date,p:Place){
 const obs=observer(p);
 const rise=(body:A.Body,direction:number)=>A.SearchRiseSet(body,obs,direction,date,2)?.date||null;
 return [
  {label:'Next sunset',date:rise(A.Body.Sun,-1)},
  {label:'Full darkness begins',date:A.SearchAltitude(A.Body.Sun,obs,-1,date,2,-18)?.date||null},
  {label:'Full darkness ends',date:A.SearchAltitude(A.Body.Sun,obs,1,date,2,-18)?.date||null},
  {label:'Next sunrise',date:rise(A.Body.Sun,1)},
  {label:'Next moonrise',date:rise(A.Body.Moon,1)},
  {label:'Next moonset',date:rise(A.Body.Moon,-1)},
 ];
}

export function photographyLightWindows(date:Date,p:Place){
 const definitions=[{name:'Morning blue hour',tone:'blue',direction:1,startAltitude:-6,endAltitude:-4},{name:'Morning golden hour',tone:'gold',direction:1,startAltitude:-4,endAltitude:6},{name:'Evening golden hour',tone:'gold',direction:-1,startAltitude:6,endAltitude:-4},{name:'Evening blue hour',tone:'blue',direction:-1,startAltitude:-4,endAltitude:-6}];
 const obs=observer(p),limit=+date+48*3600000;
 return definitions.map(def=>{
  let cursor=date;
  for(let attempt=0;attempt<3&&+cursor<limit;attempt++){
   const start=A.SearchAltitude(A.Body.Sun,obs,def.direction,cursor,(limit-+cursor)/86400000,def.startAltitude)?.date;
   if(!start)break;
   const after=new Date(+start+1000);
   const end=A.SearchAltitude(A.Body.Sun,obs,def.direction,after,1,def.endAltitude)?.date;
   const reversal=A.SearchAltitude(A.Body.Sun,obs,-def.direction,after,1,def.startAltitude)?.date;
   if(end&&(!reversal||+end<+reversal))return {...def,start,end};
   cursor=new Date(+start+60000);
  }
  return {...def,start:null,end:null};
 });
}

export function skyTargets(date:Date,place:Place){
 const obs=observer(place);
 const fixed=stars.map(([name,ra,dec,mag])=>({name,...A.Horizon(date,obs,ra,dec,'normal'),mag,planet:false}));
 const planets=[A.Body.Moon,A.Body.Venus,A.Body.Mars,A.Body.Jupiter,A.Body.Saturn].map(body=>({name:String(body),...bodyPosition(body,date,place),mag:-1,planet:true}));
 return [...fixed,...planets];
}
