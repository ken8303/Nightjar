'use client';
import {useMemo} from 'react';
import {remainingDarkness,darknessDuration} from '@/lib/darkness-remaining';
import {forecastHourLabel} from '@/lib/weather-planning';
import type {Place} from '@/lib/sky';

export default function DarknessRemaining({date,place}:{date:Date;place:Place}){
 const window=useMemo(()=>remainingDarkness(date,place),[date,place]);
 if(!window)return null;
 const timezone=place.timezone||'UTC';
 return <section className="panel darkness-remaining" aria-labelledby="darkness-remaining-heading">
  <h2 id="darkness-remaining-heading">Your remaining dark time</h2>
  {window.end?<><p><strong>{darknessDuration(window.start,window.end)}</strong> of full astronomical darkness remains after your selected time.</p><p>Full darkness ends <time dateTime={window.end.toISOString()}>{forecastHourLabel(window.end,timezone).full}</time> · {timezone}.</p></>:<p>No end of full darkness was found {window.dateLimited?'before the supported UTC date limit':'within 48 hours of your selected time'}. This does not mean darkness lasts indefinitely.</p>}
  <p className="footnote">Calculated for {place.name}, with the Sun below −18°. Duration uses elapsed time across clock changes. Clouds, Moon glare and local obstructions can still limit observing.</p>
 </section>;
}
