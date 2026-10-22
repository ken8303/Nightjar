import {validObservingDate} from './observing-time';

// Planning clocks update at minute resolution. A newly fetched forecast may
// lead that snapshot by less than a minute without a device-clock correction.
export function forecastFreshness(fetchedAt:number|undefined,now:number){
 const age=fetchedAt===undefined?null:now-fetchedAt;
 return {stale:age!==null&&age>=30*60000,clockChanged:age!==null&&age< -60000};
}

export type ForecastSnapshot={fetchedAt?:number;refreshing?:boolean;refreshFailed?:boolean};

// Check age when preparing a file, including exports between clock ticks.
export function forecastSnapshotNotes(snapshot:ForecastSnapshot,created:Date){
 const fetched=typeof snapshot.fetchedAt==='number'&&Number.isFinite(snapshot.fetchedAt)?new Date(snapshot.fetchedAt):null;
 const known=Boolean(fetched&&validObservingDate(fetched));
 const {stale,clockChanged}=forecastFreshness(known?snapshot.fetchedAt:undefined,+created);
 return [
  ...(snapshot.refreshing?['Weather refresh in progress; previous forecast shown.']:[]),
  ...(snapshot.refreshFailed?['Weather refresh failed; previous forecast shown.']:[]),
  known?`Weather fetched: ${fetched!.toISOString()} (UTC)`:'Weather fetch time unavailable; its age cannot be confirmed.',
  ...(stale?['WARNING: Weather was fetched over 30 minutes ago. Refresh before relying on it.']:[]),
  ...(clockChanged?['WARNING: Weather fetch time is ahead of the device clock. Its age cannot be confirmed.']:[]),
 ];
}
