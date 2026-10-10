import {validMessierId} from './deep-sky-list';

function parts(value:number,wrap=false){
 const rounded=Math.round(Math.abs(value)*36000);
 const ticks=wrap?rounded%864000:rounded;
 return {major:String(Math.floor(ticks/36000)).padStart(2,'0'),minute:String(Math.floor(ticks%36000/600)).padStart(2,'0'),second:(ticks%600/10).toFixed(1).padStart(4,'0')};
}
export function formatEquatorialCoordinates(raHours:number,decDegrees:number){
 if(!Number.isFinite(raHours)||raHours<0||raHours>=24||!Number.isFinite(decDegrees)||Math.abs(decDegrees)>90)throw Error('Invalid catalogue coordinates.');
 const ra=parts(raHours,true),dec=parts(decDegrees);
 const sign=decDegrees<0||Object.is(decDegrees,-0)?'-':'+';
 return {ra:`${ra.major}h ${ra.minute}m ${ra.second}s`,dec:`${sign}${dec.major}° ${dec.minute}′ ${dec.second}″`};
}
export function catalogueCoordinateCopy(target:{id:string;ra:number;dec:number}){
 if(!validMessierId(target.id))throw Error('Invalid catalogue target.');
 const formatted=formatEquatorialCoordinates(target.ra,target.dec);
 const decimalDec=Object.is(target.dec,-0)?'-0':`${target.dec<0?'':'+'}${target.dec}`;
 return `${target.id} catalogue coordinates (J2000)\nRA: ${formatted.ra}\nDec: ${formatted.dec}\nDecimal RA (hours): ${target.ra}\nDecimal Dec (degrees): ${decimalDec}`;
}
