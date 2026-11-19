import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {frameAt} from './motion.js';
import {toolAt} from './tool-motion.js';

const manual=JSON.parse(fs.readFileSync('public/manifest.json'));
const binary=fs.readFileSync(`public/${manual.toolAssets.file}`);
// Browser QA checks actual images. Node checks these same GLB bytes without a DOM image decoder.
const loader=new GLTFLoader().register(()=>({name:'GeometryOnly',loadTexture:()=>Promise.resolve(null)}));
const gltf=await loader.parseAsync(binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength),'');
assert.deepEqual(manual.toolAssets.items.map(t=>t.id).sort(),['awl','screwdriver']);
for(const t of manual.toolAssets.items){
  const object=gltf.scene.getObjectByName(t.nodeName);assert.ok(object,t.id);
  const bounds=new THREE.Box3().setFromObject(object);
  assert.ok(bounds.min.y>=-.0001&&bounds.min.y<=.0001,t.id+' actual tip at local origin');
  assert.ok(bounds.max.y>.1&&bounds.max.y<.25,t.id+' handle lies behind tip on +Y');
}
assert.equal(manual.instances.length,23,'hand tools are not product components');
for(const i of [0,1,6])assert.equal(toolAt(manual,i,.5,frameAt(manual,i,.5)),null,'manual-only steps use no powered or hand tool');
for(const i of [2,4]){
  for(const p of [.4,.8]){
    const frame=frameAt(manual,i,p),tool=toolAt(manual,i,p,frame);
    assert.equal(tool.id,'awl');assert.ok(tool.visible&&tool.engaged);
    assert.ok(tool.position.distanceTo(tool.contact)<1e-9);
    const worldTip=tool.position.clone().applyQuaternion(frame.groupQuaternion);
    const worldOut=tool.outward.clone().applyQuaternion(frame.groupQuaternion);
    assert.ok(worldTip.y<0&&worldOut.y>.999,'awl points down onto lower upward-facing leg');
    assert.ok(Math.abs(Math.abs(tool.contact.z)-.225)<1e-6,'tip contacts leg, not template mid-plane');
  }
}
for(const i of [3,5,7]){
  const step=manual.steps[i];
  for(let n=0;n<step.actions.length;n++){
    const action=step.actions[n];if(!action.tool)continue;
    assert.equal(action.targets.length,1,'one screwdriver operates one fastener at a time');
    for(const local of [.1,.5,.95]){
      const p=(n+local)/step.actions.length,frame=frameAt(manual,i,p),tool=toolAt(manual,i,p,frame);
      assert.equal(tool.id,'screwdriver');assert.ok(tool.visible);
      const screw=frame.states.get(action.targets[0]),axis=new THREE.Vector3(...action.axis);
      const socket=screw.position.clone().addScaledVector(axis,action.tool.tipOffset);
      assert.ok(tool.contact.distanceTo(socket)<1e-9,'tool tracks actual moving drive socket');
      assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(tool.quaternion).dot(axis)<-.999,'handle extends away from fastener');
      assert.equal(tool.engaged,local===.5);
      assert.ok(local===.5?tool.position.distanceTo(socket)<1e-9:tool.position.distanceTo(socket)>.001);
    }
  }
}
console.log('PASS: actual hand-tool geometry, tip origins, source-correct steps, lower-face marking, socket contact, sequential screwdriver operation and withdrawal.');
