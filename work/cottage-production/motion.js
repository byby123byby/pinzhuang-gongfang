import * as THREE from 'three';
const smooth = t => t*t*(3-2*t);

export function assemblyPose(entry, progress) {
  const start=entry.trayPosition, home=entry.home;
  const highStart=start.clone();highStart.y=.115;
  const highEnd=home.clone().add(entry.approach);highEnd.y=.115;
  const approach=home.clone().add(entry.approach);
  const pose={position:new THREE.Vector3(),quaternion:entry.homeQuaternion.clone()};
  if(progress<.18) {
    pose.position.lerpVectors(start,highStart,smooth(progress/.18));
    pose.quaternion.copy(entry.trayQuaternion);
  } else if(progress<.65) {
    const t=smooth((progress-.18)/.47);
    pose.position.lerpVectors(highStart,highEnd,t);
    pose.quaternion.slerpQuaternions(entry.trayQuaternion,entry.homeQuaternion,t);
  } else if(progress<.82) {
    pose.position.lerpVectors(highEnd,approach,smooth((progress-.65)/.17));
  } else pose.position.lerpVectors(approach,home,smooth((progress-.82)/.18));
  return pose;
}

export function partLocation(index,step,progress,preview,activeBoard,partBoard) {
  if(preview || index<step || (index===step && progress===1))return 'assembled';
  if(index===step && progress>0)return 'moving';
  return activeBoard===partBoard ? 'tray' : 'hidden';
}
