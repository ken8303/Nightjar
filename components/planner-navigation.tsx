'use client';
import {useRef,useState} from 'react';
import {Dialog} from 'radix-ui';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {Moon,Compass,MapPin,Activity,CalendarDays,Telescope,Menu,X} from 'lucide-react';
import {useLanguage} from '@/components/language-provider';
import {sectionLabel} from '@/lib/language';

export const plannerSections=[['tonight','Tonight',Moon],['sky','Sky atlas',Compass],['moon','Moon',Moon],['places','My places',MapPin],['aurora','Aurora',Activity],['events','Sky calendar',CalendarDays],['tools','Photo tools',Telescope]] as const;
export default function MobileNavigation({section,onSelect}:{section:string;onSelect:(section:string)=>void}){
 const {language,tr}=useLanguage();
 const [open,setOpen]=useState(false);
 const navigating=useRef(false),navigationOwner=useRef<HTMLButtonElement|null>(null);
 return <Dialog.Root open={open} onOpenChange={setOpen}><div className="mobile-navigation-bar"><span className="mobile-navigation-label">{sectionLabel(section,language,plannerSections.find(([key])=>key===section)?.[1]||'Nightjar')}</span><Dialog.Trigger className="mobile-navigation-trigger" aria-label={tr('Open planner navigation','開啟導覽選單')}><Menu size={18}/><span>{tr('Explore','探索')}</span></Dialog.Trigger></div><Dialog.Portal><Dialog.Overlay className="mobile-navigation-overlay"/><Dialog.Content className="mobile-navigation-menu" onCloseAutoFocus={event=>{
  if(!navigating.current)return;
  event.preventDefault();navigating.current=false;
  const owner=navigationOwner.current;navigationOwner.current=null;
  deferFocusAndScroll(()=>document.getElementById('unsaved-view-heading')||document.getElementById('planner-heading'),{owner});
 }}><div className="mobile-navigation-heading"><Dialog.Title>{tr('Explore Nightjar','探索 Nightjar')}</Dialog.Title><Dialog.Close className="round-button" aria-label={tr('Close planner navigation','關閉導覽選單')}><X size={20}/></Dialog.Close></div><Dialog.Description className="muted">{tr('Choose a section. Your observing site and time stay selected.','選擇功能。已選的觀測地點與時間會保留。')}</Dialog.Description><div className="mobile-navigation-options">{plannerSections.map(([key,label,Icon])=><button key={key} type="button" aria-current={key===section?'page':undefined} onClick={event=>{navigationOwner.current=event.currentTarget;navigating.current=true;onSelect(key);setOpen(false)}}><Icon size={20}/><span>{sectionLabel(key,language,label)}</span>{key===section&&<small>{tr('Current','目前')}</small>}</button>)}</div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
