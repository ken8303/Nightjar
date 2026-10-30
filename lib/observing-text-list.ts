import {localizedDarknessSummaryLines} from './darkness-summary-language';
import {diaryLocalTime} from './diary-time';
import {languageLocale,skyTargetLabel,type Language} from './language';
import {createTranslator} from './messages';
import {notesCoverageNotice,targetCoverageNotice} from './observing-plan';
import type {Place} from './sky';

type Target={name:string;altitude:number;azimuth:number};
type Input={date:Date;place:Place;targets:readonly Target[];notes:Record<string,string>;targetsOmitted:number;notesUnavailable:boolean;notesUnsaved:boolean;language?:Language};
export function observingTextList({date,place,targets,notes,targetsOmitted,notesUnavailable,notesUnsaved,language='en'}:Input){
 const t=createTranslator(language),local=place.timezone?diaryLocalTime({observedAt:date.toISOString(),place},languageLocale(language)):null;
 const coverage=notesCoverageNotice(notesUnavailable,notesUnsaved,language);
 const darkLines=localizedDarknessSummaryLines(date,place,language);
 const direction=(az:number)=>t((['bright.directionN','bright.directionNE','bright.directionE','bright.directionSE','bright.directionS','bright.directionSW','bright.directionW','bright.directionNW'] as const)[Math.round(az/45)%8]);
 return [t('textPlan.title'),t('textPlan.place',{place:place.name.replace(/[\r\n]/g,' ')}),t('textPlan.coordinates',{latitude:place.latitude.toFixed(4),longitude:place.longitude.toFixed(4)}),t('textPlan.utc',{time:date.toISOString()}),local===null?t('textPlan.noZone'):t('textPlan.local',{time:local,zone:place.timezone!}),...darkLines,...(coverage?[t('textPlan.notesStatus',{status:coverage})]:[]),'',t('textPlan.heading'),...(targetsOmitted?[targetCoverageNotice(targetsOmitted,language)]:[]),'',...targets.flatMap(target=>[`[ ] ${skyTargetLabel(target.name,language)}`,`    ${t('textPlan.position',{altitude:target.altitude.toFixed(1),azimuth:target.azimuth.toFixed(1),direction:direction(target.azimuth),horizon:t(target.altitude>0?'plan.above':'plan.below')})}`,`    ${t('textPlan.notes')}`,...(notes[target.name]||'').split('\n').map(line=>`    ${line}`),'']),t('textPlan.positionHint'),t('textPlan.darknessHint'),t('textPlan.horizonHint'),''].join('\n');
}
