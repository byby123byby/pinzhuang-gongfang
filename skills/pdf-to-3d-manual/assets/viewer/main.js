import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {frameAt,poseQuaternion,actionAt} from './motion.js';
import {toolAt} from './tool-motion.js';

const $=id=>document.getElementById(id), base=import.meta.env.BASE_URL;
let manual,root,renderer,detailRenderer,camera,detailCamera,orbit,step=0,progress=0,playing=false,auto=false,finished=false,xray=false,detail=true,lastTime=0,endedAt=0,picked=null,pickedPoint=null,partCount,toolEnabled=true,expandedRenderer,expandedCamera,expandedOrbit,expandedEnvironment;
const scene=new THREE.Scene(),entries=new Map(),stepButtons=[],toolMeshes=new Map();
const detailFocus=new THREE.Vector3(),expandedFocus=new THREE.Vector3();
scene.background=new THREE.Color('#b5d1e1');
scene.add(new THREE.HemisphereLight('#fff8ec','#b5cbd8',2.2));
const key=new THREE.DirectionalLight('#fff7e4',2.4);key.position.set(1,2,1);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-1.6,right:1.6,top:1.6,bottom:-1.6,near:.1,far:6});key.shadow.normalBias=.001;scene.add(key);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(15,15),new THREE.ShadowMaterial({opacity:.1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.003;ground.receiveShadow=true;scene.add(ground);
const padShape=new THREE.Shape();padShape.moveTo(-.49,-.54);padShape.lineTo(.49,-.54);padShape.quadraticCurveTo(.54,-.54,.54,-.49);padShape.lineTo(.54,.49);padShape.quadraticCurveTo(.54,.54,.49,.54);padShape.lineTo(-.49,.54);padShape.quadraticCurveTo(-.54,.54,-.54,.49);padShape.lineTo(-.54,-.49);padShape.quadraticCurveTo(-.54,-.54,-.49,-.54);
const protectivePad=new THREE.Mesh(new THREE.ShapeGeometry(padShape,12),new THREE.MeshStandardMaterial({color:'#f6f0e1',roughness:1}));protectivePad.rotation.x=-Math.PI/2;protectivePad.position.y=-.001;protectivePad.receiveShadow=true;scene.add(protectivePad);
const boxCorners=[],environmentMaps=[];
const markDot=new THREE.Mesh(new THREE.SphereGeometry(.0006,16,12),new THREE.MeshBasicMaterial({color:'#c66743'}));

async function start(){
  manual=await (await fetch(`${base}manifest.json`)).json();
  validateInput(manual);
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.NeutralToneMapping;$('stage').prepend(renderer.domElement);
  detailRenderer=new THREE.WebGLRenderer({antialias:true});detailRenderer.setPixelRatio(Math.min(devicePixelRatio,2));detailRenderer.toneMapping=THREE.NeutralToneMapping;$('detail-view').append(detailRenderer.domElement);
  for(const view of [renderer,detailRenderer])environmentMaps.push(createEnvironment(view));
  scene.environmentIntensity=.65;
  camera=new THREE.PerspectiveCamera(35,1,.001,30);detailCamera=new THREE.PerspectiveCamera(28,1,.001,10);
  orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=.07;orbit.maxDistance=4;orbit.maxPolarAngle=Math.PI*.94;
  const gltf=await new GLTFLoader().loadAsync(`${base}${manual.modelFile}`);root=gltf.scene;scene.add(root);
  const initialBounds=new THREE.Box3();
  for(const item of manual.instances){
    const object=root.getObjectByName(item.nodeName),materials=[];
    if(!object)throw Error(`模型缺少零件：${item.nodeName}`);
    object.traverse(mesh=>{if(mesh.isMesh){mesh.material=mesh.material.clone();mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.instanceId=item.id;materials.push(mesh.material);const edges=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,35),new THREE.LineBasicMaterial({color:'#34485a',transparent:true,opacity:.22}));mesh.add(edges);}});
    entries.set(item.id,{item,object,materials});
    if(!manual.partTypes.find(t=>t.id===item.typeId).isTool)initialBounds.expandByObject(object);
  }
  for(const x of [initialBounds.min.x,initialBounds.max.x])for(const y of [initialBounds.min.y,initialBounds.max.y])for(const z of [initialBounds.min.z,initialBounds.max.z])boxCorners.push(new THREE.Vector3(x,y,z));
  root.add(markDot);markDot.visible=false;
  if(manual.toolAssets){
    const tools=await new GLTFLoader().loadAsync(`${base}${manual.toolAssets.file}`);
    for(const item of manual.toolAssets.items){const object=tools.scene.getObjectByName(item.nodeName);object.visible=false;root.add(object);toolMeshes.set(item.id,{object,name:item.name});}
  }
  buildText();wireControls();new ResizeObserver(resize).observe($('stage'));new ResizeObserver(resize).observe($('detail-view'));
  document.querySelectorAll('button,input').forEach(el=>el.disabled=false);$('loading').hidden=true;$('stage').setAttribute('aria-busy','false');openStep(0);renderer.setAnimationLoop(render);
}

function validateInput(data){
  if(data.schemaVersion!==1||!data.steps.length||new Set(data.instances.map(i=>i.id)).size!==data.instances.length)throw Error('说明书数据格式或零件编号有误');
  const ids=new Set(data.instances.map(i=>i.id)),toolIds=new Set(data.toolAssets?.items.map(t=>t.id)??[]);
  for(const s of data.steps){if(!s.pdfPages.length)throw Error('步骤缺少原文依据');for(const a of s.actions){if(a.tool&&!toolIds.has(a.tool.id))throw Error('工具动作缺少对应模型');if(!['install','mark'].includes(a.kind)||a.targets.some(id=>!ids.has(id)))throw Error('步骤动作或零件对应有误');}}
}
function buildText(){
  partCount=manual.partTypes.filter(t=>!t.isTool).reduce((n,t)=>n+t.quantity,0);
  document.title=`${manual.product.name} · 立体说明书`;
  $('product-title').textContent=manual.product.name;
  const dims=manual.product.dimensionsMm;$('product-size').textContent=`${dims[0]/10} × ${dims[2]/10} × ${dims[1]/10} cm`;
  $('product-code').textContent=`产品编号 · ${manual.product.article}`;
  $('step-count').textContent=`${manual.steps.length} 步`;
  $('inventory-count').textContent=`${partCount} 件成品组件 + ${manual.partTypes.filter(t=>t.isTool).reduce((n,t)=>n+t.quantity,0)} 件可重复使用工具`;
  manual.steps.forEach((s,i)=>{const button=document.createElement('button');button.className='step';button.innerHTML=`<span>${String(s.number).padStart(2,'0')}</span><strong>${s.title}</strong>`;button.addEventListener('click',()=>openStep(i));$('steps').append(button);stepButtons.push(button);});
  $('accuracy').innerHTML=`<p>${manual.product.accuracyNote}</p><ul>${manual.unknowns.map(u=>`<li>${u.reason}</li>`).join('')}</ul>`;
  $('inventory').innerHTML=manual.partTypes.map(t=>`<div class="inventory-item${t.comparison?' has-comparison':''}${t.isTool?' template-item':''}"><strong>× ${t.quantity}</strong>${t.name}<small>${t.code??'无单独印刷编号'}${t.isTool?' · 工具，可重复使用':''}</small>${t.comparison?`<div class="part-comparison"><figure><img src="${base}${t.comparison.referenceImage}" alt="官方说明书 ${t.code??t.name} 结构图" loading="lazy"><figcaption>官方原图 · 第 ${t.comparison.page} 页</figcaption></figure><figure><img src="${base}${t.comparison.modelImage}" alt="${t.code??t.name} 实际模型渲染" loading="lazy"><figcaption>3D 模型 · 外形对照</figcaption></figure></div>`:''}</div>`).join('');
}
function openStep(index){step=index;progress=0;playing=false;finished=false;picked=null;endedAt=0;update();resetView();}
function update(){
  const s=manual.steps[step];
  $('step-number').textContent=finished?'全部完成':`第 ${s.number} / ${manual.steps.length} 步`;
  $('step-title').textContent=finished?'装配完成':s.title;
  $('instruction').textContent=finished?'全部组件已就位。旋转查看成品，或返回任意一步检查连接。':s.instruction;
  $('warning').hidden=finished||!s.warnings.length;$('warning').textContent=s.warnings.join(' ');
  $('tools').textContent=finished?'':s.tools.length?`工具 · ${s.tools.join(' / ')}`:'本步无需额外工具';
  const counts=new Map();for(const a of s.actions)for(const id of a.targets){const t=entries.get(id).item.typeId;counts.set(t,(counts.get(t)??0)+1);}
  $('hardware').innerHTML=finished?`<div class="hardware-item">${partCount} 件成品组件，全部就位</div>`:[...counts].map(([id,n])=>{const t=manual.partTypes.find(t=>t.id===id);return `<div class="hardware-item">${t.name}${t.code?` · ${t.code}`:''} <b>× ${n}</b></div>`;}).join('');
  $('page-label').textContent=`PDF 第 ${s.pdfPages.join('、')} 页 ↗`;$('page-thumb').src=`${base}references/page-${s.pdfPages[0]}.png`;
  $('play').textContent=playing?'暂停':finished?'从头开始':progress===1?(step===manual.steps.length-1?'查看成品':'播放下一步'):'播放这一步';
  $('finished').textContent=finished?'返回步骤 ↙':'看成品 ↗';$('finished').setAttribute('aria-pressed',finished);
  $('prev').disabled=finished||step===0;$('next').disabled=finished||step===manual.steps.length-1;$('progress').disabled=finished;
  $('progress').value=Math.round(progress*100);$('progress-value').textContent=finished?'—':`${Math.round(progress*100)}%`;
  $('expanded-play').textContent=$('play').textContent;$('expanded-progress').value=Math.round(progress*100);$('expanded-progress-value').textContent=`${Math.round(progress*100)}%`;$('expanded-progress').disabled=finished;
  $('expanded-xray').setAttribute('aria-pressed',xray);$('tool-toggle').setAttribute('aria-pressed',toolEnabled);
  $('auto').setAttribute('aria-pressed',auto);$('auto').textContent=`${auto?'●':'○'} 连续播放`;
  $('xray').setAttribute('aria-pressed',xray);$('detail-toggle').setAttribute('aria-pressed',detail);$('detail-card').hidden=!detail||finished;
  $('pose-label').textContent=finished?'成品正立展示':{inverted:'装配面朝上',sideA:'桌体侧放 · 第一侧',sideB:'桌体侧放 · 另一侧'}[s.pose];
  stepButtons.forEach((b,i)=>{b.setAttribute('aria-current',!finished&&i===step?'step':'false');b.classList.toggle('done',finished||i<step||i===step&&progress===1);});
  updateScene();
}
function updateScene(){
  const frame=frameAt(manual,step,progress,finished),active=new Set(manual.steps[step].actions.flatMap(a=>a.targets));
  protectivePad.visible=!finished;
  root.quaternion.copy(frame.groupQuaternion);root.position.set(0,-Math.min(...boxCorners.map(v=>v.clone().applyQuaternion(root.quaternion).y)),0);
  let installed=0;
  for(const [id,state] of frame.states){
    const entry=entries.get(id);entry.object.visible=state.visible;entry.object.position.copy(state.position);entry.object.quaternion.copy(state.quaternion);if(state.installed)installed++;
    for(const m of entry.materials){const transparent=xray&&!active.has(id);if(m.transparent!==transparent){m.transparent=transparent;m.depthWrite=!transparent;m.needsUpdate=true;}m.opacity=transparent?.18:1;m.emissive.set(active.has(id)&&!finished?'#245aa5':'#000000');m.emissiveIntensity=.04;}
  }
  $('installed').textContent=`${installed} / ${partCount} 件已定位`;root.updateMatrixWorld(true);updateTools(frame);updateDetail(frame);
}
function updateTools(frame){
  for(const t of toolMeshes.values())t.object.visible=false;
  const active=toolAt(manual,step,progress,frame);
  if(active){
    const t=toolMeshes.get(active.id);t.object.visible=toolEnabled&&!finished&&active.visible;t.object.position.copy(active.position);t.object.quaternion.copy(active.quaternion);
    $('tool-status').textContent=finished?'装配完成':progress===1?'本步完成':`${t.name} · ${active.phase}${toolEnabled?'':'（已隐藏）'}`;
  }else $('tool-status').textContent=finished?'装配完成':step<2?'在保护垫上手动旋入':'手动放置组件';
  markDot.visible=false;
  if(active?.id==='awl'&&!finished){
    const clock=actionAt(manual,step,progress),phase=clock.progress*clock.action.placements.length-active.placement;
    markDot.visible=phase>.65&&phase<.96;markDot.position.copy(active.contact).addScaledVector(active.outward,.0003);
  }
  root.updateMatrixWorld(true);
}
function updateDetail(frame=frameAt(manual,step,progress,finished)){
  const s=manual.steps[step],d=s.detail,clock=actionAt(manual,step,progress),action=clock.action;
  const active=toolAt(manual,step,progress,frame),entry=entries.get(action.targets[0]);
  const target=active?active.contact.clone():new THREE.Vector3(...d.target).add(entry.object.position.clone().sub(new THREE.Vector3(...entry.item.home)));
  root.localToWorld(target);
  if(picked)target.copy(entries.get(picked).object.localToWorld(pickedPoint.clone()));
  detailFocus.copy(target);
  const direction=new THREE.Vector3(...d.position).sub(new THREE.Vector3(...d.target)).normalize().multiplyScalar(.18).applyQuaternion(root.quaternion);
  detailCamera.position.copy(target).add(direction);detailCamera.up.set(0,1,0);detailCamera.lookAt(target);
  const label=picked?manual.partTypes.find(t=>t.id===entries.get(picked).item.typeId).name:active?`${toolMeshes.get(active.id).name} · ${active.phase}`:d.label;
  $('detail-label').textContent=label;$('detail-dialog-title').textContent=`${s.number.toString().padStart(2,'0')} / ${s.title}`;
  $('expanded-caption').textContent=`${label} · 拖动旋转，滚轮缩放`;
  if($('detail-dialog').open){
    const delta=target.clone().sub(expandedFocus);expandedCamera.position.add(delta);expandedOrbit.target.add(delta);expandedFocus.copy(target);
  }
}
function createEnvironment(view){
  const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(view),texture=pmrem.fromScene(room).texture;
  room.dispose();pmrem.dispose();return texture;
}
function openDetail(){
  playing=false;update();
  if(!expandedRenderer){
    expandedRenderer=new THREE.WebGLRenderer({antialias:true});expandedRenderer.setPixelRatio(Math.min(devicePixelRatio,2));expandedRenderer.toneMapping=THREE.NeutralToneMapping;$('expanded-view').append(expandedRenderer.domElement);
    expandedEnvironment=createEnvironment(expandedRenderer);expandedCamera=new THREE.PerspectiveCamera(32,1,.0001,30);
    expandedOrbit=new OrbitControls(expandedCamera,expandedRenderer.domElement);expandedOrbit.enableDamping=true;expandedOrbit.minDistance=.008;expandedOrbit.maxDistance=2;
    new ResizeObserver(resize).observe($('expanded-view'));
  }
  $('detail-dialog').showModal();resetExpandedView();resize();
}
function resetExpandedView(){
  expandedFocus.copy(detailFocus);expandedOrbit.target.copy(detailFocus);expandedCamera.up.set(0,1,0);
  expandedCamera.position.copy(detailCamera.position).sub(detailFocus).multiplyScalar(1.25).add(detailFocus);expandedOrbit.update();
}
function togglePlay(){
  if(finished)openStep(0);
  else if(progress===1){if(step===manual.steps.length-1){finished=true;playing=false;update();resetView();return;}openStep(step+1);}
  playing=!playing;update();
}
function scrub(value){progress=Number(value)/100;playing=false;picked=null;update();}
function resetView(){
  const s=manual.steps[step],q=poseQuaternion(finished?'upright':s.pose);
  const target=finished?new THREE.Vector3(0,.23,0):new THREE.Vector3(...s.camera.target).applyQuaternion(q);
  const shift=-Math.min(...boxCorners.map(v=>v.clone().applyQuaternion(q).y));target.y+=shift;
  const direction=finished?new THREE.Vector3(1.1,.7,1.2):new THREE.Vector3(...s.camera.position).sub(new THREE.Vector3(...s.camera.target)).applyQuaternion(q);
  if(!finished&&s.pose!=='inverted')direction.set(-1.1,.8,s.pose==='sideA'?1.3:-1.3);
  const aspect=$('stage').clientWidth/$('stage').clientHeight,radius=Math.hypot(...manual.product.dimensionsMm)/2000;
  const halfAngle=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(1,aspect));
  direction.setLength(Math.max(direction.length(),radius/Math.sin(halfAngle)*1.06));
  camera.up.set(0,1,0);camera.position.copy(target).add(direction);orbit.target.copy(target);orbit.update();
}
function resize(){
  if(!renderer)return;const w=$('stage').clientWidth,h=$('stage').clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  const dw=$('detail-view').clientWidth,dh=$('detail-view').clientHeight;if(dw&&dh){detailRenderer.setSize(dw,dh,false);detailCamera.aspect=dw/dh;detailCamera.updateProjectionMatrix();}
  if(expandedRenderer&&$('detail-dialog').open){const ew=$('expanded-view').clientWidth,eh=$('expanded-view').clientHeight;expandedRenderer.setSize(ew,eh,false);expandedCamera.aspect=ew/eh;expandedCamera.updateProjectionMatrix();}
}
function wireControls(){
  $('prev').onclick=()=>openStep(step-1);$('next').onclick=()=>openStep(step+1);
  $('play').onclick=togglePlay;$('expanded-play').onclick=togglePlay;
  $('progress').oninput=e=>scrub(e.target.value);$('expanded-progress').oninput=e=>scrub(e.target.value);
  $('auto').onclick=()=>{auto=!auto;update();};$('finished').onclick=()=>{finished=!finished;playing=false;update();resetView();};
  $('reset').onclick=()=>{picked=null;resetView();updateDetail();};
  $('detail-expand').onclick=openDetail;$('close-detail').onclick=()=>$('detail-dialog').close();$('expanded-reset').onclick=resetExpandedView;$('expanded-focus').onclick=()=>{picked=null;updateDetail();resetExpandedView();};
  $('expanded-xray').onclick=()=>{xray=!xray;update();};$('tool-toggle').onclick=()=>{toolEnabled=!toolEnabled;update();};$('xray').onclick=()=>{xray=!xray;update();};$('detail-toggle').onclick=()=>{detail=!detail;update();resize();};
  $('source-page').onclick=()=>{const page=manual.steps[step].pdfPages[0];$('dialog-title').textContent=`官方说明书 · 第 ${page} 页 / ${manual.sources[0].pageCount} 页`;$('pdf-image').src=`${base}references/page-${page}.png`;$('pdf-dialog').showModal();};
  $('close-pdf').onclick=()=>$('pdf-dialog').close();$('all-pdf').onclick=()=>window.open(`${base}references/manual.pdf`,'_blank','noopener');
  let down;const ray=new THREE.Raycaster();renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
  renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);const hit=ray.intersectObjects([...entries.values()].filter(e=>e.object.visible).map(e=>e.object),true).find(h=>h.object.isMesh);if(hit){picked=hit.object.userData.instanceId;pickedPoint=entries.get(picked).object.worldToLocal(hit.point.clone());detail=true;update();}});
}
function render(time){
  const dt=Math.min(time-lastTime,60);lastTime=time;
  if(playing&&progress<1){progress=Math.min(1,progress+dt/6000);if(progress===1)endedAt=time;update();}
  else if(playing&&progress===1){if(!auto){playing=false;update();}else if(time-endedAt>900){if(step<manual.steps.length-1){openStep(step+1);playing=true;}else{finished=true;playing=false;update();resetView();}}}
  orbit.update();scene.environment=environmentMaps[0];renderer.render(scene,camera);if(detail&&!finished){scene.environment=environmentMaps[1];detailRenderer.render(scene,detailCamera);}
  if(expandedRenderer&&$('detail-dialog').open){expandedOrbit.update();scene.environment=expandedEnvironment;expandedRenderer.render(scene,expandedCamera);}
}
start().catch(error=>{console.error(error);$('loading').textContent=`无法加载说明书：${error.message}`;});
