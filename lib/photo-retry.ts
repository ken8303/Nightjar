// A fresh browser request keeps the provider's size, survey and coordinate
// parameters intact. Only explicit recovery attempts add this parameter.
export function photoRetrySource(source:string,token:string,base?:string){
 const url=new URL(source,base);
 url.searchParams.set('nightjar-retry',token);
 return url.href;
}
