'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {languageKey,parseLanguage,supportedLanguages,type Language} from '@/lib/language';
import {createTranslator,type Translator} from '@/lib/messages';

type LanguageContextValue={language:Language;tr:(english:string,chinese:string)=>string;t:Translator;setLanguage:(value:Language)=>void;storageError:boolean};
const fallback:LanguageContextValue={language:'en',tr:english=>english,t:createTranslator('en'),setLanguage:()=>{},storageError:false};
const LanguageContext=createContext<LanguageContextValue>(fallback);
function initialLanguage():Language{try{return parseLanguage(localStorage.getItem(languageKey))}catch{return 'en'}}
export function LanguageProvider({children}:{children:ReactNode}){
 const [language,setCurrent]=useState<Language>(initialLanguage),[storageError,setStorageError]=useState(false);
 const setLanguage=useCallback((value:Language)=>{const next=parseLanguage(value);setCurrent(next);try{localStorage.setItem(languageKey,next);setStorageError(false)}catch{setStorageError(true)}},[]);
 useEffect(()=>{document.documentElement.lang=language},[language]);
 useEffect(()=>{const sync=(event:StorageEvent)=>{try{if(event.storageArea!==localStorage||event.key!==languageKey)return}catch{return}setCurrent(parseLanguage(event.newValue));setStorageError(false)};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 const value=useMemo(()=>({language,tr:(english:string,chinese:string)=>language==='zh-Hant'?chinese:english,t:createTranslator(language),setLanguage,storageError}),[language,setLanguage,storageError]);
 return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage(){return useContext(LanguageContext)}
export function LanguageControl(){
 const {language,setLanguage,storageError,t}=useLanguage();
 return <div className="language-control"><label htmlFor="planner-language">{t('language.label')}</label><select id="planner-language" value={language} onChange={event=>setLanguage(parseLanguage(event.target.value))}>{supportedLanguages.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select>{storageError&&<p role="status">{t('language.storageError')}</p>}</div>;
}
