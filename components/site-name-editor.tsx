'use client';
import {useEffect,useRef,useState} from 'react';
import {usePendingEditReporter} from '@/hooks/use-pending-edits';
import {siteNameEditLabel} from '@/lib/site-name-actions';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Field,FieldDescription,FieldError,FieldGroup,FieldLabel} from '@/components/ui/field';
import {useLanguage} from '@/components/language-provider';
import {placeFeedback} from '@/lib/place-feedback-language';

export default function SiteNameEditor({name,onSave,disabled=false}:{name:string;onSave:(name:string)=>void;disabled?:boolean}){
 const {tr,t}=useLanguage();
 const reportPending=usePendingEditReporter('places',siteNameEditLabel);
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(''),[error,setError]=useState('');
 const input=useRef<HTMLInputElement>(null),trigger=useRef<HTMLButtonElement>(null),returnFocus=useRef(false);
 useEffect(()=>{if(editing)input.current?.focus();else if(returnFocus.current){returnFocus.current=false;trigger.current?.focus()}},[editing]);
 function close(){reportPending(false);returnFocus.current=true;setEditing(false);setError('')}
 if(!editing)return <Button ref={trigger} variant="outline" className="site-name-trigger min-h-11" disabled={disabled} onClick={()=>{setDraft(name);setError('');setEditing(true)}}>{tr('Rename site','重新命名地點')}</Button>;
 return <form className="site-name-editor" onSubmit={event=>{event.preventDefault();if(disabled)return;try{onSave(draft);close()}catch(problem){setError(problem instanceof Error?problem.message:'This site name could not be saved.');input.current?.focus()}}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();close()}}}>
  <FieldGroup><Field data-invalid={Boolean(error)}><FieldLabel htmlFor="observing-site-name">{tr('Site name','地點名稱')}</FieldLabel><Input ref={input} id="observing-site-name" value={draft} maxLength={199} aria-invalid={Boolean(error)} aria-describedby={error?'observing-site-name-help observing-site-name-error':'observing-site-name-help'} className="min-h-11" onChange={event=>{setDraft(event.target.value);reportPending(event.target.value!==name);setError('')}}/><FieldDescription id="observing-site-name-help">{tr('Use a name you recognize. A saved site keeps its coordinates, time zone and sky rating.','使用容易辨認的名稱。已儲存地點會保留座標、時區與天空黑暗度評級。')}</FieldDescription>{error&&<FieldError id="observing-site-name-error" role="status">{placeFeedback(error,t)}</FieldError>}</Field><Field orientation="horizontal" className="flex-wrap"><Button type="submit" className="min-h-11" disabled={disabled}>{tr('Save site name','儲存地點名稱')}</Button><Button type="button" variant="outline" className="min-h-11" onClick={close}>{tr('Cancel','取消')}</Button></Field></FieldGroup>
 </form>;
}
