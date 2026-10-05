import {type DeepSkyMoon} from '@/lib/deep-sky-moon';
export default function DeepSkyMoonContext({moon,label}:{moon:DeepSkyMoon;label:string}){
 return <section className="deep-sky-moon" aria-label={label}><h4>{label}</h4><p>{moon.name} · {Math.round(moon.illumination*100)}% illuminated</p><dl><div><dt>Moon altitude</dt><dd>{moon.altitude.toFixed(1)}°</dd></div><div><dt>Distance from object</dt><dd>{moon.separation.toFixed(1)}°</dd></div></dl><p className="muted">{moon.belowHorizon?'Moon centre is at or below the ideal horizon.':'Moon is above the horizon; its light can reduce faint-object contrast.'}</p></section>;
}
