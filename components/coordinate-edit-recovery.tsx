'use client';
import {usePendingEdits} from '@/hooks/use-pending-edits';
import {coordinateEntryEditLabel,reviewCoordinateEntryEvent} from '@/lib/coordinate-entry-actions';

export default function CoordinateEditRecovery(){
 const pending=usePendingEdits();
 if(!pending.split(', ').includes(coordinateEntryEditLabel))return null;
 return <button type="button" className="button" onClick={()=>window.dispatchEvent(new Event(reviewCoordinateEntryEvent))}>Review coordinates</button>;
}
