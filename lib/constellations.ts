// Names: https://iauarchive.eso.org/public/themes/constellations/
// OpenNGC separates Serpens into Se1 (Caput) and Se2 (Cauda):
// https://github.com/mattiaverga/OpenNGC/blob/master/NGC_guide.txt
const names:Readonly<Record<string,string>>={
 And:'Andromeda',Aqr:'Aquarius',Aur:'Auriga',CMa:'Canis Major',CVn:'Canes Venatici',
 Cap:'Capricornus',Cas:'Cassiopeia',Cet:'Cetus',Cnc:'Cancer',Com:'Coma Berenices',
 Cyg:'Cygnus',Gem:'Gemini',Her:'Hercules',Hya:'Hydra',Leo:'Leo',Lep:'Lepus',
 Lyr:'Lyra',Mon:'Monoceros',Oph:'Ophiuchus',Ori:'Orion',Peg:'Pegasus',Per:'Perseus',
 Psc:'Pisces',Pup:'Puppis',Sco:'Scorpius',Sct:'Scutum',Se1:'Serpens Caput',
 Se2:'Serpens Cauda',Sge:'Sagitta',Sgr:'Sagittarius',Tau:'Taurus',Tri:'Triangulum',
 UMa:'Ursa Major',Vir:'Virgo',Vul:'Vulpecula',
};
export function constellationName(code:string){return names[code]||code}
