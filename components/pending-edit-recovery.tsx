'use client';
import {usePendingEdits} from '@/hooks/use-pending-edits';
import {observingTimeEditLabel,reviewObservingTimeEvent} from '@/lib/observing-time-actions';
import {coordinateEntryEditLabel,reviewCoordinateEntryEvent} from '@/lib/coordinate-entry-actions';
import {imagingDraftEditLabel,reviewImagingDraftEvent} from '@/lib/imaging-draft-actions';

const actions=[
 {label:observingTimeEditLabel,event:reviewObservingTimeEvent,text:'Review time edit'},
 {label:coordinateEntryEditLabel,event:reviewCoordinateEntryEvent,text:'Review coordinates'},
 {label:imagingDraftEditLabel,event:reviewImagingDraftEvent,text:'Review imaging draft'},
];
export default function PendingEditRecovery(){
 const pending=usePendingEdits().split(', ');
 const available=actions.filter(action=>pending.includes(action.label));
 if(!available.length)return null;
 return <div className="button-row pending-edit-actions" role="group" aria-label="Review unfinished edits">{available.map(action=><button key={action.event} type="button" className="button" onClick={()=>window.dispatchEvent(new Event(action.event))}>{action.text}</button>)}</div>;
}
