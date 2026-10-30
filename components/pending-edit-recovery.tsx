'use client';
import {usePendingEdits} from '@/hooks/use-pending-edits';
import {pendingEditReviewActions} from '@/lib/pending-edit-review';
import {useLanguage} from '@/components/language-provider';
export default function PendingEditRecovery(){
 const available=pendingEditReviewActions(usePendingEdits());
 const {t}=useLanguage();
 if(!available.length)return null;
 return <div className="button-row pending-edit-actions" role="group" aria-label={t('pwa.review')}>{available.map(action=><button key={action.event} type="button" className="button" onClick={()=>window.dispatchEvent(new Event(action.event))}>{t(action.text==='Review time edit'?'pwa.reviewTime':action.text==='Review coordinates'?'pwa.reviewCoordinates':action.text==='Review imaging draft'?'pwa.reviewImaging':action.text==='Review diary forms'?'pwa.reviewDiary':action.text==='Review target notes'?'pwa.reviewNotes':'pwa.reviewSite')}</button>)}</div>;
}
