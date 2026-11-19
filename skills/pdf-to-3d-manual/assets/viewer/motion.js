import * as THREE from 'three';

const smooth=t=>t*t*(3-2*t);
const clamp=t=>Math.max(0,Math.min(1,t));
export const poseQuaternion=pose=>new THREE.Quaternion().setFromEuler(new THREE.Euler(pose==='inverted'?Math.PI:pose==='sideA'?-Math.PI/2:pose==='sideB'?Math.PI/2:0,0,0));

export function frameAt(manual, stepIndex, progress, finished=false){
  const pose=finished?'upright':manual.steps[stepIndex].pose;
  const before=stepIndex>0?manual.steps[stepIndex-1].pose:pose;
  const actionProgress=before!==pose?clamp((progress-.2)/.8):progress;
  const states=new Map(manual.instances.map(i=>[i.id,{visible:(manual.initialInstalled??['top-1']).includes(i.id),installed:(manual.initialInstalled??['top-1']).includes(i.id),position:new THREE.Vector3(...i.home),quaternion:new THREE.Quaternion().setFromEuler(new THREE.Euler(...i.rotation))}]));
  const count=finished?manual.steps.length:stepIndex+1;
  for(let s=0;s<count;s++){
    const actions=manual.steps[s].actions, completed=finished||s<stepIndex;
    actions.forEach((action,index)=>{
      const p=completed?1:clamp(actionProgress*actions.length-index);
      for(const id of action.targets){
        const item=manual.instances.find(i=>i.id===id), state=states.get(id);
        if(action.kind==='mark'){
          state.quaternion.setFromEuler(new THREE.Euler(...(action.orientation??item.rotation)));
          state.visible=!completed&&p>0&&p<1;
          const segment=Math.min(action.placements.length-1,Math.floor(p*action.placements.length));
          const phase=p*action.placements.length-segment;
          const lift=phase<.2?1-smooth(phase/.2):phase>.8?smooth((phase-.8)/.2):0;
          state.position.set(...action.placements[segment]).add(new THREE.Vector3(...(action.offset??[0,0,.06])).multiplyScalar(lift));
        }else{
          state.visible=true;state.installed=p===1;
          const start=new THREE.Vector3(...action.offset),end=new THREE.Vector3(...(action.endOffset??[0,0,0]));
          const drive=action.tool?driveProgress(p):smooth(p);
          const near=action.tool?new THREE.Vector3(...action.axis).multiplyScalar(-action.tool.driveDistance):null;
          const offset=action.tool?(p<.25?start.lerp(near,smooth(p/.25)):near.lerp(end,drive)):start.lerp(end,drive);
          state.position.set(...item.home).add(offset);
          const base=new THREE.Quaternion().setFromEuler(new THREE.Euler(...item.rotation));
          const tilted=base.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...(action.startRotation??[0,0,0]))));
          state.quaternion.slerpQuaternions(tilted,base,smooth(p));
          if(action.turns)state.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...action.axis).normalize(),action.turns*Math.PI*2*drive));
        }
      }
    });
  }
  const groupQuaternion=poseQuaternion(before).slerp(poseQuaternion(pose),finished?1:smooth(clamp(progress/.2)));
  return {states,groupQuaternion};
}

export const driveProgress=p=>smooth(clamp((p-.25)/.6));

export function actionAt(manual,stepIndex,progress){
  const step=manual.steps[stepIndex],changing=stepIndex>0&&manual.steps[stepIndex-1].pose!==step.pose;
  const total=changing?clamp((progress-.2)/.8):progress;
  const index=Math.min(step.actions.length-1,Math.floor(total*step.actions.length));
  return {action:step.actions[index],index,progress:clamp(total*step.actions.length-index),preparing:changing&&progress<.2};
}
