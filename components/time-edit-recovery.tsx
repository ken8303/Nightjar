'use client';
import {usePendingEdits} from '@/hooks/use-pending-edits';
import {observingTimeEditLabel,reviewObservingTimeEvent} from '@/lib/observing-time-actions';

export default function TimeEditRecovery(){
 const pending=usePendingEdits();
 if(!pending.split(', ').includes(observingTimeEditLabel))return null;
 return <button type="button" className="button" onClick={()=>window.dispatchEvent(new Event(reviewObservingTimeEvent))}>Review time edit</button>;
}
