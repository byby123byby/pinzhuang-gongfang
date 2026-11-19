// All poses use metres, Y up and the cabinet front toward +Z.
export const routes = [
  {id:'wall',label:'单柜壁挂'},
  {id:'stack',label:'双柜叠放'},
  {id:'rack',label:'装入 IVAR 侧架'}
];

const row = (id, title, page, action, tools, parts, printedStep, optional = false) =>
  ({id, title, page, action, tools, parts, printedStep, optional});
const body = [
  row('dowels','给顶板和底板插上木榫',6,'把 8 枚木榫分别插入顶、底板两端的孔，每端 2 枚。','手',['top','bottom','101350'],1),
  row('firstSide','固定第一块侧板',7,'让三块板的背板槽朝同一面。把顶板、底板推到侧板上，用内六角扳手拧紧 4 颗长螺钉。','内六角扳手',['side','100214','100101'],2),
  row('back','沿槽插入背板',7,'从柜框开口的一端，把背板的两条边同时送进顶、底板的槽，平推到底。','手',['back'],3),
  row('secondSide','封上另一侧，翻正柜体',8,'让侧板接住背板和木榫，拧紧剩余 4 颗长螺钉。把柜体翻正，再转到柜口一侧。','内六角扳手、手',['side','100214','100101'],4),
  row('bases','安装四个铰链底座',9,'左右内壁各有上下两处。先让薄垫片贴木面，再叠上底座。每处用上下两颗 100344 固定。','十字螺丝刀',['10078170','109220','100344','screwdriver'],5),
];
const branches = {
  wall:[row('wallMount','单柜固定到墙面',10,'经柜体上部横档的两处固定点上墙。按实际墙材选配螺钉和墙塞。','按墙材选配',['back'],6)],
  stack:[
    row('stackPins','对齐两柜之间的定位销',11,'在已组好的下柜顶部插入 2 枚带肩圆销，把上柜对准两销放下。','手',['101532','top','bottom'],1),
    row('stackStraps','从背面连接上下柜',11,'在两柜接缝的左右各放一片双孔连接片。每片的一颗螺钉固定上柜，另一颗固定下柜。','十字螺丝刀',['101827','109535','screwdriver'],2),
    row('stackWall','将上下柜固定到墙面',12,'从上下两柜的上横档分别固定到墙上，共四处。按实际墙材选配紧固件。','按墙材选配',['back'],3)
  ],
  rack:[
    row('rackBottom','在侧架上安装下支托',13,'四个下支托各用背面双销定位。将尖锥穿过螺孔标点，换十字螺丝刀拧紧 109560。','尖锥、十字螺丝刀',['rackSide','10095544','109560','awl','screwdriver'],1),
    row('rackLower','把柜体放到支托上',14,'把柜体垂直放到四个下支托上。从图示的两处由下向上拧入 100404。','手、十字螺丝刀',['bottom','10095544','100404','screwdriver'],2),
    row('rackTop','装上方的两个支托',14,'将两个支托定位在柜顶上方，通过螺孔标点，再分别拧入 109560。','尖锥、十字螺丝刀',['10095544','109560','awl','screwdriver'],3),
    row('rackSecure','从上方锁住柜顶',15,'从两个上支托的托面分别向下拧入一颗 100404。','十字螺丝刀',['100404','screwdriver'],4),
    row('rackWall','固定侧架防倾倒角码',16,'在两根靠墙立柱顶端安装角码。墙端按墙材固定，立柱端经长槽标点后拧入 108458。','尖锥、十字螺丝刀',['102646','108458','awl','screwdriver'],1)
  ]
};
const finish = [
  row('cups','把铰杯装进两扇门背',17,'把门背朝上。每扇门的两个圆窝各放入一只铰杯，让铰臂伸向这扇门的外缘；两翼各用一颗 100344。','手、十字螺丝刀',['door','109336','100344','screwdriver'],2),
  row('hang','托门、套孔、滑入并锁紧',17,'让门保持打开，托住它使两个铰臂的大孔同时套住对应的底座螺钉头。沿窄槽滑入，再逐处锁紧。左右门各做一次。','手、十字螺丝刀',['door','109336','109220','screwdriver'],3),
  row('shelves','托住两层搁板',18,'在相同高度的前后两排孔各插入托销，每层共 4 枚。分别把两块搁板放平。','手',['101532','shelf'],4)
];
export const adjustmentSteps = [
  row('height','校平两扇门的上边',19,'松开底座的固定螺钉，沿竖向长孔调节门的高度，再锁紧。','十字螺丝刀',['109220','100344','screwdriver'],null,true),
  row('depth','调节门的前后位置',19,'松开铰臂槽内的锁紧螺钉，使门前后滑移，再重新锁紧。','十字螺丝刀',['109220','109336','screwdriver'],null,true),
  row('gap','调节左右门缝',19,'松开长槽中的锁紧螺钉，转动臂上的另一颗调节螺钉修正门缝，再锁紧。','十字螺丝刀',['109336','screwdriver'],null,true),
  row('spacer','两门相碰时，取出垫片',20,'如果两扇门的边缘仍然相碰，在相应底座处松开固定螺钉，取出薄垫片，再装回底座。','十字螺丝刀',['10078170','109220','100344','screwdriver'],null,true)
];
export function stepsFor(routeId) {
  return [...body,...branches[routeId],...finish,...adjustmentSteps];
}

const I=[0,0,0,1], X=[1,0,0], Y=[0,1,0], Z=[0,0,1], U=[1,1,1];
const H=.83, half=H/2, hingeHeights=[-.31,.31];
// The pin's rear shoulder touches the side; the shelf underside rests on its upper rim.
const shelfPinX=-.382+.0107, shelfOffset=.008+.00345;
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>(t=clamp(t),t*t*(3-2*t));
const part=(t,start,end)=>smooth((t-start)/(end-start));
const cycle=(t,i,n)=>clamp(t*n-i);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const axis=(v,a)=>[...mul(v,Math.sin(a/2)),Math.cos(a/2)];
function product(q,r) {
  const [x,y,z,w]=q,[a,b,c,d]=r;
  return [w*a+x*d+y*c-z*b,w*b+y*d+z*a-x*c,w*c+z*d+x*b-y*a,w*d-x*a-y*b-z*c];
}
function turn(q,v) {
  const t=mul(cross(q,v),2);
  return add(v,add(mul(t,q[3]),cross(q,t)));
}
function normal(v) {
  if(v[1]===-1)return axis(X,Math.PI);
  const q=[v[2],0,-v[0],1+v[1]], n=Math.hypot(...q);
  return q.map(c=>c/n);
}
// Reflection is kept outside the quaternion so the right cup and the board bores remain concentric.
const mirroredQ=q=>[q[0],-q[1],-q[2],q[3]];
const makeSpace=(p=[0,0,0],q=I,mirrored=false)=>({p,q,mirrored});
function point(space,p) {
  return add(space.p,turn(space.q,space.mirrored?[-p[0],p[1],p[2]]:p));
}
function orient(space,q) {return product(space.q,space.mirrored?mirroredQ(q):q)}
function child(space,p,q=I,mirrored=false) {
  return makeSpace(point(space,p),orient(space,q),space.mirrored!==mirrored);
}

export function sceneAt(routeId,index,progress,preview=true) {
  const steps=stepsFor(routeId), current=steps[index], t=clamp(progress);
  const positions=new Map(steps.map((step,i)=>[step.id,i]));
  const before=id=>index<positions.get(id);
  const here=id=>current.id===id;
  const at=id=>here(id)?t:before(id)?0:1;
  const world=makeSpace(), instances=[];let detailSet=false;
  const scene={instances,focus:[0,.415,0],radius:.74,detailFocus:[0,.415,0],detailRadius:.075,
    mainView:[1.1,.7,1.8],detailView:[1,.45,1],cue:current.title};
  function emit(space,id,type,p,q=I,active=false) {
    const instance={id,type,position:point(space,p),quaternion:orient(space,q),
      scale:space.mirrored?[-1,1,1]:U,active};
    instances.push(instance);return instance;
  }
  function detail(space,p,out,r,cue) {
    detailSet=true;scene.detailFocus=point(space,p);
    scene.detailView=turn(space.q,space.mirrored?[-out[0],out[1],out[2]]:out);
    scene.detailRadius=r;scene.cue=cue;
  }
  // The exported tip is the local origin for each tool. Positive Y leads back into its handle.
  function tool(space,type,p,out,u,angle=0) {
    if(u<=0||u>=1)return;
    const leave=1-part(u,0,.18)+part(u,.82,1);
    // Work at the wood face for an awl, and inside the drive recess for a bit.
    const depth=type==='awl'?0:type==='100101'?.001:.0004;
    const tip=add(p,mul(out,.045*leave-depth*(1-leave)));
    emit(space,'working-tool',type,tip,product(normal(out),axis(Y,angle)),true);
  }
  function screw(space,id,type,p,out,u,driving,toolType='screwdriver') {
    const work=part(u,.18,.82),angle=work*Math.PI*2;
    const head=add(p,mul(out,(1-work)*.024));
    emit(space,id,type,head,product(normal(out),axis(Y,angle)),driving);
    if(driving && u>0 && u<1)tool(space,toolType,head,out,u,angle);
    return head;
  }
  let lift=0,front=0,across=0;
  if(routeId==='wall'&&!before('wallMount'))lift=.22*at('wallMount');
  if(routeId==='stack'&&!before('stackPins'))lift=H+.15*(1-part(at('stackPins'),.4,.97));
  if(routeId==='rack'&&!before('rackBottom')){
    lift=.288+.22*(1-part(at('rackLower'),.32,.84));front=.4*(1-part(at('rackLower'),0,.41));
    if(here('rackBottom'))across=-.85;
    if(here('rackLower'))across=-.85*(1-part(t,0,.31));
  }
  const tilt=(1-part(at('secondSide'),.69,.86))*Math.PI/2;
  const yaw=(1-part(at('secondSide'),.86,.98))*Math.PI;
  const boardQ=product(axis(Y,yaw),axis(X,tilt));
  const workingHeight=.009+.132*part(at('firstSide'),0,.18);
  const centerY=lift+half*Math.cos(tilt)+workingHeight*Math.sin(tilt);
  const cabinet=makeSpace([across,centerY,front],boardQ);
  const left=child(cabinet,[0,0,0]),right=child(cabinet,[0,0,0],I,true);
  const sides=[left,right];
  scene.focus=[across,centerY,front];scene.detailFocus=[...scene.focus];
  if(routeId==='stack'&&!before('stackPins')){scene.focus=[0,H,0];scene.radius=1.22}
  if(routeId==='rack'&&!before('rackBottom')){scene.focus=[across/2,.9,0];scene.radius=1.32}
  if(tilt>.45)scene.mainView=[1.2,1.35,1.6];
  function bodyBoards() {
    const deckQ=axis(X,-Math.PI/2*(1-part(at('firstSide'),0,.18)));
    for(const [i,type] of ['bottom','top'].entries()){
      const sign=i?1:-1;
      const localY=sign*(half-.009);
      const center=[.060*(1-part(at('firstSide'),.16,.27)),localY,0];
      const deck=child(cabinet,center,deckQ);
      emit(deck,type,type,[0,0,0],I,here('dowels')||here('firstSide'));
      for(const [side,s] of [-1,1].entries())for(const [depth,z] of [-.095,.095].entries()){
        const n=i*4+side*2+depth;
        const u=part(cycle(at('dowels'),n,8),0,1);
        const p=[s*(.382+.010+(1-u)*.038),0,z];
        emit(deck,'dowel-'+n,'101350',p,normal([s,0,0]),here('dowels')&&u>0&&u<1);
        if(here('dowels')&&Math.min(7,Math.floor(t*8))===n)detail(deck,p,[s,.8,.55],.065,'木榫顺着板端孔插入');
      }
    }
    for(const [i,space] of sides.entries()){
      const stage=i?'secondSide':'firstSide';
      if(before(stage))continue;
      const u=at(stage), align=part(u,0,.24);
      const p=[-.391-(i?.09:0)*(1-align),0,0];
      emit(space,'side-'+i,'side',p,I,here(stage)&&align<1);
      if(here(stage)&&u<.24)detail(space,p,[-1,.6,1],.32,'对准木榫与背板槽');
      for(let k=0;k<4;k++){
        const y=(k<2?-1:1)*(half-.009),z=k%2?.061:-.061;
        const until=i?.68:1;
        const start=i?.24:.27;
        const v=cycle(clamp((u-start)/(until-start)),k,4);
        if(v<=0)continue;
        const p=[-.402,y,z],active=here(stage)&&v<1;
        const head=screw(space,'sidebolt-'+i+'-'+k,'100214',p,[-1,0,0],v,active,'100101');
        if(active)detail(space,head,[-1,.35,.75],.064,'内六角扳手拧紧连接螺钉');
      }
      if(here('secondSide')&&u>.69)scene.cue=u<.86?'扶住柜框，将柜体翻到直立位置':'转动柜体，让柜口朝前';
    }
    if(!before('back')){
      const p=[(1-at('back'))*.76,0,-.131];
      emit(cabinet,'back','back',p,I,here('back'));
      if(here('back'))detail(cabinet,add(p,[-.33,.39,0]),[.5,1,-.8],.13,'沿顶底板背槽平推');
    }
  }
  bodyBoards();
  function mounts(){
    if(before('bases'))return;
    for(const [s,space] of sides.entries())for(const [h,y] of hingeHeights.entries()){
      const n=s*2+h,u=cycle(at('bases'),n,4);
      if(!u)continue;
      const service=here('spacer')&&s===0;
      const phase=service?t:0;
      const raised=here('height')&&s===0?.005*part(t,.30,.70):0;
      const withdrawn=.027*(part(phase,0,.26)-part(phase,.68,.96));
      const seat=child(space,[-.382,y,.095]);
      const spacerX=.055*(1-part(u,0,.22))+withdrawn*.42;
      if(!service||phase<.66){
        const slide=service?.08*part(phase,.27,.65):0;
        emit(seat,'spacer-'+n,'10078170',[spacerX,slide,0],I,here('bases')||service);
      }
      const plateX=.0015+.046*(1-part(u,.18,.43))+withdrawn-(service?.0015*part(phase,.68,.96):0);
      if(u>.16)emit(seat,'base-'+n,'109220',[plateX,raised,0],I,here('bases')||service||!!raised);
      if(here('bases')&&u<1)detail(seat,[.009,0,0],[1,.45,.8],.073,u<.22?'垫片贴住柜侧板':u<.43?'底座叠在垫片上':'对准底座长孔锁紧');
      for(const [j,dy] of [-.016,.016].entries()){
        const v=cycle(clamp((u-.41)/.59),j,2);
        if(v<=0)continue;
        const p=[plateX+.003 + (service?withdrawn*.45:0),dy,0];
        const active=here('bases')&&v<1;
        screw(seat,'base-screw-'+n+'-'+j,'100344',p,X,v,active);
      }
      if(service&&h===0){
        if(phase<.24||phase>.73)tool(seat,'screwdriver',[plateX+.003+withdrawn*.45,-.016,0],X,phase<.24?phase/.24:(phase-.73)/.27);
        detail(seat,[plateX,0,0],[1,.2,.65],.10,phase<.26?'松开底座固定螺钉':phase<.66?'抽出底座背后的薄垫片':'将底座重新贴住柜侧并锁紧');
      }
    }
  }
  mounts();
  function wallFix(space,id,p,u,show){
    if(u<=0)return;
    const head=screw(space,id,'wallFixing',p,Z,u,false);
    if(show&&u<1)detail(space,head,[.5,.3,1],.104,'经固定点将柜体固定到墙面');
  }
  if(routeId==='wall'&&!before('wallMount')){
    for(const [k,x] of [-.30,.30].entries())wallFix(cabinet,'wall-fixing-'+k,[x,half-.009-.020,-.1116],cycle(at('wallMount'),k,2),here('wallMount'));
  }
  if(routeId==='stack'&&!before('stackPins')){
    const lower=makeSpace([0,half,0]);
    for(const [j,sign] of [-1,1].entries()){
      const side=child(lower,[0,0,0],I,j===1);
      emit(side,'lower-side-'+j,'side',[-.391,0,0]);
      emit(side,'lower-door-'+j,'door',[-.200,0,.150]);
      emit(lower,'lower-shelf-'+j,'shelf',[0,sign*.128+shelfOffset,0]);
      for(const [f,z] of [-.09,.09].entries())for(const [k,y] of [-.128,.128].entries())
        emit(side,'lower-shelf-pin-'+j+'-'+f+'-'+k,'101532',[shelfPinX,y,z],normal(X));
      emit(lower,'lower-deck-'+j,j?'top':'bottom',[0,sign*(half-.009),0]);
      const p=[sign*.37,H+.00995+.045*(1-part(at('stackPins'),0,.36)),.118];
      emit(world,'stack-pin-'+j,'101532',p,normal(Y),here('stackPins'));
      if(here('stackPins'))detail(world,p,[1,.6,1],.13,t<.36?'在下柜顶面对齐两枚定位销':'对准销孔，垂直放下上柜');
      if(!before('stackStraps')){
        const u=cycle(at('stackStraps'),j,2),strap=makeSpace([sign*.389,H,-.1418],axis(Y,Math.PI));
        if(u>0){
          emit(strap,'strap-'+j,'101827',[0,0,.048*(1-part(u,0,.26))],I,here('stackStraps'));
          for(const [k,y] of [-.016,.016].entries()){
            const v=cycle(clamp((u-.26)/.74),k,2);
            if(v>0)screw(strap,'strap-screw-'+j+'-'+k,'109535',[0,y,.003],Z,v,here('stackStraps')&&v<1);
          }
          if(here('stackStraps')&&u<1)detail(strap,[0,0,.004],[.35,.38,1],.079,'连接片跨在上下柜的水平接缝上');
        }
      }
      if(!before('stackWall'))for(const [k,baseY] of [0,H].entries()){
        const u=cycle(at('stackWall'),2*k+j,4);
        wallFix(world,'stack-wall-'+k+'-'+j,[sign*.30,baseY+H-.009-.020,-.1116],u,here('stackWall'));
      }
    }
    emit(lower,'lower-back','back',[0,0,-.131]);
    if(here('stackStraps'))scene.mainView=[-.9,.6,-1.8];
  }
  if(routeId==='rack'&&!before('rackBottom')){
    const rackY=.625, bottom=.288;
    for(const [s,reflected] of [false,true].entries()){
      const frame=makeSpace([0,0,0],I,reflected);
      emit(frame,'rack-'+s,'rackSide',[-.417,rackY,0]);
      for(const [j,z] of [-.126,.126].entries()){
        for(const top of [false,true]){
          if(top&&j!==1)continue;
          const stage=top?'rackTop':'rackBottom';
          if(before(stage))continue;
          const n=top?s:s*2+j,u=cycle(at(stage),n,top?2:4);
          if(!u)continue;
          const mount=child(frame,[-.400,bottom+(top?H+.001:-.001),z],top?axis(X,Math.PI):I);
          emit(mount,'support-'+stage+'-'+n,'10095544',[.038*(1-part(u,0,.32)),0,0],I,here(stage));
          if(here(stage)&&u<1){
            const contact=[0,-.005,0];
            detail(mount,contact,[1,.45,.9],.060,u<.32?'将背面双销插入立柱':u<.60?'锥尖穿过螺孔标记':'拧紧支托固定螺钉');
            if(u>.32&&u<.60)tool(mount,'awl',contact,X,(u-.32)/.28);
          }
          if(u>.60)screw(mount,'support-screw-'+stage+'-'+n,'109560',[.003,-.005,0],X,(u-.60)/.40,here(stage)&&u<1);
          const binding=top?'rackSecure':'rackLower';
          if(j===1&&!before(binding)){
            const pct=top?at(binding):clamp((at(binding)-.80)/.20);
            const v=cycle(pct,s,2);
            if(v>0){
              const p=[.012,-.003,0],out=[0,-1,0],active=here(binding)&&v<1;
              screw(mount,'support-deck-'+binding+'-'+n,'100404',p,out,v,active);
              if(active)detail(mount,p,[1,-.65,.6],.076,top?'从支托向下锁住柜顶':'从支托向上锁住柜底');
            }
          }
        }
      }
      if(!before('rackWall')){
        // The long slot takes the wood screw; the short round-hole leaf lies against the wall.
        const u=cycle(at('rackWall'),s,2),fix=child(frame,[-.400,rackY+.608,-.1495],[.5,.5,.5,.5]);
        if(u>0){
          emit(fix,'rack-wall-bracket-'+s,'102646',[0,0,.034*(1-part(u,0,.2))],I,here('rackWall'));
          if(u>.2)screw(fix,'rack-wall-fixing-'+s,'wallFixing',[0,.003,.016],Y,part(u,.2,.45),false);
          if(u>.45&&u<.65)tool(fix,'awl',[0,.022,0],Z,(u-.45)/.20);
          if(u>.65)screw(fix,'rack-wood-screw-'+s,'108458',[0,.022,.003],Z,(u-.65)/.35,here('rackWall')&&u<1);
          if(here('rackWall')&&u<1)detail(fix,[0,.009,.012],[.6,1,1],.085,u<.45?'固定角码墙端':u<.65?'从长槽中标出立柱孔位':'将角码锁在立柱上');
        }
      }
    }
    if(here('rackLower')&&t<.80)scene.cue='对准四个下支托，将柜体垂直放下';
  }
  function doors() {
    if(before('cups'))return;
    const carry=at('hang'),prep=at('cups');
    for(const [s,space] of sides.entries()){
      const u=cycle(carry,s,2);
      const raised=s===0&&here('height')?.005*part(t,.30,.7):0;
      const frontShift=s===0&&here('depth')?.006*part(t,.30,.7):0;
      const sideways=s===0&&here('gap')?.004*part(t,.35,.72):0;
      // The cup's large entry hole is 10 mm farther down the arm than its seated point.
      const seatX=-.3808, seatZ=.147;
      const align=part(u,0,.38),enter=part(u,.38,.58),slide=part(u,.58,.73);
      const swivel=sideways/.052;
      const q=product(axis(Y,swivel),product(axis(X,Math.PI/2*(1-align)),axis(Y,-Math.PI/2*align)));
      const prepCenter=[-.22,-.367,.67];
      const flatCup=add(prepCenter,turn(axis(X,Math.PI/2),[-.171,0,-.009]));
      const service=s===0&&here('spacer');
      const liftOff=service?.027*(part(t,0,.26)-part(t,.68,.96))-.0015*part(t,.68,.96):0;
      const lock=[seatX+.0083,raised,.095];
      const target=add(lock,turn(axis(Y,swivel),[-.0083,0,seatZ-.095]));
      const cup=mix(flatCup,add(target,[.042*(1-enter)+liftOff,0,.010*(1-slide)+frontShift]),align);
      const origin=add(cup,mul(turn(q,[-.171,0,-.009]),-1));
      const door=child(space,origin,q);
      emit(door,'door-'+s,'door',[0,0,0],I,here('hang')&&u<1||here('cups')||!!(raised||frontShift||sideways));
      for(const [h,y] of hingeHeights.entries()){
        const n=s*2+h,v=cycle(prep,n,4);
        if(!v)continue;
        const arm=child(door,[-.171,y,-.009],axis(Y,Math.PI/2));
        const loose=.040*(1-part(v,0,.29));
        emit(arm,'cup-'+n,'109336',[loose,0,0],I,here('cups')&&v<1||here('hang')&&u<1);
        for(const [j,dy] of [-.022,.022].entries()){
          const driven=cycle(clamp((v-.29)/.71),j,2);
          if(driven<=0)continue;
          screw(arm,'wing-screw-'+n+'-'+j,'100344',[.0025,dy,0],X,driven,here('cups')&&driven<1);
        }
        if(here('cups')&&v<1)detail(arm,[loose,0,0],[1,.55,1],.078,v<.29?'铰杯嵌入门背圆窝':'两翼各用一颗 100344');
        if(here('hang')&&Math.min(1,Math.floor(t*2))===s){
          const j=Math.min(1,Math.floor(clamp((u-.73)/.27)*2));
          if(h===(u<.73?1:j)){
            const hit=[-.382+.0015+.012,y,.095];
            const f=cycle(clamp((u-.73)/.27),h,2);
            if(u>=.73)tool(space,'screwdriver',hit,X,f);
            const title=u<.38?'托住柜门，对齐上下两个铰臂':u<.58?'让大圆孔套过螺钉头':u<.73?'沿槽平移，让螺杆进入窄口':'十字刀对准槽内的锁紧螺钉';
            detail(space,u<.38?point(makeSpace(origin,q),[-.171,y,-.009]):hit,[1,.44,.74],u<.38?.15:.069,title);
          }
        }
      }
      if(s===0 && ['height','depth','gap'].includes(current.id)){
        const base=[-.382+.0015+.012,.31,.095];
        let p;
        if(here('height')){
          const phase=t<.30?t/.30:(t-.70)/.30;
          const sameScrew=Math.floor(clamp(phase)*2)===0?-.016:.016;
          p=[-.382+.0015+.003,.31+sameScrew,.095];
          if(t<.30||t>.70)tool(space,'screwdriver',p,X,(clamp(phase)*2)%1);
        }else{
          const secondary=here('gap')&&t>.29&&t<.73;
          p=secondary?add([lock[0],.31,lock[2]],turn(axis(Y,swivel),[.0147-.0083,0,.052-.034])):base;
          if(t<.29||t>.73||secondary)tool(space,'screwdriver',p,X,t<.29?t/.29:t>.73?(t-.73)/.27:(t-.29)/.44);
        }
        const cue=t<.29?'松开固定螺钉':t>.73?'重新锁紧':here('height')?'沿底座长孔上下移动':here('depth')?'沿铰臂前后滑移':'转动臂上的调节螺钉，修正左右门缝';
        detail(space,p,[1,.4,.7],.074,cue);
      }
    }
    if(here('cups')){if(routeId==='wall'){scene.focus=[0,centerY-.10,.39];scene.radius=.88}
      else{scene.focus[2]=.20;scene.radius=Math.max(scene.radius,1.23)}
      scene.mainView=[.68,1.45,1.8]}
  }
  doors();
  if(!before('shelves')){
    for(const [layer,level] of [-.128,.128].entries()){
      const u=cycle(at('shelves'),layer,2);
      if(!u)continue;
      for(const [s,space] of sides.entries())for(const [j,z] of [-.09,.09].entries()){
        const n=s*2+j,progress=cycle(clamp(u/.65),n,4);
        if(!progress)continue;
        const p=[shelfPinX+.040*(1-progress),level,z];
        emit(space,'shelf-pin-'+layer+'-'+n,'101532',p,normal(X),here('shelves')&&progress<1);
        if(here('shelves')&&progress<1)detail(space,p,[1,.38,1],.070,'同一层四个托销对齐到等高孔位');
      }
      if(u>.65){
        const p=[0,level+shelfOffset+.075*(1-part(u,.65,1)),0];
        emit(cabinet,'shelf-'+layer,'shelf',p,I,here('shelves')&&u<1);
        if(here('shelves')&&u<1)detail(cabinet,[-.37,p[1]-.008,.09],[.7,.4,1],.09,'将搁板水平落到四个托销上');
      }
    }
  }
  if(here('hang') || here('shelves') || current.optional){
    scene.focus[2]=here('hang')?.28:.18;
    if(routeId==='wall')scene.radius=here('hang')?.96:.76;
  }
  if(!detailSet && preview){
    let sample=t<.5?.02:.98;
    if(here('secondSide'))sample=t>.69?.65:.02;
    if(here('rackLower'))sample=.87;
    const f=sceneAt(routeId,index,sample,false);
    scene.detailFocus=f.detailFocus;scene.detailRadius=f.detailRadius;scene.detailView=f.detailView;
  }
  return scene;
}
