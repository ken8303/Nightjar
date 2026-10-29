'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {languageKey,parseLanguage,type Language} from '@/lib/language';

type LanguageContextValue={language:Language;tr:(english:string,chinese:string)=>string;setLanguage:(value:Language)=>void;storageError:boolean};
const fallback:LanguageContextValue={language:'en',tr:english=>english,setLanguage:()=>{},storageError:false};
const LanguageContext=createContext<LanguageContextValue>(fallback);
function initialLanguage():Language{try{return parseLanguage(localStorage.getItem(languageKey))}catch{return 'en'}}
export function LanguageProvider({children}:{children:ReactNode}){
 const [language,setCurrent]=useState<Language>(initialLanguage),[storageError,setStorageError]=useState(false);
 const setLanguage=useCallback((value:Language)=>{const next=parseLanguage(value);setCurrent(next);try{localStorage.setItem(languageKey,next);setStorageError(false)}catch{setStorageError(true)}},[]);
 useEffect(()=>{document.documentElement.lang=language},[language]);
 useEffect(()=>{const sync=(event:StorageEvent)=>{try{if(event.storageArea!==localStorage||event.key!==languageKey)return}catch{return}setCurrent(parseLanguage(event.newValue));setStorageError(false)};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 const value=useMemo(()=>({language,tr:(english:string,chinese:string)=>language==='zh-Hant'?chinese:english,setLanguage,storageError}),[language,setLanguage,storageError]);
 return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage(){return useContext(LanguageContext)}
export function LanguageControl(){
 const {language,setLanguage,storageError,tr}=useLanguage();
 return <div className="language-control"><label htmlFor="planner-language">{tr('Language','語言')}</label><select id="planner-language" value={language} onChange={event=>setLanguage(parseLanguage(event.target.value))}><option value="en">English</option><option value="zh-Hant">繁體中文</option></select>{storageError&&<p role="status">{tr('Language preference could not be saved; it applies for this visit.','無法儲存語言設定；本次使用期間仍會套用。')}</p>}</div>;
}
