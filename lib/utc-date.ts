// Date.UTC treats years 0–99 as 1900–1999. Full-year setters preserve the
// requested calendar year while retaining normal month/day rollover.
export function utcDate(year:number,month:number,day:number,hour=0){
 if(![year,month,day,hour].every(Number.isInteger))throw Error('Invalid calendar date.');
 const date=new Date(0);date.setUTCFullYear(year,month,day);date.setUTCHours(hour,0,0,0);
 if(!Number.isFinite(+date))throw Error('Invalid calendar date.');
 return date;
}
