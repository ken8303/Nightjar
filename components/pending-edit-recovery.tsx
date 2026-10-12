'use client';
import {usePendingEdits} from '@/hooks/use-pending-edits';
import {pendingEditReviewActions} from '@/lib/pending-edit-review';
export default function PendingEditRecovery(){
 const available=pendingEditReviewActions(usePendingEdits());
 if(!available.length)return null;
 return <div className="button-row pending-edit-actions" role="group" aria-label="Review unfinished edits">{available.map(action=><button key={action.event} type="button" className="button" onClick={()=>window.dispatchEvent(new Event(action.event))}>{action.text}</button>)}</div>;
}
