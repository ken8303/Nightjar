import type {DeepSkyObject} from './deep-sky';

export type OpenNgcReferenceRecord={id:string;type:string;ra:string;dec:string;constellation:string;magnitude:string;names:string};
// Preserve missing/invalid source values; never invent coordinates for an entry.
function sexagesimal(value:string,isRa:boolean):number|null{
 const match=(isRa?/^(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)$/:/^([+-])(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)$/).exec(value);
 if(!match)return null;
 const offset=isRa?0:1,major=Number(match[1+offset]),minutes=Number(match[2+offset]),seconds=Number(match[3+offset]);
 if(minutes>=60||seconds>60||(isRa?major>=24:major>90))return null;
 // OpenNGC has rounded seconds equal to 60; carry them into the next minute.
 const valueNumber=major+minutes/60+seconds/3600;
 if(!isRa&&valueNumber>90)return null;
 const normalized=isRa&&valueNumber===24?0:valueNumber;
 return !isRa&&match[1]==='-'?-normalized:normalized;
}
export function referencePlanningTarget(record:OpenNgcReferenceRecord):DeepSkyObject|null{
 if(record.type==='Dup'||record.type==='NonEx')return null;
 const ra=sexagesimal(record.ra,true),dec=sexagesimal(record.dec,false);
 if(ra===null||dec===null)return null;
 const magnitude=record.magnitude.trim()===''?null:Number(record.magnitude);
 return {id:record.id,catalogue:record.id,name:record.names,type:record.type,constellation:record.constellation,ra,dec,magnitude:magnitude!==null&&Number.isFinite(magnitude)?magnitude:null,major:null,minor:null,positionAngle:null};
}
