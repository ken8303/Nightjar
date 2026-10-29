/** Advice for the selected observing instant and the ideal, unobstructed horizon. */
export function moonObservingAdvice({illumination,altitude}:{illumination:number;altitude:number},language:'en'|'zh-Hant'='en'):string{
 if(altitude<=0)return language==='zh-Hant'?'月球位於理想地平線或其下方。黑暗的天空與晴朗天氣有助觀測暗弱天體。':'The Moon is at or below your ideal horizon. Dark skies and clear conditions help with faint targets.';
 if(illumination>.7)return language==='zh-Hant'?'地平線上的明亮月球可能掩蓋暗弱的星系與星雲。可嘗試觀測月面細節或明亮行星。':'A bright Moon above the horizon can wash out faint galaxies and nebulae. Try lunar detail or bright planets.';
 return language==='zh-Hant'?'月球位於理想地平線上方，月光可能降低暗弱天體的對比。可考慮較明亮的目標，或月球位於地平線下的時間。':'The Moon is above your ideal horizon. Moonlight can reduce contrast for faint objects; consider brighter targets or a time when the Moon is below the horizon.';
}
