const works = {
  cottage: {name:'海边小屋', medium:'原创纸模', detail:'3 张零件板 · 40 件拼装', cover:'cottage'},
  lack: {name:'LACK 茶几', medium:'宜家 IKEA', detail:'8 个装配步骤 · 22 件组件', cover:'lack'},
  ivar: {name:'IVAR 松木双门柜', medium:'宜家 IKEA', detail:'松木 · 双门双层', cover:'ivar'}
};
const routes = {wall:'单柜壁挂',stack:'双柜叠放',rack:'装入侧架'};
const root = new URL('./',import.meta.url);
const key = id=>'academy.collection.v1.'+id;
const memory = {};
function read(id){
  let saved;
  try{saved=localStorage.getItem(key(id))}catch{}
  return saved?JSON.parse(saved):memory[id]??{paths:{}};
}
function save(id,record){
  memory[id]=record;
  try{localStorage.setItem(key(id),JSON.stringify(record))}catch{}
}
function dateLabel(iso){
  const d=new Date(iso);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('.');
}
function openPlate(id,record,earned){
  const work=works[id], dialog=document.createElement('dialog');
  dialog.className='album-dialog';dialog.setAttribute('aria-labelledby','album-title');
  dialog.innerHTML='<div class="album-leaf"><div class="album-line"><span>拼装工坊　／　收藏图鉴</span><button class="album-close" type="button" aria-label="关闭藏品页">×</button></div><div class="album-picture"><img alt=""><span class="album-seal">已入藏</span></div><p class="album-status"></p><h2 id="album-title"></h2><p class="album-meta"></p><div class="album-actions"><a class="album-primary"></a><button class="album-view" type="button"></button></div></div>';
  dialog.dataset.work=id;
  if(earned)dialog.classList.add('just-earned');
  const cover=id==='ivar'&&['rack','stack'].includes(record.edition)?'ivar-'+record.edition:work.cover;
  dialog.querySelector('img').src=new URL('covers/'+cover+'.png',root);
  dialog.querySelector('img').alt=work.name+'成品';
  dialog.querySelector('.album-status').textContent=earned?'拼装完成':'我的藏品';
  dialog.querySelector('h2').textContent=work.name;
  dialog.querySelector('.album-meta').textContent=(routes[record.edition]||work.medium)+'　·　'+dateLabel(record.collected)+' 入藏';
  const link=dialog.querySelector('a');
  link.textContent=earned?'查看我的收藏':'打开装配台';
  link.href=earned?new URL('#collection',root):new URL(id+'/?view=finished&route='+encodeURIComponent(record.edition),root);
  const view=dialog.querySelector('.album-view');view.textContent=earned?'细看成品 ↗':'返回图鉴';
  view.onclick=()=>{dialog.close();if(earned)window.dispatchEvent(new Event('academy:inspect-finished'))};
  dialog.querySelector('.album-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  document.body.append(dialog);dialog.showModal();
}
const cottageTicket=document.querySelector('[data-collection-ticket]');
if(cottageTicket){
  cottageTicket.hidden=!read('cottage').collected;
  cottageTicket.onclick=()=>openPlate('cottage',read('cottage'),true);
}
window.addEventListener('academy:step-complete',event=>{
  const {id,path='main',step,total}=event.detail;
  if(!works[id]||!Number.isInteger(step)||step<0||step>=total)return;
  const record=read(id);
  const progress=record.paths[path]??{total,done:[]};
  if(progress.done.includes(step))return;
  progress.done.push(step);record.paths[path]=progress;record.lastPath=path;
  const earned=progress.done.length===total&&!record.collected;
  if(earned){record.collected=new Date().toISOString();record.edition=path}
  save(id,record);
  if(earned){
    event.preventDefault();
    window.dispatchEvent(new Event('academy:inspect-finished'));
    if(cottageTicket)cottageTicket.hidden=false;
    else openPlate(id,record,true);
  }
});

function updateCatalogue(){
  const collectedOnly=location.hash==='#collection';
  document.querySelector('#catalogue').classList.toggle('shelf',collectedOnly);
  let count=0;
  for(const card of document.querySelectorAll('[data-project]')){
    const id=card.dataset.project, record=read(id), path=record.lastPath;
    const progress=record.paths[path],collected=Boolean(record.collected);
    const link=new URL(id+'/',root);
    if(progress&&!collected){
      const next=Array.from({length:progress.total},(_,i)=>i).find(i=>!progress.done.includes(i));
      link.searchParams.set('resume',String(next+1));if(id==='ivar')link.searchParams.set('route',path);
    }
    if(collected)count++;
    card.hidden=collectedOnly&&!collected;
    card.classList.toggle('is-collected',collected);
    const anchor=card.querySelector('a');anchor.href=link;
    anchor.onclick=collectedOnly?event=>{event.preventDefault();openPlate(id,record,false)}:null;
    card.querySelector('.entry-action').textContent=collectedOnly?'翻看藏品':progress&&!collected?'接着拼装':'打开装配台';
    card.querySelector('.entry-status').textContent=collected?dateLabel(record.collected)+' 入藏':progress?'已完成 '+progress.done.length+' / '+progress.total:'';
  }
  document.querySelector('#collection-count').textContent=count;
  document.querySelector('#empty-album').hidden=!collectedOnly||count!==0;
  document.querySelector('#catalogue').hidden=collectedOnly&&count===0;
  for(const a of document.querySelectorAll('.album-nav a')){
    const current=(a.hash==='#collection')===collectedOnly;
    if(current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  }
}
if(document.querySelector('#catalogue')){
  updateCatalogue();
  for(const name of ['hashchange','storage','pageshow'])window.addEventListener(name,updateCatalogue);
}
