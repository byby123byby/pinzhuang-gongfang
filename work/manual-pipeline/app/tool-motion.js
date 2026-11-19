import * as THREE from 'three';
import {actionAt} from './motion.js';

const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const up=new THREE.Vector3(0,1,0);

export function toolAt(manual,stepIndex,progress,frame){
  const clock=actionAt(manual,stepIndex,progress),a=clock.action;
  if(!a.tool)return null;
  const state=frame.states.get(a.targets[0]),p=clock.progress;
  let contact,outward,quaternion,gap,phase,visible,placement;
  if(a.kind==='mark'){
    placement=Math.min(a.placements.length-1,Math.floor(p*a.placements.length));
    const t=p*a.placements.length-placement;
    contact=new THREE.Vector3(...a.placements[placement]).add(new THREE.Vector3(...a.tool.contact).applyQuaternion(state.quaternion));
    outward=new THREE.Vector3(...a.tool.outward).applyQuaternion(state.quaternion);
    quaternion=new THREE.Quaternion().setFromUnitVectors(up,outward);
    gap=t<.4?.045*(1-smooth((t-.2)/.2)):t>.65?.045*smooth((t-.65)/.15):0;
    visible=!clock.preparing&&t>.2&&t<.8;
    phase=t<.4?'对准标记孔':t<=.65?'压下标记':'抬起尖锥';
  }else{
    const axis=new THREE.Vector3(...a.axis);
    contact=state.position.clone().addScaledVector(axis,a.tool.tipOffset);
    outward=axis.clone().negate();
    quaternion=state.quaternion.clone().multiply(new THREE.Quaternion().setFromUnitVectors(up,outward));
    gap=p<.25?.05*(1-smooth(p/.25)):p>.85?.06*smooth((p-.85)/.15):0;
    visible=!clock.preparing&&p>0&&p<1;
    phase=p<.25?'对准螺钉':p<=.85?'旋入并固定':'退出工具';
  }
  return {id:a.tool.id,targetId:a.targets[0],visible,contact,position:contact.clone().addScaledVector(outward,gap),quaternion,outward,engaged:visible&&gap<1e-6,phase,placement,actionIndex:clock.index};
}
