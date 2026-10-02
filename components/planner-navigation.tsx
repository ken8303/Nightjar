'use client';
import {useRef,useState} from 'react';
import {Dialog} from 'radix-ui';
import {Moon,Compass,MapPin,Activity,CalendarDays,Telescope,Menu,X} from 'lucide-react';

export const plannerSections=[['tonight','Tonight',Moon],['sky','Sky atlas',Compass],['moon','Moon',Moon],['places','My places',MapPin],['aurora','Aurora',Activity],['events','Sky calendar',CalendarDays],['tools','Photo tools',Telescope]] as const;
export default function MobileNavigation({section,onSelect}:{section:string;onSelect:(section:string)=>void}){
 const [open,setOpen]=useState(false);
 const navigating=useRef(false);
 return <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger className="mobile-navigation-trigger" aria-label="Open planner navigation"><Menu size={18}/><span>Explore</span></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="mobile-navigation-overlay"/><Dialog.Content className="mobile-navigation-menu" onCloseAutoFocus={event=>{
  if(!navigating.current)return;
  event.preventDefault();navigating.current=false;
  requestAnimationFrame(()=>{const heading=document.getElementById('planner-heading');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start',behavior:'instant'})});
 }}><div className="mobile-navigation-heading"><Dialog.Title>Explore Nightjar</Dialog.Title><Dialog.Close className="round-button" aria-label="Close planner navigation"><X size={20}/></Dialog.Close></div><Dialog.Description className="muted">Choose a section. Your observing site and time stay selected.</Dialog.Description><div className="mobile-navigation-options">{plannerSections.map(([key,label,Icon])=><button key={key} type="button" aria-current={key===section?'page':undefined} onClick={()=>{navigating.current=true;onSelect(key);setOpen(false)}}><Icon size={20}/><span>{label}</span>{key===section&&<small>Current</small>}</button>)}</div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
