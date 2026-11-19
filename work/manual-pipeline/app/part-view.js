import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';

const base=import.meta.env.BASE_URL+'aholo/';
const detailViews={
  screwdriver:{tip:{label:'十字刀头',point:[0,.0012,0],direction:[.37,-1,.31],up:[.25,0,1],width:.0095}},
  awl:{tip:{label:'锥尖',point:[0,.003,0],direction:[.65,-.30,1],up:[0,1,0],width:.016}},
  hammer:{
    head:{label:'锤头',point:[-.002,.235,0],direction:[.74,-.22,1],up:[0,1,0],width:.137},
    claw:{label:'拔钉爪',point:[-.041,.231,0],direction:[-1,.45,.22],up:[0,1,0],width:.105}
  },
  '120938':{
    front:{label:'正视',direction:[0,0,1],up:[-1,0,0]},
    tip:{label:'定位孔',direction:[.1,.16,1],up:[-1,0,0],width:.027}
  }
};
let sources,active,renderer,studioReady,camera,orbit,object,span,center,fullBounds,frame,mode;
const scene=new THREE.Scene(),subject=new THREE.Group(),loader=new GLTFLoader();
const resize=new ResizeObserver(draw);

export async function setupPartViews(manual){
  sources=await (await fetch(base+'previews/sources.json')).json();
  detailViews['120938'].tip.point=manual.geometryEvidence.toolContactAnchors.templateLocalMarkHole;
  for(const event of ['pointerover','pointerdown','focusin']){
    document.addEventListener(event,e=>{
      const surface=e.target.closest('.part-surface');
      if(surface)activatePartView(surface.closest('.part-view'));
    },true);
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest('.part-view [data-view]');
    if(!button)return;
    activatePartView(button.closest('.part-view'));
    setMode(button.dataset.view);
  });
  document.addEventListener('keydown',e=>{
    if(!e.target.matches('.part-surface')||!active||!orbit)return;
    switch(e.key){
      case 'ArrowLeft':orbit.rotateLeft(.20);break;
      case 'ArrowRight':orbit.rotateLeft(-.20);break;
      case 'ArrowUp':orbit.rotateUp(.20);break;
      case 'ArrowDown':orbit.rotateUp(-.20);break;
      case '+':case '=':orbit.dollyIn(.8);break;
      case '-':orbit.dollyOut(.8);break;
      case 'Home':setMode('full');break;
      default:return;
    }
    e.preventDefault();
  });
}

export function partView(item){
  const detail=detailViews[item.id];
  return `<div class="part-view" data-part="${item.id}" data-model="${sources[item.id].file}">
    <div class="part-surface" tabindex="0" role="group" aria-label="${item.name}三维外形，拖动或用方向键旋转，加减键缩放">
      <img src="${base}previews/${item.id}.png" alt="${item.name}外形" loading="lazy" draggable="false">
    </div>
    <div class="part-tools">${detail?`<div class="part-preset"><button type="button" data-view="full" aria-pressed="true">全貌</button>${Object.entries(detail).map(([key,view])=>`<button type="button" data-view="${key}" aria-pressed="false">${view.label}</button>`).join('')}</div>`:''}<span class="part-hint">拖动旋转 · 滚轮或双指缩放</span></div>
  </div>`;
}

function initRenderer(){
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.toneMapping=THREE.AgXToneMapping;
  studioReady=new HDRLoader().loadAsync(base+'studio.hdr').then(texture=>{
    texture.mapping=THREE.EquirectangularReflectionMapping;
    const pmrem=new THREE.PMREMGenerator(renderer);
    scene.environment=pmrem.fromEquirectangular(texture).texture;
    texture.dispose();pmrem.dispose();
  });
  scene.add(subject);
}

function release(model){
  const geometries=new Set(),materials=new Set(),textures=new Set();
  model.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of [].concat(o.material))materials.add(m);}});
  for(const m of materials){for(const t of Object.values(m))if(t?.isTexture)textures.add(t);m.dispose();}
  for(const g of geometries)g.dispose();
  for(const t of textures){t.dispose();t.source.data?.close?.();}
}

export function closePartView(container){
  if(!active||!container.contains(active))return;
  resize.disconnect();orbit.dispose();renderer.domElement.remove();
  if(object){subject.remove(object);release(object);object=null;}
  active.removeAttribute('data-state');
  for(const b of active.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',b.dataset.view==='full');
  active=null;
}

export async function activatePartView(card){
  if(active===card)return;
  if(active)closePartView(active);
  if(!renderer)initRenderer();
  active=card;mode='full';frame={width:1,height:1};
  const surface=card.querySelector('.part-surface'),source=sources[card.dataset.part];
  camera=new THREE.OrthographicCamera(-1,1,1,-1,.001,100);
  camera.up.fromArray(source.cameraUp);
  camera.position.fromArray(source.cameraDirection).normalize().multiplyScalar(3);
  orbit=orbitFor(surface);
  setStudio(source);
  surface.append(renderer.domElement);resize.observe(surface);card.dataset.state='loading';
  const loadingCamera=camera;
  try{
    const [gltf]=await Promise.all([loader.loadAsync(base+source.file),studioReady]);
    if(active!==card||camera!==loadingCamera||!card.isConnected){release(gltf.scene);return;}
    object=gltf.scene;
    const box=new THREE.Box3().setFromObject(object,true);
    center=new THREE.Vector3().fromArray(source.projectionCenter);
    const size=box.getSize(new THREE.Vector3());span=Math.max(size.x,size.y,size.z);
    subject.add(object);subject.scale.setScalar(1/span);subject.position.copy(center).multiplyScalar(-1/span);
    const width=source.orthoScale/span;
    fullBounds={width,height:width*680/960};
    frame=fullBounds;
    if(mode!=='full')setMode(mode);
    card.dataset.state='ready';draw();
  }catch(error){
    if(active===card&&camera===loadingCamera){card.dataset.state='error';card.querySelector('.part-hint').textContent='模型加载失败，当前显示外形图';}
    console.error(error);
  }
}

function setMode(next){
  mode=next;
  for(const b of active.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',b.dataset.view===mode);
  if(!object)return;
  const source=sources[active.dataset.part],detail=detailViews[active.dataset.part]?.[next];
  const target=detail?.point?new THREE.Vector3().fromArray(detail.point).sub(center).divideScalar(span):new THREE.Vector3();
  frame=fullBounds;
  if(detail)frame=detail.width?{width:detail.width/span,height:detail.width/span*.68}:{width:1.14,height:.23};
  camera.up.fromArray(detail?.up??source.cameraUp);
  camera.position.fromArray(detail?.direction??source.cameraDirection).normalize().multiplyScalar(3).add(target);
  camera.zoom=1;
  // OrbitControls caches the camera's up axis at construction. End-on tool views use a different up axis.
  orbit.dispose();orbit=orbitFor(active.querySelector('.part-surface'));
  orbit.target.copy(target);orbit.update();
  setStudio(source);draw();
}

function setStudio(source){
  const yaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),source.studioYaw);
  scene.environmentRotation.setFromQuaternion(camera.quaternion.clone().multiply(yaw));
  renderer.toneMappingExposure=source.studioExposure;
}

function orbitFor(surface){
  const controls=new OrbitControls(camera,surface);
  controls.minZoom=.45;controls.maxZoom=30;controls.addEventListener('change',draw);
  return controls;
}

function draw(){
  if(!active||!object)return;
  const surface=active.querySelector('.part-surface'),w=surface.clientWidth,h=surface.clientHeight;
  if(!w||!h)return;
  const aspect=w/h,half=Math.max(frame.height,frame.width/aspect)/2;
  camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
  camera.updateProjectionMatrix();
  const ratio=renderer.getPixelRatio();
  if(renderer.domElement.width!==Math.floor(w*ratio)||renderer.domElement.height!==Math.floor(h*ratio))renderer.setSize(w,h,false);
  renderer.render(scene,camera);
}
