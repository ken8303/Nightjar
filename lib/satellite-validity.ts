import {parseOrbitalEpoch,satelliteEpochWindowMs} from './satellite-elements';

// Only the timestamps are needed to recheck a queued planning action.
export type SatelliteFreshness={fetchedAt:string;epoch:string};
export function satelliteFreshnessIssue(feed:SatelliteFreshness,date:Date,now=Date.now()){
 const fetched=Date.parse(feed.fetchedAt),epoch=parseOrbitalEpoch(feed.epoch);
 if(!Number.isFinite(now)||!Number.isFinite(+date)||!Number.isFinite(fetched)||!epoch)return 'Choose a valid observing instant and refresh satellite data.';
 if(fetched>now+5*60000)return 'The feed time is ahead of this device. Check your clock before using satellite directions.';
 if(now-fetched>6*60*60*1000)return 'Cached orbital data is more than six hours old. Refresh it before using satellite directions.';
 if(Math.abs(now-+epoch)>satelliteEpochWindowMs)return 'The orbital epoch is outside the supported three-day window around now.';
 if(Math.abs(+date-+epoch)>satelliteEpochWindowMs)return 'Choose an observing time within three days of the orbital epoch. Current elements cannot describe distant dates.';
 return '';
}
