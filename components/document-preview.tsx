'use client';
import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {Download,Eye} from 'lucide-react';
import {Dialog,DialogClose,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {downloadFile} from '@/lib/download';
import {documentPreviewHTML,isDocumentPreviewClose} from '@/lib/document-preview';
import {useLanguage} from '@/components/language-provider';
export default function DocumentPreview({label,title,filename,createDocument,fallbackFocus,disabled=false,description}:{label:string;title:string;filename:string;createDocument:()=>string;fallbackFocus:Readonly<RefObject<HTMLElement|null>>;disabled?:boolean;description?:string}){
 const {t}=useLanguage();
 const [snapshot,setSnapshot]=useState<{html:string;filename:string}|null>(null),[status,setStatus]=useState<''|'failed'|'downloaded'|'downloadFailed'>('');
 const statusText=status?t(status==='failed'?'preview.failed':status==='downloaded'?'preview.downloaded':'preview.downloadFailed'):'';
 const frame=useRef<HTMLIFrameElement>(null),trigger=useRef<HTMLButtonElement>(null),closeOwner=useRef<Element|null>(null);
 const close=useCallback(()=>{closeOwner.current=document.activeElement;setStatus('');setSnapshot(null)},[]);
 useEffect(()=>{
  if(!snapshot)return;
  const onMessage=(event:MessageEvent)=>{if(isDocumentPreviewClose(event,frame.current?.contentWindow))close()};
  window.addEventListener('message',onMessage);return()=>window.removeEventListener('message',onMessage);
 },[snapshot,close]);
 const open=(next:boolean)=>{
  if(!next){close();return}
  setStatus('');
  try{setSnapshot({html:createDocument(),filename})}catch{setStatus('failed')}
 };
 const download=()=>{
  if(!snapshot)return;
  try{downloadFile(new Blob([snapshot.html],{type:'text/html;charset=utf-8'}),snapshot.filename);setStatus('downloaded')}catch{setStatus('downloadFailed')}
 };
 return <Dialog open={Boolean(snapshot)} onOpenChange={open}>
  <DialogTrigger asChild><Button ref={trigger} variant="outline" className="document-preview-trigger" disabled={disabled}><Eye data-icon="inline-start"/>{label}</Button></DialogTrigger>
  {!snapshot&&status&&<p role="status" className="muted">{statusText}</p>}
  <DialogContent className="document-preview-dialog" showCloseButton={false} onCloseAutoFocus={event=>{
   if(trigger.current&&!trigger.current.disabled)return;
   event.preventDefault();
   // Removing a focused iframe can temporarily clear document.hasFocus().
   deferFocusAndScroll(()=>fallbackFocus.current,{owner:closeOwner.current});
  }}>
   <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description??t('preview.description')}</DialogDescription></DialogHeader>
   <div className="document-preview-actions"><Button onClick={download}><Download data-icon="inline-start"/>{t('preview.download')}</Button><DialogClose asChild><Button variant="outline">{t('preview.close')}</Button></DialogClose></div>
   {status&&<p role="status" className="muted">{statusText}</p>}
   {snapshot&&<iframe ref={frame} title={t('preview.frame',{title})} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={documentPreviewHTML(snapshot.html)} className="document-preview-frame"/>}
  </DialogContent>
 </Dialog>;
}
