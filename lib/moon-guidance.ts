/** Advice for the selected observing instant and the ideal, unobstructed horizon. */
export function moonObservingAdvice({illumination,altitude}:{illumination:number;altitude:number}):string{
 if(altitude<=0)return 'The Moon is at or below your ideal horizon. Dark skies and clear conditions help with faint targets.';
 if(illumination>.7)return 'A bright Moon above the horizon can wash out faint galaxies and nebulae. Try lunar detail or bright planets.';
 return 'The Moon is above your ideal horizon. Moonlight can reduce contrast for faint objects; consider brighter targets or a time when the Moon is below the horizon.';
}
