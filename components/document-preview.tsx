'use client';
import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {Download,Eye} from 'lucide-react';
import {Dialog,DialogClose,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {downloadFile} from '@/lib/download';
import {documentPreviewHTML,isDocumentPreviewClose} from '@/lib/document-preview';
export default function DocumentPreview({label,title,filename,createDocument,fallbackFocus,disabled=false,description='Review this snapshot, then download the HTML file to print or save as PDF. Preview check marks are temporary and are not included in the download.'}:{label:string;title:string;filename:string;createDocument:()=>string;fallbackFocus:Readonly<RefObject<HTMLElement|null>>;disabled?:boolean;description?:string}){
 const [snapshot,setSnapshot]=useState<{html:string;filename:string}|null>(null),[status,setStatus]=useState('');
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
  try{setSnapshot({html:createDocument(),filename})}catch{setStatus('The preview could not be prepared. Your saved data has not changed.')}
 };
 const download=()=>{
  if(!snapshot)return;
  try{downloadFile(new Blob([snapshot.html],{type:'text/html;charset=utf-8'}),snapshot.filename);setStatus('HTML file prepared for download. Open it to print or save as PDF.')}catch{setStatus('The file could not be prepared. You can retry; your preview is still here.')}
 };
 return <Dialog open={Boolean(snapshot)} onOpenChange={open}>
  <DialogTrigger asChild><Button ref={trigger} variant="outline" className="document-preview-trigger" disabled={disabled}><Eye data-icon="inline-start"/>{label}</Button></DialogTrigger>
  {!snapshot&&status&&<p role="status" className="muted">{status}</p>}
  <DialogContent className="document-preview-dialog" showCloseButton={false} onCloseAutoFocus={event=>{
   if(trigger.current&&!trigger.current.disabled)return;
   event.preventDefault();
   // Removing a focused iframe can temporarily clear document.hasFocus().
   deferFocusAndScroll(()=>fallbackFocus.current,{owner:closeOwner.current});
  }}>
   <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
   <div className="document-preview-actions"><Button onClick={download}><Download data-icon="inline-start"/>Download HTML</Button><DialogClose asChild><Button variant="outline">Close preview</Button></DialogClose></div>
   {status&&<p role="status" className="muted">{status}</p>}
   {snapshot&&<iframe ref={frame} title={`${title} document`} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={documentPreviewHTML(snapshot.html)} className="document-preview-frame"/>}
  </DialogContent>
 </Dialog>;
}
