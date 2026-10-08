'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Field,FieldDescription,FieldGroup,FieldLabel} from '@/components/ui/field';

export default function SiteNameEditor({name,onSave,disabled=false}:{name:string;onSave:(name:string)=>void;disabled?:boolean}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(''),[error,setError]=useState('');
 const input=useRef<HTMLInputElement>(null),trigger=useRef<HTMLButtonElement>(null),returnFocus=useRef(false);
 useEffect(()=>{if(editing)input.current?.focus();else if(returnFocus.current){returnFocus.current=false;trigger.current?.focus()}},[editing]);
 function close(){returnFocus.current=true;setEditing(false);setError('')}
 if(!editing)return <Button ref={trigger} variant="outline" className="site-name-trigger min-h-11" disabled={disabled} onClick={()=>{setDraft(name);setError('');setEditing(true)}}>Rename site</Button>;
 return <form className="site-name-editor" onSubmit={event=>{event.preventDefault();if(disabled)return;try{onSave(draft);close()}catch(problem){setError(problem instanceof Error?problem.message:'This site name could not be saved.')}}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();close()}}}>
  <FieldGroup><Field data-invalid={Boolean(error)}><FieldLabel htmlFor="observing-site-name">Site name</FieldLabel><Input ref={input} id="observing-site-name" value={draft} maxLength={199} aria-invalid={Boolean(error)} aria-describedby="observing-site-name-help" className="min-h-11" onChange={event=>{setDraft(event.target.value);setError('')}}/><FieldDescription id="observing-site-name-help">Use a name you recognize. A saved site keeps its coordinates, time zone and sky rating.</FieldDescription>{error&&<FieldDescription role="status">{error}</FieldDescription>}</Field><Field orientation="horizontal" className="flex-wrap"><Button type="submit" className="min-h-11" disabled={disabled}>Save site name</Button><Button type="button" variant="outline" className="min-h-11" onClick={close}>Cancel</Button></Field></FieldGroup>
 </form>;
}
