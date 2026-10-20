export const calendarText=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
export const calendarTime=(date:Date)=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
// RFC 5545 limits content lines to 75 octets; never split a UTF-8 character.
export function foldCalendarLine(line:string){
 let output='',part='',bytes=0;
 for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>75){output+=part+'\r\n';part=' ';bytes=1}part+=char;bytes+=size}
 return output+part;
}
