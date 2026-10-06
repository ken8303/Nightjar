export function requestCoordinates(params:URLSearchParams):{latitude:number;longitude:number}|null{
 const parse=(name:string,limit:number)=>{
  const raw=params.get(name)?.trim();
  if(!raw||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(raw))return null;
  const number=Number(raw);return Number.isFinite(number)&&Math.abs(number)<=limit?number:null;
 };
 const latitude=parse('lat',90),longitude=parse('lon',180);
 return latitude===null||longitude===null?null:{latitude,longitude};
}
