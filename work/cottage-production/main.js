import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { flatten, makeBoards, printedMaterial, projectUV, MODEL_X, BOARD_X } from './board.js';
import { assemblyPose, partLocation } from './motion.js';
import spec from './assembly-spec.json';

const get=id=>document.getElementById(id), {parts}=spec;
const viewport=get('viewport'), entries=[];
let step=0,progress=0,playing=false,auto=false,preview=false,activeBoard='A',exploded=false,joints=false;
let boards,renderer,orbit,lastTime=null,finishedAt=null;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#b5d1e1');
const camera=new THREE.OrthographicCamera(-.36,.36,.25,-.25,.001,3);
scene.add(new THREE.HemisphereLight('#fff7e3','#b5cbd8',1.7));
const sun=new THREE.DirectionalLight('#fff8ec',2.1);sun.position.set(-.3,.6,.25);sun.castShadow=true;
Object.assign(sun.shadow.camera,{left:-.55,right:.55,top:.45,bottom:-.45,near:.05,far:1.5});
sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00008;sun.shadow.normalBias=.00015;scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(3,3),new THREE.MeshBasicMaterial({color:'#b5d1e1'}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.002;floor.receiveShadow=false;scene.add(floor);
const shadowFloor=new THREE.Mesh(new THREE.PlaneGeometry(3,3),new THREE.ShadowMaterial({opacity:.12}));shadowFloor.rotation.x=-Math.PI/2;shadowFloor.position.y=-.0019;shadowFloor.receiveShadow=true;scene.add(shadowFloor);
const mat=new THREE.Mesh(new THREE.BoxGeometry(.206,.002,.183),new THREE.MeshStandardMaterial({color:'#f5e9cb',roughness:1}));
mat.position.set(MODEL_X+.023,0,.008);mat.receiveShadow=true;mat.castShadow=true;scene.add(mat);
const border=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.202,.0001,.179)),new THREE.LineBasicMaterial({color:'#3569a7'}));border.position.copy(mat.position);border.position.y=.0011;scene.add(border);
const blueprint=new THREE.Group();scene.add(blueprint);

const stepButtons=parts.map((part,index)=>{
  const b=document.createElement('button');b.className='part-step';b.disabled=true;
  b.innerHTML=`<span>${part.boardLabel ?? part.id}</span><strong>${part.name}</strong><i></i>`;
  b.addEventListener('click',()=>openStep(index));get('step-list').append(b);return b;
});

function resetView(focus=false){
  const target=focus ? new THREE.Vector3(MODEL_X+.023,.043,.008) : new THREE.Vector3(-.02,.018,.012);
  orbit.target.copy(target);camera.position.copy(target).add(focus?new THREE.Vector3(.17,.16,.29):new THREE.Vector3(.065,.43,.48));
  camera.zoom=focus?2.7:(viewport.clientWidth<570?1:1.18);camera.updateProjectionMatrix();orbit.update();
}
function frameHouse(){
  const bounds=new THREE.Box3();
  const viewRotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(.48,.31,1),new THREE.Vector3(),camera.up));
  const toView=viewRotation.clone().invert();
  for(const entry of entries){
    for(const mesh of entry.surfaces){
      mesh.updateWorldMatrix(true,false);
      mesh.geometry.computeBoundingBox();
      const {min,max}=mesh.geometry.boundingBox;
      for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){
        bounds.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld).applyQuaternion(toView));
      }
    }
  }
  const size=bounds.getSize(new THREE.Vector3());
  orbit.target.copy(bounds.getCenter(new THREE.Vector3()).applyQuaternion(viewRotation));
  camera.position.copy(orbit.target).add(new THREE.Vector3(0,0,.68).applyQuaternion(viewRotation));
  camera.zoom=Math.min((camera.right-camera.left)/size.x,(camera.top-camera.bottom)/size.y)*.81;
  camera.updateProjectionMatrix();orbit.update();
}
function showHouse(){
  preview=true;playing=false;exploded=false;joints=false;
  refresh();resize();
}
function resize(){
  const w=viewport.clientWidth,h=viewport.clientHeight,aspect=w/h;
  const hh=Math.max(.19,.33/aspect);camera.left=-hh*aspect;camera.right=hh*aspect;camera.top=hh;camera.bottom=-hh;camera.updateProjectionMatrix();renderer.setSize(w,h,false);if(preview)frameHouse();
}
function prepare(part,model){
  const object=model.getObjectByName(part.id),surfaces=[];
  const color=/roof/i.test(part.kind)?'#cd653d':/door|window|sign|vane|gate/.test(part.kind)?'#1d5d9e':/base|deck|step/i.test(part.kind)?'#eedbb3':'#fbefd2';
  const authored=object.material?.map;
  const material=authored?object.material.clone():printedMaterial(part.kind,color);
  object.traverse(mesh=>{if(mesh.isMesh){if(!authored)projectUV(mesh,part.flatNormal);mesh.material=material;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.part=part.id;surfaces.push(mesh);}});
  const home=object.position.clone().add(new THREE.Vector3(MODEL_X,.0012,0));
  const homeQuaternion=object.quaternion.clone();
  const approach=new THREE.Vector3(part.approach[0],part.approach[2],-part.approach[1]).multiplyScalar(.001);
  const e={part,object,home,homeQuaternion,approach,surfaces,material};flatten(e);
  const ghost=object.clone();ghost.position.copy(home);
  ghost.traverse(m=>{if(m.isMesh){m.material=new THREE.MeshBasicMaterial({color:'#336fa9',transparent:true,opacity:.018,depthWrite:false});m.castShadow=false;m.receiveShadow=false;m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,30),new THREE.LineBasicMaterial({color:'#245aa5',transparent:true,opacity:.16})));}});
  blueprint.add(ghost);e.ghost=ghost;
  return e;
}
function markAssembled(){
  const event=new CustomEvent('academy:step-complete',{cancelable:true,detail:{id:'cottage',step,total:parts.length}});
  if(!window.dispatchEvent(event))playing=false;
  if(step===parts.length-1&&!preview)showHouse();
}
function openStep(index){
  if(preview)resetView();
  step=index;progress=0;playing=false;preview=false;finishedAt=null;exploded=false;
  activeBoard=parts[step].board;refresh();
}
function refresh(){
  const part=parts[step];
  viewport.closest('.workspace').classList.toggle('is-finished',preview);
  mat.visible=border.visible=!preview;
  get('part-label').textContent=preview?'完成图':part.boardLabel;
  get('preview').querySelector('span').textContent=preview?'返回装配':'成品预览';
  document.querySelector('.paper-note').textContent=preview?'小屋全貌':'找到这一片';
  updatePartIllustration(part);
  get('step-title').textContent=preview?'海边小屋 · 完整套件':part.name;
  get('instruction').textContent=preview?'旋转查看主屋、侧屋与小院。返回装配后继续原来的步骤。':part.instruction;
  const done=preview?parts.length:step+(progress===1?1:0);
  get('overall').textContent=`${String(done).padStart(2,'0')} / ${parts.length}`;
  get('overall-bar').style.width=`${done/parts.length*100}%`;
  get('play').textContent=playing?'暂停':preview?'开始装配':progress===1?(step===parts.length-1?'重新拼装':'装配下一件'):'装配这一件';
  get('previous').disabled=step===0||preview;get('next').disabled=step===parts.length-1||preview;
  get('progress').disabled=preview;get('progress').value=Math.round(progress*100);
  get('progress-label').textContent=preview?'—':`${Math.round(progress*100)}%`;
  get('phase').textContent=preview?'整套 · 完整模型':progress===0?'在板上找这一件':progress<.18?'① 从板上取出':progress<.65?'② 移动与转向':progress<1?'③ 对位装入':'已装入 · 可以继续';
  get('preview').setAttribute('aria-pressed',preview);get('explode').setAttribute('aria-pressed',exploded);get('joints').setAttribute('aria-pressed',joints);
  get('auto').setAttribute('aria-pressed',auto);
  for(const code of ['A','B','C']){
    const b=get(`board-${code}`);b.setAttribute('aria-selected',code===activeBoard);
    const remain=boards[code].list.filter(e=>parts.indexOf(e.part)>=done).length;
    b.querySelector('small').textContent=`${remain} / ${boards[code].list.length} 件`;
    boards[code].group.visible=!preview&&code===activeBoard;
  }
  stepButtons.forEach((b,i)=>{b.setAttribute('aria-current',!preview&&i===step?'step':'false');b.classList.toggle('done',i<done);});
  updateObjects();
}
function updatePartIllustration(part){
  const svg=get('part-preview'),key=preview?'complete':part.id;
  if(svg.dataset.part===key)return;
  svg.dataset.part=key;
  const path=svg.querySelector('path');
  if(preview){path.setAttribute('d','M38 58 100 15l62 43v51H38Z M38 58h124 M83 109V75h32v34 M51 69h19v19H51Z M130 69h19v19h-19Z');path.style.fill='#efdfbc';return;}
  const points=entries.find(e=>e.part.id===part.id).flat.outline;
  const xs=points.map(p=>p[0]),ys=points.map(p=>-p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min(142/(maxX-minX),77/(maxY-minY));
  const cx=(maxX+minX)/2,cy=(maxY+minY)/2;
  path.setAttribute('d',points.map((p,i)=>`${i?'L':'M'}${100+(p[0]-cx)*scale},${64+(-p[1]-cy)*scale}`).join(' ')+'Z');
  path.style.fill=/roof/i.test(part.kind)?'#dc936d':/door|window|sign|vane|gate/.test(part.kind)?'#6b96b8':'#efdfbc';
}
function updateObjects(){
  entries.forEach((e,index)=>{
    const location=partLocation(index,step,progress,preview,activeBoard,e.part.board);
    e.object.visible=location!=='hidden';e.ghost.visible=!preview&&index>=step;
    if(location==='assembled'){
      e.object.position.copy(e.home);e.object.quaternion.copy(e.homeQuaternion);
      if(exploded)e.object.position.add(new THREE.Vector3((e.home.x-MODEL_X)*.45,.022+index*.0005,e.home.z*.45));
    } else if(location==='moving'){
      const pose=assemblyPose(e,progress);e.object.position.copy(pose.position);e.object.quaternion.copy(pose.quaternion);
    } else {e.object.position.copy(e.trayPosition);e.object.quaternion.copy(e.trayQuaternion);}
    const ghost=joints&&location==='assembled'&&index!==step;
    if(e.material.transparent!==ghost){e.material.transparent=ghost;e.material.depthWrite=!ghost;e.material.needsUpdate=true;}
    e.material.opacity=ghost?.18:1;
    e.material.emissive.set(!preview&&index===step?'#4b6c95':'#000000');e.material.emissiveIntensity=.18;
  });
}
function wireControls(){
  for(const code of ['A','B','C'])get(`board-${code}`).addEventListener('click',()=>{activeBoard=code;refresh();});
  get('play').addEventListener('click',()=>{
    if(preview){openStep(0);} else if(progress===1){openStep(step+1<parts.length?step+1:0);}
    activeBoard=parts[step].board;playing=!playing;finishedAt=null;refresh();
  });
  get('previous').addEventListener('click',()=>openStep(step-1));get('next').addEventListener('click',()=>openStep(step+1));
  get('progress').addEventListener('input',e=>{progress=Number(e.target.value)/100;playing=false;activeBoard=parts[step].board;refresh();if(progress===1&&!preview)markAssembled();});
  get('auto').addEventListener('click',()=>{auto=!auto;refresh();});
  get('preview').addEventListener('click',()=>{if(!preview){showHouse();return}preview=false;resetView();refresh();});
  get('explode').addEventListener('click',()=>{exploded=!exploded;playing=false;refresh();});
  get('joints').addEventListener('click',()=>{joints=!joints;refresh();});
  get('reset').addEventListener('click',()=>{exploded=false;joints=false;if(preview)frameHouse();else resetView();refresh();});
  get('focus').addEventListener('click',()=>preview?frameHouse():resetView(true));
  get('restart').addEventListener('click',()=>{auto=false;openStep(0);resetView();});
  const ray=new THREE.Raycaster();let down;
  renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(preview||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
    const box=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1),camera);
    const hit=ray.intersectObjects(entries.filter(x=>x.object.visible).flatMap(x=>x.surfaces),false)[0];
    if(hit){openStep(parts.findIndex(p=>p.id===hit.object.userData.part));}
  });
}
function render(time){
  const elapsed=lastTime===null?0:Math.min(time-lastTime,60);lastTime=time;
  if(playing&&progress<1){progress=Math.min(1,progress+elapsed/3200);if(progress===1){finishedAt=time;markAssembled()}refresh();}
  else if(playing&&progress===1){
    if(!auto||step===parts.length-1){playing=false;refresh();}
    else if(time-finishedAt>600){openStep(step+1);playing=true;refresh();}
  }
  orbit.update();renderer.render(scene,camera);
}
async function start(){
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;
  viewport.prepend(renderer.domElement);orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.enablePan=true;orbit.maxPolarAngle=Math.PI*.47;orbit.minZoom=.6;orbit.maxZoom=12;
  resetView();new ResizeObserver(resize).observe(viewport);
  const gltf=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}cottage.glb`);scene.add(gltf.scene);gltf.scene.updateMatrixWorld(true);
  entries.push(...parts.map(p=>prepare(p,gltf.scene)));boards=makeBoards(entries);Object.values(boards).forEach(b=>scene.add(b.group));
  wireControls();
  window.addEventListener('academy:inspect-finished',showHouse);
  const query=new URLSearchParams(location.search),resume=Number(query.get('resume'));
  if(query.get('view')==='finished')window.dispatchEvent(new Event('academy:inspect-finished'));
  if(Number.isInteger(resume)&&resume>=1&&resume<=parts.length)openStep(resume-1);
  stepButtons.forEach(b=>b.disabled=false);document.querySelectorAll('[data-loading]').forEach(b=>b.disabled=false);get('load-message').hidden=true;viewport.setAttribute('aria-busy','false');refresh();renderer.setAnimationLoop(render);
}
start().catch(e=>{console.error(e);get('load-message').textContent='模型加载失败，请使用随附启动器打开。';});
