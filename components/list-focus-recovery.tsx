'use client';
import {Component,type ReactNode,type RefObject} from 'react';
import {deferFocusAndScroll} from '@/lib/deferred-focus';

type Props={listId:string;fallback:Readonly<RefObject<HTMLElement|null>>;resolve?:(owner:Element)=>HTMLElement|null;children:ReactNode};

// Capture ownership before React removes a row. An effect would only see BODY
// afterward and could not identify which list should recover the user's focus.
export default class ListFocusRecovery extends Component<Props,Record<string,never>,Element|null>{
 getSnapshotBeforeUpdate(previous:Readonly<Props>){
  if(document.hidden||!document.hasFocus())return null;
  const list=document.getElementById(previous.listId),owner=document.activeElement;
  return owner&&list&&!list.closest('[aria-hidden="true"]')&&list.contains(owner)?owner:null;
 }
 componentDidUpdate(_previous:Readonly<Props>,_state:Readonly<Record<string,never>>,owner:Element|null){
  if(!owner||owner.isConnected)return;
  deferFocusAndScroll(()=>document.hasFocus()?(this.props.resolve?.(owner)??this.props.fallback.current):null,{owner});
 }
 render(){return this.props.children}
}
