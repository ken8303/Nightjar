import {ArrowUpRight} from 'lucide-react';

export default function LightPollutionReference(){
 return <div className="light-pollution-reference"><h3>Explore a darker site</h3><p className="muted">Compare modelled artificial sky brightness in David Lorenz’s light-pollution atlas. It estimates light scattered toward the zenith, directly overhead.</p><a className="button" href="https://djlorenz.github.io/astronomy/lp/overlay/dark.html" target="_blank" rel="noreferrer">Open light-pollution atlas <ArrowUpRight size={16}/><span className="sr-only"> (opens in a new tab)</span></a><p className="footnote">An external map, separate from your Nightjar site and personal Bortle rating. Check the dataset year, coverage and <a href="https://djlorenz.github.io/astronomy/lp/colors.html" target="_blank" rel="noreferrer">colour legend<span className="sr-only"> (opens in a new tab)</span></a> in the source. This is a model, not a direct measurement or live forecast.</p></div>;
}
