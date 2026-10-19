export const issCatalogueNumber=25544;
export const satelliteSource='https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON';
export const satelliteRefreshMs=2*60*60*1000;
export const satelliteEpochWindowMs=3*24*60*60*1000;
export type OrbitElements={OBJECT_NAME:string;OBJECT_ID:string;EPOCH:string;NORAD_CAT_ID:number;MEAN_MOTION:number;ECCENTRICITY:number;INCLINATION:number;RA_OF_ASC_NODE:number;ARG_OF_PERICENTER:number;MEAN_ANOMALY:number;BSTAR:number;MEAN_MOTION_DOT:number;MEAN_MOTION_DDOT:number;ELEMENT_SET_NO:number;EPHEMERIS_TYPE:0};

// CelesTrak omits the UTC designator and may supply microseconds. Preserve the
// source epoch text; Date/SGP4 ingestion resolves it to millisecond precision.
export function parseOrbitalEpoch(value:unknown){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z?$/.test(value))return null;
 const parts=/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?Z?$/.exec(value)!;
 const canonical=`${parts[1]}.${(parts[2]??'').padEnd(3,'0').slice(0,3)}Z`;
 const date=new Date(canonical);
 return Number.isFinite(+date)&&date.getUTCFullYear()>=1957&&date.getUTCFullYear()<=9999&&date.toISOString().slice(0,19)===value.slice(0,19)?date:null;
}
function number(value:unknown){
 if(typeof value==='string'&&/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value))value=Number(value);
 if(typeof value!=='number'||!Number.isFinite(value))throw Error('Orbital elements contain an invalid number.');
 return value;
}
export function parseOrbitElements(value:unknown,expectedId?:number):OrbitElements{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Orbital elements are unavailable.');
 const raw=value as Record<string,unknown>;
 const id=number(raw.NORAD_CAT_ID);
 if(!Number.isInteger(id)||id<1||id>999999999||expectedId!==undefined&&id!==expectedId)throw Error('The orbital object identity does not match.');
 if(!parseOrbitalEpoch(raw.EPOCH))throw Error('The orbital epoch is invalid.');
 for(const [key,expected] of [['CENTER_NAME','EARTH'],['REF_FRAME','TEME'],['TIME_SYSTEM','UTC'],['MEAN_ELEMENT_THEORY','SGP4']])if(raw[key]!==undefined&&raw[key]!==expected)throw Error('The orbital reference frame or theory is unsupported.');
 if(raw.CCSDS_OMM_VERS!==undefined&&(typeof raw.CCSDS_OMM_VERS!=='string'||!/^3\.\d+$/.test(raw.CCSDS_OMM_VERS)))throw Error('The orbital message version is unsupported.');
 if(raw.EPHEMERIS_TYPE!==undefined&&number(raw.EPHEMERIS_TYPE)!==0)throw Error('The orbital ephemeris type is unsupported.');
 const meanMotion=number(raw.MEAN_MOTION),eccentricity=number(raw.ECCENTRICITY),inclination=number(raw.INCLINATION);
 if(meanMotion<=0||meanMotion>20||eccentricity<0||eccentricity>=1||inclination<0||inclination>180)throw Error('Orbital elements are outside supported bounds.');
 const angle=(key:string)=>{const value=number(raw[key]);if(value<0||value>=360)throw Error('An orbital angle is outside supported bounds.');return value};
 const elementSet=number(raw.ELEMENT_SET_NO??0);if(!Number.isInteger(elementSet)||elementSet<0||elementSet>999999999)throw Error('The orbital element-set number is invalid.');
 const name=raw.OBJECT_NAME,objectId=raw.OBJECT_ID;
 if(typeof name!=='string'||name.length>100||typeof objectId!=='string'||objectId.length>40)throw Error('Orbital metadata is invalid.');
 return {OBJECT_NAME:name||`Satellite ${id}`,OBJECT_ID:objectId,EPOCH:raw.EPOCH as string,NORAD_CAT_ID:id,MEAN_MOTION:meanMotion,ECCENTRICITY:eccentricity,INCLINATION:inclination,RA_OF_ASC_NODE:angle('RA_OF_ASC_NODE'),ARG_OF_PERICENTER:angle('ARG_OF_PERICENTER'),MEAN_ANOMALY:angle('MEAN_ANOMALY'),BSTAR:number(raw.BSTAR),MEAN_MOTION_DOT:number(raw.MEAN_MOTION_DOT),MEAN_MOTION_DDOT:number(raw.MEAN_MOTION_DDOT),ELEMENT_SET_NO:elementSet,EPHEMERIS_TYPE:0};
}
export type SatelliteFeed={version:1;elements:OrbitElements;fetchedAt:string;nextRefreshAt:string;refreshPaused:boolean;issue:string};
export function parseSatelliteFeed(value:unknown):SatelliteFeed{
 if(!value||typeof value!=='object')throw Error('Satellite data is unavailable.');
 const raw=value as Record<string,unknown>;
 const validTime=(time:unknown)=>typeof time==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(time)&&Number.isFinite(Date.parse(time))&&new Date(time).toISOString()===time;
 if(raw.version!==1||!validTime(raw.fetchedAt)||!validTime(raw.nextRefreshAt)||Date.parse(raw.nextRefreshAt as string)<Date.parse(raw.fetchedAt as string)||typeof raw.refreshPaused!=='boolean'||typeof raw.issue!=='string'||raw.issue.length>300)throw Error(typeof raw.error==='string'?raw.error:'Satellite data is unavailable.');
 return {version:1,elements:parseOrbitElements(raw.elements,issCatalogueNumber),fetchedAt:raw.fetchedAt as string,nextRefreshAt:raw.nextRefreshAt as string,refreshPaused:raw.refreshPaused,issue:raw.issue};
}
