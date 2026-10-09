'use client';
import {useEffect,useRef} from 'react';
export default function TargetRemovalUndo({removal,onUndo,status,disabled=false}:{removal:{name:string};onUndo:()=>void;status?:string;disabled?:boolean}){
 const button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{button.current?.focus()},[removal]);
 return <div className="place-removal-undo"><p className="muted">{removal.name} removed from your saved list. Notes and diary records are kept.</p><button ref={button} className="button" disabled={disabled} onClick={onUndo}>Undo removal of {removal.name}</button>{status&&<p className="error" role="status">{status}</p>}<p className="footnote">You can undo the latest removal until another target is removed or you leave Sky atlas.</p></div>;
}
