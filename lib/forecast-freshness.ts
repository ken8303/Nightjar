import {validObservingDate} from './observing-time';
import {createTranslator} from './messages';
import type {Language} from './language';

// Planning clocks update at minute resolution. A newly fetched forecast may
// lead that snapshot by less than a minute without a device-clock correction.
export function forecastFreshness(fetchedAt:number|undefined,now:number){
 const age=fetchedAt===undefined?null:now-fetchedAt;
 return {stale:age!==null&&age>=30*60000,clockChanged:age!==null&&age< -60000};
}

export type ForecastSnapshot={fetchedAt?:number;refreshing?:boolean;refreshFailed?:boolean};

// Check age when preparing a file, including exports between clock ticks.
export function forecastSnapshotNotes(snapshot:ForecastSnapshot,created:Date,language:Language='en'){
 const t=createTranslator(language);
 const fetched=typeof snapshot.fetchedAt==='number'&&Number.isFinite(snapshot.fetchedAt)?new Date(snapshot.fetchedAt):null;
 const known=Boolean(fetched&&validObservingDate(fetched));
 const {stale,clockChanged}=forecastFreshness(known?snapshot.fetchedAt:undefined,+created);
 return [
  ...(snapshot.refreshing?[t('summary.refreshingPrevious')]:[]),
  ...(snapshot.refreshFailed?[t('summary.failedPrevious')]:[]),
  known?t('summary.fetched',{time:fetched!.toISOString()}):t('summary.fetchUnknown'),
  ...(stale?[t('summary.stale')]:[]),
  ...(clockChanged?[t('summary.clockChanged')]:[]),
 ];
}
