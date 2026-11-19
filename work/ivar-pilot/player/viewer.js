import './style.css';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {sceneAt,stepsFor,routes} from './actions.js';
import {handSprite} from '../../manual-pipeline/app/gestures.js';

const $=id=>document.getElementById(id);
const labels={top:'顶板',bottom:'底板',side:'柜体侧板',back:'背板',door:'柜门',shelf:'搁板',rackSide:'IVAR 侧架',screwdriver:'十字螺丝刀',awl:'尖锥',wallFixing:'墙面紧固件（按墙材选配）'};
const unitCounts={top:1,bottom:1,side:2,back:1,door:2,shelf:2};
const parts=new Map(), objects=new Map(), inspector=new THREE.Group(), ray=new THREE.Raycaster();
let route=routes[0].id,steps=stepsFor(route),index=0,time=0,overview=true,closeup=false,playing=false,clock=0;
let view,partView,inset,current,selectedPart,tipMode=false;
let showDetail=true,showTools=true,showGuide=true,seeThrough=false,autoPlay=false;
const faded=new Map();
let inlineSlot;
let sourcePages={};
const palm=handSprite('support'),pinch=handSprite('pinch');
const motionArrow=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.06,0xaf603f);
motionArrow.traverse(o=>{o.renderOrder=4;if(o.material){o.material=o.material.clone();o.material.depthTest=false;o.material.depthWrite=false}});
const fingers=new THREE.Group();fingers.add(palm,pinch,motionArrow);
function handCue(){
  const step=steps[index].id,usingTool=current.instances.some(i=>i.id==='working-tool');
  fingers.visible=!overview&&showGuide&&!usingTool&&['dowels','back','shelves','cups','hang','stackPins','rackLower'].includes(step);
  if(!fingers.visible)return;
  palm.visible=['back','hang','rackLower','stackPins'].includes(step);pinch.visible=!palm.visible;
  const hand=palm.visible?palm:pinch;
  const next=sceneAt(route,index,Math.min(1,time+.008));
  const delta=new THREE.Vector3().fromArray(next.detailFocus).sub(point.fromArray(current.detailFocus));
  const length=delta.length();
  fingers.visible=time<.99&&length>.00002&&length<.06;
  if(!fingers.visible)return;
  hand.position.copy(point);hand.scale.set(.068,.051,1);
  motionArrow.position.copy(point);motionArrow.setDirection(delta.normalize());motionArrow.setLength(.035,.009,.006);
}
const dir=new THREE.Vector3(), point=new THREE.Vector3();
function makeView(host,hdr){
  const scene=new THREE.Scene();scene.background=new THREE.Color(host.id==='partview'?'#f6f0e1':'#b9cfdc');
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.05;
  host.append(renderer.domElement);
  hdr.mapping=THREE.EquirectangularReflectionMapping;scene.environment=hdr;scene.environmentIntensity=.72;
  scene.add(new THREE.HemisphereLight(0xfff4de,0xd2dfe2,.72));
  const key=new THREE.DirectionalLight(0xfff8ea,1.85);key.position.set(1.6,3,1.45);scene.add(key);
  if(host.id==='stage'){
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;key.castShadow=true;
    key.shadow.mapSize.set(2048,2048);
    Object.assign(key.shadow.camera,{left:-1.7,right:1.7,top:1.8,bottom:-1.8,near:.2,far:7});
    key.shadow.normalBias=.0005;key.shadow.bias=-.00008;
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.ShadowMaterial({opacity:.12}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.018;ground.receiveShadow=true;scene.add(ground);
  }
  const camera=new THREE.PerspectiveCamera(34,1,.0003,35);
  const controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=.004;controls.maxDistance=9;
  const value={renderer,scene,camera,controls,host};
  new ResizeObserver(()=>{if(!host.clientHeight||!host.clientWidth)return;camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight,false);renderer.render(value.subject||scene,camera);}).observe(host);
  controls.addEventListener('change',()=>renderer.render(value.subject||scene,camera));
  return value;
}
function aim(v,focus,radius,direction){
  const target=new THREE.Vector3().fromArray(focus);
  const distance=radius/Math.sin(THREE.MathUtils.degToRad(17))*Math.max(1,1/v.camera.aspect);
  v.controls.target.copy(target);v.camera.position.copy(target).addScaledVector(dir.fromArray(direction).normalize(),distance);v.controls.update();
}
function resetCamera(){
  aim(view,closeup?current.detailFocus:current.focus,closeup?current.detailRadius:current.radius,closeup?current.detailView:current.mainView);
}
function draw(reframe=false){
  const pos=overview?steps.findIndex(s=>s.id==='shelves'):index;
  const prev=current;
  current=sceneAt(route,pos,overview?1:time);
  objects.forEach(o=>o.visible=false);
  for(const item of current.instances){
    let o=objects.get(item.id);
    if(!o || o.userData.partType!==item.type){
      if(o)view.scene.remove(o);
      const model=parts.get(item.type);
      if(!model)throw Error('零件库缺少 '+item.type);
      o=model.clone(true);o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});o.userData.partType=item.type;objects.set(item.id,o);view.scene.add(o);
    }
    o.visible=showTools||item.id!=='working-tool';
    if(['top','bottom','door','shelf','side','back'].includes(item.type)&&o.userData.faded!==seeThrough){
      const template=parts.get(item.type), original=[];
      template.traverse(m=>{if(m.isMesh)original.push(m.material)});
      let i=0;o.traverse(m=>{if(m.isMesh){const src=original[i++];m.material=seeThrough?(Array.isArray(src)?src.map(fade):fade(src)):src}});
      o.userData.faded=seeThrough;
    }
    o.position.fromArray(item.position);o.quaternion.fromArray(item.quaternion);o.scale.fromArray(item.scale);
  }
  if(reframe||!prev)resetCamera();
  else if(closeup){
    // Follow the working point while preserving the user's orbit and zoom.
    point.fromArray(current.detailFocus).sub(dir.fromArray(prev.detailFocus));
    view.camera.position.add(point);view.controls.target.add(point);view.controls.update();
  }
  handCue();view.renderer.render(view.scene,view.camera);
  $('detail-card').hidden=overview||!showDetail;
  if(!overview&&showDetail&&$('detail-view').clientWidth){
    const f=current.detailFocus,v=current.detailView;
    aim(inset,f,current.detailRadius,v);inset.renderer.render(view.scene,inset.camera);
  }
  $('detail-label').textContent=current.cue;
  $('cue').textContent=overview?'拖动旋转 · 点击零件看外形':current.cue;
  $('range').value=Math.round(time*100);$('pct').textContent=overview?'—':Math.round(time*100)+'%';
}
function fade(material){
  if(!faded.has(material)){const m=material.clone();m.transparent=true;m.opacity=.18;m.depthWrite=false;faded.set(material,m)}
  return faded.get(material);
}
function openPage(page){
  playing=false;sync();$('sourcetitle').textContent='宜家原册 · 第 '+page+' 页';
  $('sourceimg').src='./pages/page-'+String(page).padStart(4,'0')+'.png';$('pdf-dialog').showModal();
}
function checklist(id,label,qty,code=''){
  const row=document.createElement('div');row.className='sample-row';
  const check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label','清点'+label);
  const b=buttonFor(id);const span=document.createElement('span');span.textContent=label;
  if(code){const num=document.createElement('small');num.textContent=code;span.append(num)}
  const count=document.createElement('b');count.textContent=qty;
  const arrow=document.createElement('i');arrow.textContent='↗';b.replaceChildren(span,count,arrow);
  if(id==='awl'||id==='screwdriver'){const photo=new Image();photo.src='./prep/'+id+'.png';photo.alt='';b.prepend(photo)}
  row.append(check,b);return row;
}
function buttonFor(type,text){
  const b=document.createElement('button');b.type='button';b.textContent=text||labels[type]||type;b.onclick=()=>openPart(type);return b;
}
function setChoices(){
  const body=document.createElement('optgroup'),adjust=document.createElement('optgroup');body.label='装配顺序';adjust.label='门板调节';
  steps.forEach((s,i)=>(s.optional?adjust:body).append(new Option(s.title,String(i))));
  const normal=steps.filter(s=>!s.optional);$('count').textContent=normal.length+' 步';
  $('steps').replaceChildren(...normal.map((s,i)=>{const b=document.createElement('button');b.className='step';b.title=s.title;b.setAttribute('aria-label',String(i+1)+' '+s.title);b.innerHTML='<span>'+String(i+1).padStart(2,'0')+'</span><strong></strong>';b.querySelector('strong').textContent=s.title;b.onclick=()=>choose(i);return b}));
  $('step').replaceChildren(new Option('成品总览','overview'),body,adjust);
}
function sync(){
  const s=steps[index];$('step').value=overview?'overview':String(index);
  const assembled=overview&&$('prep').hidden;
  $('title').textContent=overview?(assembled?'IVAR · 装配成品':'准备装配'):s.title;
  $('instruction').textContent=overview?(assembled?'拖动旋转成品，查看柜门、搁板与安装位置。':'先选安装方式，再清点工具与零件。三种装法共用柜体和门铰链，墙面固定方式随所选路线变化。'):s.action;
  $('step-number').textContent=overview?'宜家 IVAR · '+routes.find(r=>r.id===route).label:(s.optional?'门板调节':('原册步骤 '+s.printedStep))+'　／　第 '+s.page+' 页';
  $('hereparts').replaceChildren(...(overview?['100101','screwdriver','awl']:s.parts).map(id=>{
    const b=buttonFor(id,(labels[id]||id)+(/^\d+$/.test(id)?' · '+id:''));b.className='hardware-item identity-button';b.append('　＋');b.setAttribute('aria-controls','part-identity');b.setAttribute('aria-expanded',String(!$('part-identity').hidden&&selectedPart===id));b.onclick=()=>showIdentity(id,b);return b;
  }));
  [...$('steps').children].forEach((b,i)=>b.setAttribute('aria-current',String(!overview&&i===index?'step':'false')));
  const page=overview?5:s.page;$('page-label').textContent='PDF 第 '+page+' 页 ↗';$('page-thumb').src='./pages/page-'+String(page).padStart(4,'0')+'.png';
  $('position').textContent=overview?'成品总览':s.optional?'门板调节':'第 '+(index+1)+' / '+steps.filter(x=>!x.optional).length+' 步';
  $('pose-label').textContent=overview?'成品总览':routes.find(r=>r.id===route).label;
  $('cue').hidden=!showGuide;
  $('xray').setAttribute('aria-pressed',String(seeThrough));$('tool-toggle').setAttribute('aria-pressed',String(showTools));$('guide-toggle').setAttribute('aria-pressed',String(showGuide));$('detail-toggle').setAttribute('aria-pressed',String(showDetail));
  $('auto').setAttribute('aria-pressed',String(autoPlay));$('auto').textContent=autoPlay?'● 连续播放':'○ 连续播放';
  $('play').textContent=overview?'开始装配':playing?'暂停':time>=1?'重播这一步':'播放这一步';
  $('prev').disabled=overview||index===0;$('next').disabled=!overview&&index===steps.length-1;$('range').disabled=overview;
  $('zoom').disabled=overview;$('zoom').setAttribute('aria-pressed',String(closeup));$('zoom').textContent=closeup?'↙':'⤢';
  $('finished').textContent=overview?'返回步骤 ↙':'看成品 ↗';
}
function choose(i,whole=false){
  releasePart();overview=whole;index=i;time=0;playing=false;closeup=false;sync();draw(true);
}
function markAssembled(){
  if(overview||steps[index].optional)return false;
  const total=steps.filter(s=>!s.optional).length;
  return !window.dispatchEvent(new CustomEvent('academy:step-complete',{cancelable:true,detail:{id:'ivar',path:route,step:index,total}}));
}
function animate(now){
  if(playing){
    time=Math.min(1,time+Math.min((now-clock)/1000,.25)/7);
    draw();
    if(time>=1){
      playing=false;
      const earned=markAssembled();
      if(!earned&&autoPlay&&!steps[index].optional&&index+1<steps.length&&!steps[index+1].optional){
        choose(index+1);playing=true;
      }
      sync();
    }
  }
  clock=now;requestAnimationFrame(animate);
}
function framePart(){
  const box=new THREE.Box3().setFromObject(inspector),center=box.getCenter(new THREE.Vector3()),r=box.getSize(new THREE.Vector3()).length()*.53;
  const hinge=['109336','109220','10078170'].includes(selectedPart);
  aim(partView,tipMode?[0,.001,0]:center.toArray(),tipMode?.009:r,tipMode?[.9,-.55,.9]:hinge?[1.5,.22,.55]:[1,.52,1.5]);
  partView.renderer.render(partView.scene,partView.camera);
}
function releasePart(){
  if(!inlineSlot)return;
  if(inlineSlot===$('inline-model')){
    $('sample-model').prepend($('partview'));$('part-identity').hidden=true;inlineSlot=null;
    for(const b of $('hereparts').children)b.setAttribute('aria-expanded','false');return;
  }
  $('sample-model').prepend($('partview'));inlineSlot.querySelector('button').hidden=false;inlineSlot=null;
}
function mountPart(id){
  selectedPart=id;tipMode=false;inspector.clear();inspector.add(parts.get(id).clone(true));
}
function showIdentity(id,button){
  playing=false;
  const closing=inlineSlot===$('inline-model')&&selectedPart===id;
  releasePart();if(closing)return;
  mountPart(id);inlineSlot=$('inline-model');inlineSlot.append($('partview'));$('part-identity').hidden=false;
  $('inline-kind').textContent=['100101','awl','screwdriver'].includes(id)?'工具样式':'零件样式';
  $('inline-name').textContent=(labels[id]||id)+(/^\d+$/.test(id)?' · '+id:'');
  $('inline-source').parentElement.hidden=!sourcePages[id];
  if(sourcePages[id]){$('inline-source').src='./prep/'+id+'-source.png';$('inline-page').textContent='官方原图 · 第 '+sourcePages[id]+' 页'}
  $('inline-tip').hidden=!['screwdriver','awl','100101'].includes(id);$('inline-tip').textContent='看工作端 ↗';
  button.setAttribute('aria-expanded','true');requestAnimationFrame(framePart);
}
function openPart(id){
  playing=false;sync();releasePart();
  mountPart(id);
  $('parttitle').textContent=(labels[id]||id)+(/^\d+$/.test(id)?' · '+id:'');
  $('tip').hidden=!['screwdriver','awl','100101'].includes(id);$('tip').textContent='看工作端 ↗';
  $('sample-kind').textContent=['screwdriver','awl','100101'].includes(id)?'工具外形':'零件外形';$('sample-dialog').showModal();requestAnimationFrame(framePart);
}
async function start(){
  const base=import.meta.env.BASE_URL;
  const [gltf,kind,inventory,hdr]=await Promise.all([new GLTFLoader().loadAsync(base+'library.glb'),fetch(base+'types.json').then(r=>r.json()),fetch(base+'inventory.json').then(r=>r.json()),new HDRLoader().loadAsync(base+'studio.hdr')]);
  for(const [id,info] of Object.entries(kind)){
    const obj=gltf.scene.getObjectByName(info.node||id);if(!obj)throw Error('无法读取 '+id);
    parts.set(id,obj);if(!labels[id]&&info.name)labels[id]=info.name;
  }
  for(const x of inventory.kit)labels[x.id]=x.name;
  const sources=await (await fetch(base+'prep/sources.json')).json();sourcePages=sources;
  for(const [id,page] of Object.entries(sources)){
    const card=document.createElement('article');card.className='inventory-item has-comparison';
    const title=document.createElement('strong');title.textContent=labels[id]||id;
    const code=document.createElement('small');code.textContent=/^\d+$/.test(id)?id:'';
    const pair=document.createElement('div');pair.className='part-comparison';
    const left=document.createElement('figure'),right=document.createElement('figure');
    const line=new Image();line.src=base+'prep/'+id+'-source.png';line.loading='lazy';line.alt=title.textContent+'官方原图';
    const cap=document.createElement('figcaption');cap.textContent='官方原图 · 第 '+page+' 页';left.append(line,cap);
    const slot=document.createElement('div');slot.className='comparison-surface';const b=document.createElement('button');b.className='poster';
    b.setAttribute('aria-label','旋转查看'+title.textContent);const shot=new Image();shot.src=base+'posters/'+id+'.png';shot.alt=title.textContent+'模型外形';shot.loading='lazy';b.append(shot);
    b.onclick=()=>{releasePart();inlineSlot=slot;b.hidden=true;slot.append($('partview'));mountPart(id);requestAnimationFrame(framePart)};
    slot.append(b);const legend=document.createElement('figcaption');legend.textContent='零件外形 · 拖动旋转';right.append(slot,legend);pair.append(left,right);card.append(title,code,pair);$('inventory').append(card);
  }
  view=makeView($('stage'),hdr);view.scene.add(fingers);inset=makeView($('detail-view'),hdr);inset.subject=view.scene;inset.controls.enabled=false;partView=makeView($('partview'),hdr);partView.scene.add(inspector);
  for(const r of routes)for(const el of [$('route'),$('prep-route')])el.add(new Option(r.label,r.id));
  $('toolList').replaceChildren(...['screwdriver','awl'].map(id=>checklist(id,labels[id],'1 把')));
  $('kit').replaceChildren(...inventory.kit.map(x=>checklist(x.id,x.name,'× '+x.quantity,x.id)));
  $('check-boards').replaceChildren(...Object.entries(unitCounts).map(([id,n])=>checklist(id,labels[id],'× '+n)));
  for(const el of [$('route'),$('prep-route')])el.onchange=()=>{route=el.value;$('route').value=route;$('prep-route').value=route;steps=stepsFor(route);setChoices();choose(0)};
  $('auto').onclick=()=>{autoPlay=!autoPlay;sync()};
  for(const b of document.querySelectorAll('[data-page]'))b.onclick=()=>openPage(Number(b.dataset.page));
  $('enter-assembly').onclick=()=>{$('prep').hidden=true;$('workbench').hidden=false;$('reopen-prep').hidden=false;$('finished').hidden=false;choose(index);requestAnimationFrame(()=>draw(true));window.scrollTo(0,0)};
  $('reopen-prep').onclick=()=>{playing=false;$('prep').hidden=false;$('workbench').hidden=true;$('reopen-prep').hidden=true;$('finished').hidden=true;window.scrollTo(0,0)};
  $('detail-toggle').onclick=()=>{showDetail=!showDetail;closeup=false;sync();draw(true)};
  $('tool-toggle').onclick=()=>{showTools=!showTools;sync();draw()};
  $('guide-toggle').onclick=()=>{showGuide=!showGuide;sync();draw()};
  $('xray').onclick=()=>{seeThrough=!seeThrough;sync();draw()};
  $('step').onchange=()=>{const v=$('step').value;choose(v==='overview'?0:Number(v),v==='overview')};
  $('prev').onclick=()=>choose(Math.max(0,index-1));$('next').onclick=()=>choose(overview?0:Math.min(steps.length-1,index+1));
  $('play').onclick=()=>{if(overview)choose(0);if(time>=1){time=0;draw(true)}playing=!playing;clock=performance.now();sync()};
  $('range').oninput=()=>{playing=false;time=Number($('range').value)/100;draw();sync();if(time===1)markAssembled()};
  $('zoom').onclick=()=>{closeup=!closeup;sync();draw(true)};$('home').onclick=()=>draw(true);
  $('finished').onclick=()=>choose(0,!overview);
  $('original').onclick=()=>openPage(overview?5:steps[index].page);
  $('closesource').onclick=()=>$('pdf-dialog').close();$('dismiss').onclick=()=>$('sample-dialog').close();
  $('hide-inline').onclick=releasePart;
  $('inline-tip').onclick=()=>{tipMode=!tipMode;framePart();$('inline-tip').textContent=tipMode?'看完整工具 ↙':'看工作端 ↗'};
  $('tip').onclick=()=>{tipMode=!tipMode;$('tip').textContent=tipMode?'看完整工具 ↙':'看工作端 ↗';framePart()};
  let down;
  const canvas=view.renderer.domElement;
  canvas.onpointerdown=e=>{down=[e.clientX,e.clientY]};
  canvas.onpointerup=e=>{
    if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
    const box=canvas.getBoundingClientRect();ray.setFromCamera({x:2*(e.clientX-box.left)/box.width-1,y:1-2*(e.clientY-box.top)/box.height},view.camera);
    const hit=ray.intersectObjects([...objects.values()].filter(o=>o.visible),true)[0];if(!hit)return;
    let node=hit.object;while(!node.userData.partType)node=node.parent;
    playing=false;sync();openPart(node.userData.partType);
  };
  setChoices();choose(0,true);$('enter-assembly').disabled=false;$('loading').hidden=true;
  window.addEventListener('academy:inspect-finished',()=>choose(index,true));
  const params=new URLSearchParams(location.search),resume=Number(params.get('resume'));
  const target=routes.find(r=>r.id===params.get('route'));
  const whole=params.get('view')==='finished';
  if(target&&(whole||(Number.isInteger(resume)&&resume>=1&&resume<=stepsFor(target.id).filter(s=>!s.optional).length))){
    $('prep-route').value=target.id;$('prep-route').onchange();$('enter-assembly').click();choose(whole?0:resume-1,whole);
  }
  requestAnimationFrame(animate);
}
start().catch(e=>{console.error(e);$('loading').textContent='模型未能打开 · '+e.message});
