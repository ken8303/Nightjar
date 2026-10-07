/** Request a download synchronously from a user gesture; browser completion is not observable. */
export function downloadFile(blob:Blob,filename:string):void{
 const link=document.createElement('a');
 const url=URL.createObjectURL(blob);
 try{
  link.href=url;
  link.download=filename;
  link.hidden=true;
  document.body.appendChild(link);
  link.click();
 }catch(error){
  URL.revokeObjectURL(url);
  throw error;
 }finally{
  link.remove();
 }
 // Keep the URL alive while the browser starts reading the file, including slow devices.
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
