// Only generated Nightjar exports enter this viewer. Escape inside an iframe
// does not bubble to its parent dialog, so bridge that one keyboard action.
export const documentPreviewCloseMessage='nightjar-document-preview-close';
export function documentPreviewHTML(html:string){
 return html.replace('</head>','<style>.print-controls{display:none}</style></head>').replace('</body>',`<script>document.addEventListener('keydown',function(event){if(event.key==='Escape'){event.preventDefault();parent.postMessage('${documentPreviewCloseMessage}','*')}})</script></body>`);
}
export function isDocumentPreviewClose(event:{source:unknown;data:unknown},frameWindow:unknown){
 return Boolean(frameWindow)&&event.source===frameWindow&&event.data===documentPreviewCloseMessage;
}
