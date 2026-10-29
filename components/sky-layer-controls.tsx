'use client';
import {useLanguage} from '@/components/language-provider';
export type SkyLayerSettings={
 showLines:boolean;
 showLabels:boolean;
 showMilkyWay:boolean;
 onLinesChange:(shown:boolean)=>void;
 onLabelsChange:(shown:boolean)=>void;
 onCoreChange:(shown:boolean)=>void;
};
export default function SkyLayerControls(props:SkyLayerSettings){
 const {tr}=useLanguage();
 return <div className="chart-layer-controls" role="group" aria-label={tr('Sky chart display','星空圖顯示')}>
  <button type="button" aria-pressed={props.showLines} onClick={()=>props.onLinesChange(!props.showLines)}>{tr('Star pattern lines','星圖連線')}</button>
  <button type="button" aria-pressed={props.showLabels} onClick={()=>props.onLabelsChange(!props.showLabels)}>{tr('Object labels','天體標籤')}</button>
  <button type="button" aria-pressed={props.showMilkyWay} onClick={()=>props.onCoreChange(!props.showMilkyWay)}>{tr('Core direction','銀心方向')}</button>
 </div>;
}
