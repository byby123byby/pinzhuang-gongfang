import * as THREE from 'three';
import {driveProgress} from './motion.js';

// A flat ink silhouette keeps the contact point visible in the close-up camera.
export function handSprite(pose) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  const support = pose === 'support';
  const grip = pose === 'grip';
  const outline = grip
    ? 'M124 32 L88 27 Q75 18 61 20 L30 24 Q23 25 24 30 Q24 34 31 35 L54 33 L22 37 Q16 38 17 43 Q18 47 24 47 L52 44 L25 49 Q19 51 21 56 Q23 60 30 58 L54 54 L35 61 Q30 64 33 68 Q35 72 41 70 L64 64 Q75 75 91 68 L124 73 Z'
    : support
    ? 'M124 53 Q105 54 90 48 L76 38 Q69 33 63 38 Q59 43 67 49 L79 56 L62 58 L26 43 Q18 40 16 45 Q14 49 22 54 L48 68 L12 52 Q5 50 5 55 Q4 60 12 64 L55 85 Q68 91 85 87 L124 81 Z'
    : 'M125 37 L95 28 Q83 19 70 17 L44 15 Q37 14 31 19 L9 38 Q4 43 8 47 Q12 51 18 47 L38 33 L57 34 L64 44 L47 50 L24 46 Q16 44 15 51 Q15 56 22 59 L45 68 Q53 71 59 68 L67 66 Q75 78 83 75 Q88 82 98 78 L125 79 Z';
  ctx.fillStyle = '#fff5de';
  ctx.strokeStyle = '#264f61';
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  const path = new Path2D(outline);
  ctx.fill(path);
  ctx.stroke(path);
  ctx.stroke(new Path2D(grip ? 'M62 29 Q56 38 59 47 Q63 54 72 55' : support ? 'M48 68L63 74 M67 49L79 56' : 'M67 66 Q76 65 79 58 M83 75 Q89 71 91 64 M44 21 Q38 23 33 29'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const hand = new THREE.Sprite(new THREE.SpriteMaterial({map:texture, transparent:true, opacity:.77, depthTest:false, depthWrite:false}));
  hand.center.set(.12, support ? .42 : .48);
  hand.renderOrder = 5;
  return hand;
}

export function createGestures() {
  const group = new THREE.Group();
  const ink = new THREE.MeshBasicMaterial({color:'#ac4729', side:THREE.DoubleSide, depthTest:false, depthWrite:false});
  const arrow = new THREE.Group();
  const arc = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 72, 1, 0, Math.PI*1.52), ink);
  const angle = Math.PI*1.52;
  const tip = new THREE.Shape();
  tip.moveTo(.65,0); tip.lineTo(1.2,0); tip.lineTo(.92,.49); tip.closePath();
  const head = new THREE.Mesh(new THREE.ShapeGeometry(tip), ink);
  head.rotation.z = angle;
  arrow.add(arc, head);
  const straight = new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(), .09, '#ac4729', .021, .014);
  for (const part of [straight.line, straight.cone]) {
    part.material = part.material.clone();
    part.material.depthTest = false;
    part.material.depthWrite = false;
  }
  const pinch = handSprite('pinch'), grip = handSprite('grip'), palm = handSprite('support');
  group.add(arrow, straight, pinch, grip, palm);
  group.traverse(o=>{o.renderOrder=4;});
  pinch.renderOrder=grip.renderOrder=palm.renderOrder=5;
  const normal = new THREE.Vector3(0,0,1);
  function update(step, clock, frame, complete, home) {
    const a = clock.action, state = frame.states.get(a.targets[0]);
    group.visible = !complete && !clock.preparing && state.visible;
    if (!group.visible) return;
    const fastening = a.turns > 0;
    arrow.visible = fastening;
    pinch.visible = step === 0;
    grip.visible = step === 1;
    palm.visible = step === 6;
    straight.visible = palm.visible;
    const phase = clock.progress;
    if (fastening) {
      const radius = step === 1 ? .054 : a.tool ? .018 : .022;
      const axis = new THREE.Vector3(...a.axis);
      arrow.position.copy(state.position);
      if (step === 1) arrow.position.y += .13;
      arrow.scale.setScalar(radius);
      arrow.quaternion.setFromUnitVectors(normal,axis);
      const twist = (a.tool ? driveProgress(phase) : phase*phase*(3-2*phase)) * a.turns * Math.PI*2;
      arrow.rotateZ(.63 + twist);
      const hand = step === 1 ? grip : pinch;
      hand.position.copy(arrow.position);
      hand.scale.set(radius*2.9,radius*2.18,1);
      hand.material.rotation = .22*Math.sin(twist);
    }
    if (palm.visible) {
      const edge = new THREE.Vector3(.30,0,.214);
      palm.position.copy(edge).applyQuaternion(state.quaternion).add(state.position);
      palm.scale.set(.14,.105,1);
      palm.material.rotation = -.20 + .22*phase;
      const destination = edge.add(new THREE.Vector3(...home));
      const delta = destination.sub(palm.position);
      straight.visible = delta.length() > .005;
      if (straight.visible) {
        straight.position.copy(palm.position);
        straight.setDirection(delta.clone().normalize());
        const len=Math.min(.115,delta.length());
        straight.setLength(len, len*.28, len*.19);
      }
    }
  }
  return {group, update, grip, palm};
}
