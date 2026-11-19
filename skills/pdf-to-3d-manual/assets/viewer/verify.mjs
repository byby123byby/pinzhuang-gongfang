import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {frameAt,poseQuaternion} from './motion.js';

const manual=JSON.parse(fs.readFileSync('public/manifest.json'));
const binary=fs.readFileSync('public/lack.glb');
const gltf=await new GLTFLoader().parseAsync(binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength),'');
assert.equal(manual.instances.length,23);
assert.equal(manual.steps.length,8);
assert.equal(manual.partTypes.filter(p=>!p.isTool).reduce((n,p)=>n+p.quantity,0),22);
for(const i of manual.instances){const node=gltf.scene.getObjectByName(i.nodeName);assert.ok(node,i.id);assert.ok(node.position.distanceTo(new THREE.Vector3(...i.home))<1e-6,i.id+' exported pose');}
// Counts are independently read from the PDF inventory and each numbered step.
const expected=[5,9,9,13,13,17,18,22];
for(let i=0;i<8;i++){
  const frame=frameAt(manual,i,1);assert.equal([...frame.states.values()].filter(s=>s.installed).length,expected[i]);
  assert.ok(frame.groupQuaternion.angleTo(poseQuaternion(manual.steps[i].pose))<1e-6);
  assert.equal(frame.states.get('template-1').visible,false);
  for(const [id,state] of frame.states)if(state.installed)assert.ok(state.position.distanceTo(new THREE.Vector3(...manual.instances.find(p=>p.id===id).home))<1e-9);
  for(const t of [0,.1,.2,.5,.8,.99,1])for(const state of frameAt(manual,i,t).states.values())assert.ok([...state.position,...state.quaternion].every(Number.isFinite));
}
for(const i of [2,4]){assert.equal(frameAt(manual,i,.55).states.get('template-1').visible,true);assert.equal(frameAt(manual,i,1).states.get('template-1').installed,false);}
// PDF pages5–7 place the pair being marked/fastened below the opposite pair, with the inner face up.
for(const i of [2,4]){
  const frame=frameAt(manual,i,.4),mark=manual.steps[i].actions[0];
  for(const place of mark.placements){
    assert.ok(new THREE.Vector3(...place).applyQuaternion(frame.groupQuaternion).y<0,'working pair must be the lower pair');
    assert.ok(new THREE.Vector3(0,0,-Math.sign(place[2])).applyQuaternion(frame.groupQuaternion).y>.999,'marking face points up');
  }
}
for(const i of [3,5]){
  const action=manual.steps[i].actions.find(a=>a.turns>0),frame=frameAt(manual,i,.8);
  assert.ok(new THREE.Vector3(...action.axis).applyQuaternion(frame.groupQuaternion).y<-.999,'long screw inserts downward into lower leg');
}
const final=frameAt(manual,7,1,true);assert.equal([...final.states.values()].filter(s=>s.visible).length,22);assert.ok(final.groupQuaternion.angleTo(new THREE.Quaternion())<1e-6);
const rightHanded=frameAt(manual,0,.2).states.get('dowel-1').quaternion;assert.ok(rightHanded.y>0,'right-handed rotation follows insertion +Y axis');
const prior=frameAt(manual,3,.5);frameAt(manual,7,1);assert.deepEqual(frameAt(manual,3,.5),prior,'revisit earlier step after completion restores its exact state');
console.log('PASS: actual23-nodeGLB;8PDFsteps;22permanentparts;repeatabletemplate;poseendpoints;finiteanimations;right-handedrotation;deterministicrewind;PDFworkingfaceup.');
