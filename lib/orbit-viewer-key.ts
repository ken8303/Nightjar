// Shared focused-viewer keys leave browser and assistive shortcuts intact.
export function handleOrbitViewerKey(event:Pick<KeyboardEvent,'key'|'ctrlKey'|'metaKey'|'altKey'|'preventDefault'>,actions:{rotate:(angle:number)=>void;tilt:(angle:number)=>void;zoom:(factor:number)=>void;reset:()=>void}|null){
 if(!actions||event.ctrlKey||event.metaKey||event.altKey)return;
 switch(event.key){case'ArrowLeft':actions.rotate(-.18);break;case'ArrowRight':actions.rotate(.18);break;case'ArrowUp':actions.tilt(-.15);break;case'ArrowDown':actions.tilt(.15);break;case'+':case'=':actions.zoom(.85);break;case'-':actions.zoom(1.18);break;case'Home':actions.reset();break;default:return}
 event.preventDefault();
}
