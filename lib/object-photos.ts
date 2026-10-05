import {stars} from '@/lib/sky';
export type ObjectPhoto={src:string;alt:string;caption:string;credit:string;source:string;survey?:boolean;title?:string};
const nasa=(path:string)=>`https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/${path}?fit=clip&w=800&h=800`;
const planets:Record<string,ObjectPhoto>={
 Moon:{src:nasa('pia00/pia00405/PIA00405.jpg'),alt:'Earth’s Moon photographed by Galileo',caption:'Galileo, 1992 · enhanced-colour reference image; does not match the selected lunar phase.',credit:'NASA/JPL/USGS',source:'https://science.nasa.gov/photojournal/earths-moon/'},
 Venus:{src:nasa('pia23/pia23791/PIA23791.jpg'),alt:'Venus’s cloud-covered globe photographed by Mariner 10',caption:'Mariner 10, 1974 · false-colour composite of orange and ultraviolet images.',credit:'NASA/JPL-Caltech',source:'https://science.nasa.gov/photojournal/venus-from-mariner-10/'},
 Mars:{src:nasa('pia00/pia00003/PIA00003.jpg'),alt:'Viking image mosaic of Mars and Valles Marineris',caption:'Viking Orbiter, 1980 · enhanced-colour mosaic.',credit:'NASA/JPL/USGS',source:'https://science.nasa.gov/photojournal/valles-marineris-hemisphere/'},
 Jupiter:{src:nasa('pia04/pia04866/PIA04866.jpg'),alt:'Jupiter’s cloud bands and Great Red Spot in a Cassini image mosaic',caption:'Cassini, 2000 · true-colour mosaic.',credit:'NASA/JPL/Space Science Institute',source:'https://science.nasa.gov/photojournal/cassini-jupiter-portrait/'},
 Saturn:{src:'https://images-assets.nasa.gov/image/PIA11141/PIA11141~large.jpg',alt:'Saturn and its rings photographed by Cassini',caption:'Cassini, 2008 · natural-colour mosaic.',credit:'NASA/JPL/Space Science Institute',source:'https://science.nasa.gov/image-detail/amf-pia11141/'}
};
function sexagesimal(value:number,signed=false){const total=Math.round(Math.abs(value)*3600),degrees=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;return`${signed?(value<0?'-':'+'):''}${degrees}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`}
export function objectPhoto(name:string):ObjectPhoto|undefined{
 if(Object.hasOwn(planets,name))return planets[name];
 const star=stars.find(item=>item[0]===name);if(!star)return;
 return skySurveyPhoto(name,star[1],star[2]);
}
export function skySurveyPhoto(name:string,ra:number,dec:number,field=15):ObjectPhoto{
 const params=new URLSearchParams({v:'poss2ukstu_red',r:sexagesimal(ra),d:sexagesimal(dec,true),e:'J2000',h:String(field),w:String(field),f:'gif',c:'none'});
 return{src:`https://archive.stsci.edu/cgi-bin/dss_search?${params}`,alt:`Photographic sky-survey field centred on the catalogue position of ${name}`,caption:`Archival red-band photographic field, ${field} × ${field} arcminutes. Bright stars may saturate; this is a sky field, not a resolved stellar surface or a live view.`,credit:'Digitized Sky Survey / STScI · survey plates: Caltech, AAO, UK SERC/PPARC; digitisation: AURA',source:'https://archive.stsci.edu/dss/copyright.html',survey:true};
}
