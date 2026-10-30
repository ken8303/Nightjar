'use client';
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {deepSkyPhoto,type DeepSkyObject} from '@/lib/deep-sky';

// Only mount images close to the scrollable result list's viewport. This keeps
// the full catalogue from issuing hundreds of requests or decoding all images.
export default function DeepSkyThumbnail({target}:{target:DeepSkyObject}){
 const frame=useRef<HTMLSpanElement>(null);
 const [visible,setVisible]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{
  const node=frame.current;if(!node)return;
  if(!('IntersectionObserver' in window)){const timer=setTimeout(()=>setVisible(true),0);return()=>clearTimeout(timer)}
  const observer=new IntersectionObserver(entries=>setVisible(entries.some(entry=>entry.isIntersecting)),{root:node.closest('#deep-sky-results'),rootMargin:'120px'});
  observer.observe(node);return()=>observer.disconnect();
 },[]);
 const photo=visible&&!failed?deepSkyPhoto(target):null;
 return <span ref={frame} className="deep-sky-thumbnail" aria-hidden="true">{failed?'—':photo&&<Image unoptimized src={photo.thumbnailSrc??photo.previewSrc??photo.src} alt="" width={72} height={72} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>}</span>;
}
