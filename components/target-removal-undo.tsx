'use client';
import {useEffect,useRef} from 'react';
import {useLanguage} from '@/components/language-provider';
export default function TargetRemovalUndo({removal,onUndo,status,disabled=false}:{removal:{name:string};onUndo:()=>void;status?:string;disabled?:boolean}){
 const {t}=useLanguage();
 const button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{button.current?.focus()},[removal]);
 return <div className="place-removal-undo"><p className="muted">{t('undo.removed',{name:removal.name})}</p><button ref={button} className="button" disabled={disabled} onClick={onUndo}>{t('undo.action',{name:removal.name})}</button>{status&&<p className="error" role="status">{status}</p>}<p className="footnote">{t('undo.help')}</p></div>;
}
