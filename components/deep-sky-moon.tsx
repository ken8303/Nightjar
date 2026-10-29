'use client';
import {type DeepSkyMoon} from '@/lib/deep-sky-moon';
import {useLanguage} from '@/components/language-provider';
import {moonPhaseLabel} from '@/lib/language';
export default function DeepSkyMoonContext({moon,label}:{moon:DeepSkyMoon;label:string}){
 const {language,tr}=useLanguage();
 return <section className="deep-sky-moon" aria-label={label}><h4>{label}</h4><p>{moonPhaseLabel(moon.name,language)} · {tr(`${Math.round(moon.illumination*100)}% illuminated`,`照明比例 ${Math.round(moon.illumination*100)}%`)}</p><dl><div><dt>{tr('Moon altitude','月球高度角')}</dt><dd>{moon.altitude.toFixed(1)}°</dd></div><div><dt>{tr('Distance from object','與天體的角距離')}</dt><dd>{moon.separation.toFixed(1)}°</dd></div></dl><p className="muted">{moon.belowHorizon?tr('Moon centre is at or below the ideal horizon.','月球中心位於理想地平線或其下方。'):tr('Moon is above the horizon; its light can reduce faint-object contrast.','月球位於地平線上方；月光可能降低暗弱天體的對比。')}</p></section>;
}
