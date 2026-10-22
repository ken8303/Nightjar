type HourKeyEvent=Pick<KeyboardEvent,'key'|'altKey'|'ctrlKey'|'metaKey'|'preventDefault'>&{currentTarget:HTMLButtonElement};

// Browse the rendered group without selecting a time or intercepting browser shortcuts.
export function browseHourButtons(event:HourKeyEvent){
 if(event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const buttons=Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);
 const current=buttons.indexOf(event.currentTarget);
 if(current<0)return;
 const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowLeft'?Math.max(0,current-1):Math.min(buttons.length-1,current+1);
 event.preventDefault();
 buttons[next]?.focus();
}
