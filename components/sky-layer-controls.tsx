'use client';
export type SkyLayerSettings={
 showLines:boolean;
 showLabels:boolean;
 showMilkyWay:boolean;
 onLinesChange:(shown:boolean)=>void;
 onLabelsChange:(shown:boolean)=>void;
 onCoreChange:(shown:boolean)=>void;
};
export default function SkyLayerControls(props:SkyLayerSettings){
 return <div className="chart-layer-controls" role="group" aria-label="Sky chart display">
  <button type="button" aria-pressed={props.showLines} onClick={()=>props.onLinesChange(!props.showLines)}>Star pattern lines</button>
  <button type="button" aria-pressed={props.showLabels} onClick={()=>props.onLabelsChange(!props.showLabels)}>Object labels</button>
  <button type="button" aria-pressed={props.showMilkyWay} onClick={()=>props.onCoreChange(!props.showMilkyWay)}>Core direction</button>
 </div>;
}
