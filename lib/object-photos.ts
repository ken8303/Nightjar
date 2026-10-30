import {stars} from '@/lib/sky';
export type ObjectPhoto={src:string;previewSrc?:string;thumbnailSrc?:string;alt:string;altZh?:string;caption:string;captionZh?:string;credit:string;source:string;survey?:boolean;title?:string;titleZh?:string};
const nasa=(path:string)=>{
 const image=(size:number)=>`https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/${path}?fit=clip&w=${size}&h=${size}`;
 return {src:image(800),thumbnailSrc:image(200)};
};
const planets:Record<string,ObjectPhoto>={
 Moon:{...nasa('pia00/pia00405/PIA00405.jpg'),alt:'Earth’s Moon photographed by Galileo',caption:'Galileo, 1992 · enhanced-colour reference image; does not match the selected lunar phase.',credit:'NASA/JPL/USGS',source:'https://science.nasa.gov/photojournal/earths-moon/'},
 Mercury:{...nasa('pia14/pia14190/PIA14190.jpg'),alt:'Mercury’s cratered surface in a MESSENGER colour composite',caption:'MESSENGER, 2011 · enhanced-colour composite showing surface variations.',credit:'NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington',source:'https://science.nasa.gov/photojournal/mercurys-colorful-limb/'},
 Venus:{...nasa('pia23/pia23791/PIA23791.jpg'),alt:'Venus’s cloud-covered globe photographed by Mariner 10',caption:'Mariner 10, 1974 · false-colour composite of orange and ultraviolet images.',credit:'NASA/JPL-Caltech',source:'https://science.nasa.gov/photojournal/venus-from-mariner-10/'},
 Mars:{...nasa('pia00/pia00003/PIA00003.jpg'),alt:'Viking image mosaic of Mars and Valles Marineris',caption:'Viking Orbiter, 1980 · enhanced-colour mosaic.',credit:'NASA/JPL/USGS',source:'https://science.nasa.gov/photojournal/valles-marineris-hemisphere/'},
 Jupiter:{...nasa('pia04/pia04866/PIA04866.jpg'),alt:'Jupiter’s cloud bands and Great Red Spot in a Cassini image mosaic',caption:'Cassini, 2000 · true-colour mosaic.',credit:'NASA/JPL/Space Science Institute',source:'https://science.nasa.gov/photojournal/cassini-jupiter-portrait/'},
 Saturn:{src:'https://images-assets.nasa.gov/image/PIA11141/PIA11141~large.jpg',thumbnailSrc:'https://images-assets.nasa.gov/image/PIA11141/PIA11141~thumb.jpg',alt:'Saturn and its rings photographed by Cassini',caption:'Cassini, 2008 · natural-colour mosaic.',credit:'NASA/JPL/Space Science Institute',source:'https://science.nasa.gov/image-detail/amf-pia11141/'},
 Uranus:{...nasa('pia00/pia00143/PIA00143.jpg'),alt:'Uranus’s pale crescent photographed by Voyager 2',caption:'Voyager 2, 25 January 1986 · departure-view colour composite.',credit:'NASA/JPL',source:'https://science.nasa.gov/photojournal/uranus-final-image/'},
 Neptune:{...nasa('pia00/pia00046/PIA00046.jpg'),alt:'Neptune’s dark spot and bright clouds photographed by Voyager 2',caption:'Voyager 2, August 1989 · processed to emphasize cloud features; colour is enhanced.',credit:'NASA/JPL',source:'https://science.nasa.gov/photojournal/neptune-full-disk/'}
};
const planetTranslations:Record<string,{altZh:string;captionZh:string}>={
 Moon:{altZh:'伽利略號拍攝的地球月球',captionZh:'伽利略號，1992 年 · 增強色彩參考影像，不對應所選月相。'},
 Mercury:{altZh:'MESSENGER 色彩合成影像中的水星撞擊坑表面',captionZh:'MESSENGER，2011 年 · 顯示表面差異的增強色彩合成影像。'},
 Venus:{altZh:'水手 10 號拍攝的雲層覆蓋金星',captionZh:'水手 10 號，1974 年 · 結合橙光及紫外線影像的假色合成。'},
 Mars:{altZh:'海盜號火星與水手谷影像拼接圖',captionZh:'海盜號軌道器，1980 年 · 增強色彩拼接影像。'},
 Jupiter:{altZh:'卡西尼號拼接影像中的木星雲帶及大紅斑',captionZh:'卡西尼號，2000 年 · 真實色彩拼接影像。'},
 Saturn:{altZh:'卡西尼號拍攝的土星及其環',captionZh:'卡西尼號，2008 年 · 自然色彩拼接影像。'},
 Uranus:{altZh:'航海家 2 號拍攝的淡色眉月狀天王星',captionZh:'航海家 2 號，1986 年 1 月 25 日 · 離去視角的色彩合成影像。'},
 Neptune:{altZh:'航海家 2 號拍攝的海王星暗斑及明亮雲層',captionZh:'航海家 2 號，1989 年 8 月 · 影像經處理以突顯雲層特徵，並增強色彩。'}
};
function sexagesimal(value:number,signed=false){const total=Math.round(Math.abs(value)*3600),degrees=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;return`${signed?(value<0?'-':'+'):''}${degrees}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`}
export function objectPhoto(name:string):ObjectPhoto|undefined{
 if(Object.hasOwn(planets,name))return {...planets[name],...planetTranslations[name]};
 const star=stars.find(item=>item[0]===name);if(!star)return;
 return skySurveyPhoto(name,star[1],star[2]);
}
export function skySurveyPhoto(name:string,ra:number,dec:number,field=15):ObjectPhoto{
 const params=new URLSearchParams({v:'poss2ukstu_red',r:sexagesimal(ra),d:sexagesimal(dec,true),e:'J2000',h:String(field),w:String(field),f:'gif',c:'none'});
 // Survey GIFs can decode to millions of pixels even in a 36px camera label.
 // HiPS2FITS uses degrees for both RA and field; the full reference stays intact.
 const thumbnail=new URLSearchParams({hips:'CDS/P/DSS2/red',width:'200',height:'200',projection:'TAN',coordsys:'icrs',ra:String(ra*15),dec:String(dec),fov:String(field/60),format:'jpg'});
 const preview=new URLSearchParams(thumbnail);preview.set('width','800');preview.set('height','800');
 return{src:`https://archive.stsci.edu/cgi-bin/dss_search?${params}`,previewSrc:`https://alasky.cds.unistra.fr/hips-image-services/hips2fits?${preview}`,thumbnailSrc:`https://alasky.cds.unistra.fr/hips-image-services/hips2fits?${thumbnail}`,alt:`Photographic sky-survey field centred on the catalogue position of ${name}`,altZh:`以 ${name} 星表位置為中心的巡天影像區域`,captionZh:`存檔紅光波段攝影區域，範圍為 ${field} × ${field} 角分。明亮恆星可能過曝；這是星空區域影像，不是可解析的恆星表面或即時畫面。`,caption:`Archival red-band photographic field, ${field} × ${field} arcminutes. Bright stars may saturate; this is a sky field, not a resolved stellar surface or a live view.`,credit:'Digitized Sky Survey / STScI · survey plates: Caltech, AAO, UK SERC/PPARC; digitisation: AURA; preview cutouts: CDS HiPS2FITS',source:'https://archive.stsci.edu/dss/copyright.html',survey:true};
}
