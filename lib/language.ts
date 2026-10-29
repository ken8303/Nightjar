export type Language='en'|'zh-Hant';
export const languageKey='nightjar-language-v1';
export const supportedLanguages:ReadonlyArray<{id:Language;label:string}>=[{id:'en',label:'English'},{id:'zh-Hant',label:'繁體中文'}];
export function parseLanguage(value:unknown):Language{return supportedLanguages.find(item=>item.id===value)?.id??'en'}
export function languageLocale(language:Language){return language==='en'?'en-GB':language}
export function sectionLabel(key:string,language:Language,fallback:string){
 if(language!=='zh-Hant')return fallback;
 const names:Record<string,string>={tonight:'今晚',sky:'星空圖',moon:'月球',places:'觀測地點',aurora:'極光',events:'天象日曆',tools:'攝影工具'};
 return names[key]??fallback;
}
export function moonPhaseLabel(name:string,language:Language){
 if(language!=='zh-Hant')return name;
 const names:Record<string,string>={'New Moon':'新月','Waxing crescent':'娥眉月','First quarter':'上弦月','Waxing gibbous':'盈凸月','Full Moon':'滿月','Waning gibbous':'虧凸月','Last quarter':'下弦月','Waning crescent':'殘月'};
 return names[name]??name;
}
export function pendingEditLabel(value:string,language:Language){
 if(language!=='zh-Hant')return value;
 const names:Record<string,string>={'observing-time changes':'觀測時間','coordinate entry':'座標輸入','imaging draft fields':'攝影草稿','unfinished diary forms':'未完成的觀測日誌','target note edits':'目標筆記','site name edits':'地點名稱'};
 return value.split(', ').map(item=>names[item]??item).join('、');
}
export function skyShortcutLabel(id:string,language:Language,fallback:string){
 if(language!=='zh-Hant')return fallback;
 const names:Record<string,string>={'sky-chart':'星空圖','deep-sky-finder':'深空探索','target-finder':'明亮天體','observing-diary':'觀測日誌','visibility-planner':'觀測時機'};
 return names[id]??fallback;
}
export function deepSkyTypeLabel(value:string,language:Language){
 if(language!=='zh-Hant')return value;
 const names:Record<string,string>={'Cluster and nebula':'星團與星雲','Cluster with nebulosity':'含星雲的星團','Double star':'雙星','Emission nebula':'發射星雲','Galaxy':'星系','Globular cluster':'球狀星團','H II region':'電離氫區','Nebula':'星雲','Open cluster':'疏散星團','Other':'其他','Planetary nebula':'行星狀星雲','Reflection nebula':'反射星雲','Star association':'星協','Supernova remnant':'超新星殘骸'};
 return names[value]??value;
}
const skyNames:Record<string,string>={Moon:'月球',Mercury:'水星',Venus:'金星',Mars:'火星',Jupiter:'木星',Saturn:'土星',Uranus:'天王星',Neptune:'海王星',Sirius:'天狼星',Vega:'織女星',Polaris:'北極星',Arcturus:'大角星',Capella:'五車二',Rigel:'參宿七',Betelgeuse:'參宿四',Altair:'河鼓二',Deneb:'天津四'};
export function skyTargetAlias(name:string){return skyNames[name]??''}
export function skyTargetLabel(name:string,language:Language){const translated=skyTargetAlias(name);return language==='zh-Hant'&&translated?`${translated} (${name})`:name}
