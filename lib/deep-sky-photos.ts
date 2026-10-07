import type {ObjectPhoto} from './object-photos';
const resized=(asset:string,width:number)=>`${asset}?fit=clip&w=${width}&h=${width}`;
const m13='https://assets.science.nasa.gov/dynamicimage/assets/science/missions/hubble/releases/2008/12/STScI-01EVT608YP9VR4ZXXA3DF0TX87.tif';
const m31='https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia12/pia12832/PIA12832.jpg';
const references:Record<string,ObjectPhoto>={
 M13:{src:resized(m13,800),thumbnailSrc:resized(m13,200),title:'Hubble cluster-core reference',alt:'Dense stars in the core of the Hercules Globular Cluster, M13',caption:'Hubble ACS/WFPC2 composite from 1999–2006 observations. Visible and infrared exposures are combined in assigned colours; this shows the core of M13, not the whole cluster or its naked-eye appearance.',credit:'NASA, ESA, and the Hubble Heritage Team (STScI/AURA); acknowledgment: C. Bailyn (Yale), W. Lewin (MIT), A. Sarajedini (University of Florida), and W. van Altena (Yale)',source:'https://science.nasa.gov/asset/hubble/hubble-image-of-m13s-nucleus/'},
 M31:{src:resized(m31,800),thumbnailSrc:resized(m31,200),title:'WISE infrared galaxy reference',alt:'The Andromeda Galaxy, M31, in a colour-coded WISE infrared mosaic',caption:'WISE, released in 2010. Four infrared bands are mapped to visible colours: shorter wavelengths in blue, 12 microns in green and 22 microns in red. This is a processed infrared mosaic, not a visible-light or live view.',credit:'NASA/JPL-Caltech/UCLA',source:'https://science.nasa.gov/photojournal/our-neighbor-andromeda/'}
};
export function featuredDeepSkyPhoto(id:string):ObjectPhoto|undefined{return Object.hasOwn(references,id)?references[id]:undefined}
