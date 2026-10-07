const phaseNames=['New Moon','Waxing crescent','First quarter','Waxing gibbous','Full Moon','Waning gibbous','Last quarter','Waning crescent'] as const;
// The new-moon segment straddles 360°/0°; all eight ranges are centred on 45° steps.
export function moonPhaseName(phase:number){
 if(!Number.isFinite(phase))throw Error('The Moon phase angle must be finite.');
 const wrapped=(phase%360+360)%360;
 return phaseNames[Math.floor((wrapped+22.5)/45)%8];
}
