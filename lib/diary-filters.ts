import catalogue from '../data/messier.json';
import {type Observation} from './observing-diary';
export type DiaryFilters={query:string;outcome:''|Observation['outcome'];from:string;through:string};
export const emptyDiaryFilters:DiaryFilters={query:'',outcome:'',from:'',through:''};
const names=new Map(catalogue.map(target=>[target.id,`${target.name} ${target.catalogue}`]));
const normalize=(text:string)=>text.normalize('NFKC').toLowerCase().replace(/\b(m|ngc|ic)\s*0*(\d+)/g,'$1$2').replace(/\s+/g,' ').trim();
export function diaryDateInput(value:string){return /^\d{8}$/.test(value)?`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6)}`:value}
function validDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(+new Date(value+'T00:00:00.000Z'))&&new Date(value+'T00:00:00.000Z').toISOString().slice(0,10)===value}
export function filterDiary(entries:Observation[],filters:DiaryFilters){
 if((filters.from&&!validDate(filters.from))||(filters.through&&!validDate(filters.through)))return {entries:[] as Observation[],error:'Enter valid dates in year-month-day format.'};
 if(filters.from&&filters.through&&filters.from>filters.through)return {entries:[] as Observation[],error:'The from date must be on or before the through date.'};
 const query=normalize(filters.query);
 return {error:'',entries:entries.filter(entry=>{
  const day=entry.observedAt.slice(0,10);
  return (!filters.outcome||entry.outcome===filters.outcome)&&(!filters.from||day>=filters.from)&&(!filters.through||day<=filters.through)&&(!query||normalize([entry.target,names.get(entry.target)||'',entry.place.name,entry.place.country||'',entry.equipment,entry.notes].join(' ')).includes(query));
 }).sort((a,b)=>b.observedAt.localeCompare(a.observedAt)||a.id.localeCompare(b.id))};
}
