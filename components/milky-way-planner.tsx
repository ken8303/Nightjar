"use client";

import {useMemo} from 'react';
import {Compass, Moon, ArrowUpRight} from 'lucide-react';
import {Place, milkyWayPlanning, timeLabel} from '@/lib/sky';
import {deepSkyTimestampFormatter as planningTimestampFormatter} from '@/lib/deep-sky-time';
import {useLanguage} from '@/components/language-provider';
import {languageLocale} from '@/lib/language';

export default function MilkyWayPlanner({date,place,onDate}:{date:Date;place:Place;onDate:(date:Date)=>void}){
 const {language,t}=useLanguage();
 const plan=useMemo(()=>milkyWayPlanning(date,place),[date,place]);
 const timezone=place.timezone||'UTC',shortened=plan.sampleCount<97;
 const stamp=planningTimestampFormatter(date,timezone,languageLocale(language));
 const moonFree=plan.best&&plan.best.moonAltitude<0;
 const direction=t((['bright.directionN','bright.directionNE','bright.directionE','bright.directionSE','bright.directionS','bright.directionSW','bright.directionW','bright.directionNW'] as const)[Math.round(plan.current.azimuth/45)%8]);
 return <section className="panel milky-way-planner" aria-labelledby="milky-way-title">
  <div className="section-label"><span>{t('milky.label')}</span><Compass size={18}/></div>
  <div className="milky-way-heading"><div><h2 id="milky-way-title">{t('milky.title')}</h2><p className="muted">{t('milky.intro')}</p></div><span className="milky-way-badge">{t('milky.badge')}</span></div>
  <div className="milky-way-facts">
   <div><small>{t('milky.selected')}</small><strong>{plan.current.altitude>0?t('milky.up',{altitude:Math.round(plan.current.altitude)}):t('milky.below')}</strong><span>{t('milky.azimuth',{direction,azimuth:Math.round(plan.current.azimuth)})}</span></div>
   <div><small>{t(shortened?'milky.windowSupported':'milky.window24')}</small><strong>{plan.best?(+plan.first!.date===+plan.last!.date?t('milky.sample',{time:timeLabel(plan.first!.date,timezone)}):`${timeLabel(plan.first!.date,timezone)}–${timeLabel(plan.last!.date,timezone)}`):t(shortened?'milky.noneSupported':'milky.none24')}</strong>{plan.best?<><span>{stamp.format(plan.first!.date)}{+plan.first!.date!==+plan.last!.date&&<> → {stamp.format(plan.last!.date)}</>}</span><span>{t('milky.conditions')}</span></>:<span>{t('milky.tryAnother')}</span>}</div>
   <div><small>{t('milky.highest')}</small><strong>{plan.best?t('milky.highestValue',{altitude:Math.round(plan.best.altitude),time:timeLabel(plan.best.date,timezone)}):'—'}</strong><span>{plan.best?(moonFree?t('milky.moonBelow',{date:stamp.format(plan.best.date)}):t('milky.moonAbove',{date:stamp.format(plan.best.date),illumination:Math.round(plan.best.moonIllumination*100)})):t('milky.noSample')}</span></div>
  </div>
  {shortened&&<p role="status" className="muted">{t(plan.sampleCount===1?'milky.shortOne':'milky.shortMany',{count:plan.sampleCount})}</p>}
  {plan.best&&<button type="button" className="button milky-way-action" onClick={()=>onDate(plan.best!.date)}>{t('milky.useTime')} <ArrowUpRight size={16}/></button>}
  <p className="footnote"><Moon size={14} aria-hidden="true"/> {t('milky.notes')} <a href="https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md#Rotation_GAL_EQJ" target="_blank" rel="noreferrer">{t('milky.reference')}</a>.</p>
 </section>;
}
