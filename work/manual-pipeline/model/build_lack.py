import bpy, json, math, struct, hashlib
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix

ROOT = Path(__file__).resolve().parent
EVIDENCE = json.loads((ROOT.parent / 'references/lack-evidence.json').read_text())
POSITIONS = [(-.425, -.25), (.425, -.25), (-.425, .25), (.425, .25)]
MARK_Y=.213
template_drawing=json.loads((ROOT/'template-cutouts.json').read_text())
mark_u,mark_v=template_drawing['mark']
# PDF p5 seats one side of the strip against a leg edge, with a free strip of wood on the other side.
template_half_width=.025/(1+mark_u)
template_length=MARK_Y/mark_v
mark_x=mark_u*template_half_width
FLANGE_Y=.225
SHELF_Y=.2335
objects = []
instances = []

def xyz(p):
    return Vector((p[0], -p[2], p[1]))

def material(name, color, metal=0):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1)
    m.use_nodes = True; p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = .38 if metal else .66
    p.inputs['Metallic'].default_value = metal
    return m

def box(center, size, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(center))
    o = bpy.context.object; o.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    if bevel:
        m=o.modifiers.new('Soft manufactured edges','BEVEL');m.width=bevel;m.segments=4
        bpy.ops.object.modifier_apply(modifier=m.name)
    return o

def cylinder(center, radius, depth, axis, mat, vertices=96):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=xyz(center))
    o = bpy.context.object; o.rotation_euler=xyz(axis).to_track_quat('Z','Y').to_euler()
    o.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    return o

def prism_profile(name, points, depth_axis, low, high, mat):
    verts=[]
    for depth in (low,high):
        for a,b in points:
            p=(a,b,depth) if depth_axis=='z' else (a,depth,b)
            verts.append(xyz(p))
    count=len(points);faces=[tuple(reversed(range(count))),tuple(range(count,2*count))]
    faces += [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    obj.select_set(False)
    return obj

def subtract(obj,cutter,name='Visible opening'):
    bpy.context.view_layer.objects.active=obj
    mod=obj.modifiers.new(name,'BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)

def soften_openings(obj, width=.00008):
    bpy.context.view_layer.objects.active=obj
    bevel=obj.modifiers.new('Fine aperture rim','BEVEL');bevel.width=width;bevel.segments=3;bevel.limit_method='ANGLE';bevel.angle_limit=.5
    bpy.ops.object.modifier_apply(modifier=bevel.name)


def shallow_line(name, points):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=.00012;curve.bevel_resolution=2
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for point,p in zip(spline.points,points):point.co=(*xyz(p),1)
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(steel)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
    return bpy.context.object

def join_instance(name, type_id, parts, home):
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:p.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    if len(parts)>1:bpy.ops.object.join()
    o=parts[0];o.name=name
    bpy.context.scene.cursor.location=xyz(home)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    objects.append(o);instances.append({'id':name,'typeId':type_id,'nodeName':name,'home':list(home),'rotation':[0,0,0]})
    return o

def lathe(name, origin, axis, profile, mat):
    direction=xyz(axis).normalized()
    basis=direction.cross(Vector((1,0,0)) if abs(direction.x)<.9 else Vector((0,1,0))).normalized()
    other=direction.cross(basis)
    verts=[];faces=[];segments=96
    for distance,radius in profile:
        for j in range(segments):
            angle=2*math.pi*j/segments
            verts.append(xyz(origin)+direction*distance+radius*(basis*math.cos(angle)+other*math.sin(angle)))
    for row in range(len(profile)-1):
        for j in range(segments):
            k=row*segments+j;n=row*segments+(j+1)%segments
            faces.append((k,n,n+segments,k+segments))
    faces.extend([tuple(reversed(range(segments))),tuple((len(profile)-1)*segments+j for j in range(segments))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)
    for face in mesh.polygons:face.use_smooth=True
    return obj

def helix(origin,axis,start,end,shaft_length,double=False):
    direction=xyz(axis).normalized()
    basis=direction.cross(Vector((1,0,0)) if abs(direction.x)<.9 else Vector((0,1,0))).normalized();other=direction.cross(basis)
    pitch=.0016;count=max(24,int((end-start)/pitch*32));vertices=[];faces=[]
    for j in range(count+1):
        distance=start+(end-start)*j/count;angle=2*math.pi*(distance-start)/pitch
        taper=min(1,(shaft_length-distance)/.0035,distance/.0035 if double else 1)
        root=(.00145 if double else .0011)*max(.03,taper);crest=root+(.0005 if double else .00045)*max(.03,taper)
        radial=basis*math.cos(angle)+other*math.sin(angle)
        for offset,radius in [(-pitch*.23,root),(0,crest),(pitch*.23,root)]:
            vertices.append(xyz(origin)+direction*(distance+offset)+radial*radius)
    for j in range(count):
        for k in range(3):faces.append((j*3+k,j*3+(k+1)%3,(j+1)*3+(k+1)%3,(j+1)*3+k))
    faces.extend([(2,1,0),(count*3,count*3+1,count*3+2)])
    mesh=bpy.data.meshes.new('Continuous helical thread');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new('Continuous helical thread',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(steel)
    for face in mesh.polygons:face.use_smooth=True
    return obj

def screw(name, type_id, head, axis, length, double=False):
    profile=[(0,.00002),(.0035,.00145),(length-.0035,.00145),(length,.00002)] if double else [(0,.0011),(length-.0035,.0011),(length,.00002)]
    parts=[lathe('Pointed screw shaft',head,axis,profile,steel)]
    if double:
        middle=length/2
        parts.extend([helix(head,axis,.0005,middle-.001,length,True),helix(head,axis,middle+.001,length-.0005,length,True),lathe('Central collar',head,axis,[(middle-.0006,.00145),(middle-.0004,.00215),(middle+.0004,.00215),(middle+.0006,.00145)],steel)])
    else:
        parts.append(helix(head,axis,.001,length-.0005,length))
        headmesh=lathe('Rounded pan head',head,axis,[(-.0026,.0028),(-.0024,.0035),(-.0018,.004),(-.0006,.004),(0,.0035)],steel)
        orient=xyz(axis).to_track_quat('Z','Y')
        for rot in (0,math.pi/2):
            bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(Vector(head)-Vector(axis)*.0023))
            cut=bpy.context.object;cut.dimensions=(.005,.0011,.0015)
            cut.rotation_euler=(orient @ Quaternion((0,0,1),rot)).to_euler()
            bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
            bpy.context.view_layer.objects.active=headmesh
            mod=headmesh.modifiers.new('Cross recess','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut
            bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
        soften_openings(headmesh,.00006)
        parts.append(headmesh)
    return join_instance(name,type_id,parts,head)

def action(kind,targets,offset,axis=(0,1,0),turns=0,**kw):
    return {'kind':kind,'targets':targets,'offset':list(offset),'endOffset':[0,0,0],'axis':list(axis),'turns':turns,**kw}

bpy.ops.wm.read_factory_settings(use_empty=True)
wood=material('LACK black-brown laminate',(.065,.047,.036))
steel=material('Schematic plated steel',(.52,.56,.60),.65)
template_mat=material('Reusable light-grey template',(.66,.68,.70),.15)
top=box((0,.425,0),(.9,.05,.55),wood,.001)
for x,z in POSITIONS:subtract(top,cylinder((x,.409,z),.0015,.021,(0,1,0),steel),'PDF p4 underside hole')
soften_openings(top,.00010)
join_instance('top-1','tabletop',[top],(0,.425,0))
shelf=box((0,SHELF_Y,0),(.9,.015,.45),wood,.0005)
for x,z in POSITIONS:subtract(shelf,cylinder((x,.229,z-math.copysign(.043,z)),.0012,.012,(0,1,0),steel),'PDF p7 shelf corner hole')
soften_openings(shelf,.00010)
join_instance('shelf-1','shelf',[shelf],(0,SHELF_Y,0))
for n,(x,z) in enumerate(POSITIONS,1):
    leg=box((x,.2,z),(.05,.4,.05),wood,.0007)
    subtract(leg,cylinder((x,.393,z),.0015,.023,(0,1,0),steel),'Leg top mating hole: functional inference')
    soften_openings(leg,.00010)
    join_instance(f'leg-{n}','leg',[leg],(x,.2,z))
    screw(f'dowel-{n}','115980',(x,.3825,z),(0,1,0),.035,True)
    sign=1 if z>0 else -1
    face=sign*.224
    home=(x,.224,face)
    if n==1:
        vertical=box((x,MARK_Y,face),(.024,.022,.002),steel,.0005)
        subtract(vertical,cylinder((x,MARK_Y,face),.0034,.012,(0,0,1),steel),'Leg-side round fixing hole')
        outline=[(-.012,0),(.012,0),(.012,.017)]
        outline += [(.012*math.cos(t),.017+.012*math.sin(t)) for t in [math.pi*j/96 for j in range(1,97)]]
        profile=[(x+u,face-sign*v) for u,v in outline]
        horizontal=prism_profile('Arched slotted face',profile,'y',FLANGE_Y-.001,FLANGE_Y+.001,steel)
        for v in (.011,.023):subtract(horizontal,cylinder((x,FLANGE_Y,face-sign*v),.0027,.012,(0,1,0),steel),'Central long slot rounded end')
        subtract(horizontal,box((x,FLANGE_Y,face-sign*.017),(.0054,.012,.012),steel),'Central long slot')
        for u in (-.0075,.0075):subtract(horizontal,cylinder((x+u,FLANGE_Y,face-sign*.017),.002,.012,(0,1,0),steel),'Flanking auxiliary round hole')
        soften_openings(vertical)
        soften_openings(horizontal)
        # Fine shallow parallel ribs reproduce the visible striped face, not a measured surface finish.
        for v in [.005+j*.0012 for j in range(17)]:
            for u in (-.010,.010):
                subtract(horizontal,box((x+u,FLANGE_Y-.00096,face-sign*v),(.003,.00012,.00020),steel),'Visible face line')
        arc=[(x+.007*math.cos(t),FLANGE_Y-.00115,face-sign*(.010+.007*math.sin(t))) for t in [math.pi+j*math.pi/32 for j in range(33)]]
        outline_ridge=shallow_line('PDF lower curved outline — approximate depth',arc)
        join_instance(f'bracket-{n}','120298',[vertical,horizontal,outline_ridge],home)
    else:
        # All four 120298 parts share one mesh; repeated world-space booleans lost one flange.
        bracket=bpy.data.objects['bracket-1'].copy()
        bracket.data=bracket.data.copy()
        bpy.context.collection.objects.link(bracket)
        if sign>0:bracket.data.transform(Matrix.Rotation(math.pi,4,'Z'))
        bracket.location=xyz(home)
        join_instance(f'bracket-{n}','120298',[bracket],home)
    screw(f'long-{n}','108530',(x,MARK_Y,sign*.220),(0,0,sign),.019)
    screw(f'short-{n}','109041',(x,.2225,sign*.207),(0,1,0),.012)
outline=[(-template_half_width,0),(template_half_width,0)]
outline.extend((u*template_half_width,v*template_length) for u,v in template_drawing['endProfile'])
template_strip=prism_profile('Template traced silhouette',outline,'z',-.00075,.00075,template_mat)
for polygon in template_drawing['polygons']:
    contour=[(u*template_half_width,v*template_length) for u,v in polygon]
    cutter=prism_profile('Traced arrow and window opening',contour,'z',-.004,.004,template_mat)
    subtract(template_strip,cutter,'PDF p3 traced cutout')
subtract(template_strip,cylinder((mark_x,MARK_Y,0),.0013,.01,(0,0,1),steel),'Small far-end marking hole')
soften_openings(template_strip,.00005)
join_instance('template-1','120938',[template_strip,box((0,-.001,.004),(2*template_half_width,.002,.009),template_mat)],(0,0,0))

part_types=[{'id':i['id'],'name':i['label'],'code':i['manufacturerPartNumber'],'quantity':i['quantity'],'isTool':i['category']=='reusable_assembly_tool','dimensionStatus':'illustrative; individual dimensions absent from PDF','evidence':i['evidence']} for i in EVIDENCE['inventory']]
for p in part_types:
    p['comparison']={'referenceImage':f"references/parts/{p['id']}.png",'modelImage':f"parts/{p['id']}.png",'page':3 if p['code'] else 7 if p['id']=='shelf' else 4}
features={'115980':['双尖端','无螺帽','连续螺旋','中段过渡环'],'108530':['较长杆','尖端','连续螺旋','圆头十字槽'],'109041':['较短杆','尖端','连续螺旋','圆头十字槽'],'120298':['L形折弯','圆拱端轮廓','长圆槽','两侧小圆孔','另一面圆孔','槽旁细纹'],'120938':['折边朝左俯视，①箭头向右，③和⑥箭头向下','②窄、⑤宽，均为同一凹腰窗口轮廓','末端横直边与单侧圆角','⑧为偏心定位孔','近端折钩抵住桌腿端面']}
for p in part_types:
    if p['code']:p['visualFeatures']={'sourcePage':3,'features':features[p['code']],'dimensions':'未提供，按图比例重建；细纹深度及螺距为视觉近似'}
# Move each shaft assembly as a unit to preserve the local triangles used by the Aholo UV transfer.
for item in instances:
    home=item['home']
    if item['typeId']=='108530':
        home[2]=math.copysign(.224-.001,home[2])  # outside of the leg-side bracket plate
    elif item['typeId']=='109041':
        home[1]=FLANGE_Y-.001  # underside of the shelf-side flange
    else:continue
    bpy.data.objects[item['nodeName']].location=xyz(home)
socket_offsets={}
bpy.context.view_layer.update()
for item in instances:
    if item['typeId'] not in ['108530','109041']:continue
    obj=bpy.data.objects[item['nodeName']];axis=(0,1,0) if item['typeId']=='109041' else (0,0,1 if item['home'][2]>0 else -1)
    origin=xyz(item['home']);direction=xyz(axis)
    hit,point,normal,face=obj.ray_cast(obj.matrix_world.inverted()@(origin-direction*.01),obj.matrix_world.to_3x3().inverted()@direction)
    assert hit,item['id']
    offset=(obj.matrix_world@point-origin).dot(direction)
    assert abs(offset+.00155)<.00001,offset
    socket_offsets[item['id']]=round(offset,8)
steps=[]
for s in EVIDENCE['steps']:
    n=s['number'];pose='inverted' if n<3 else 'sideA' if n<5 else 'sideB'
    step={'id':f's{n}','number':n,'title':s['title'],'instruction':s['instruction'],'pdfPages':[s['page']],'tools':[],'hardware':[f'{k} × {v}' for k,v in s['consumes'].items() if k.isnumeric()],'warnings':[],'pose':pose,'camera':{'position':[1.1,.9,1.2],'target':[0,.22,0]},'detail':{'target':[-.415,.112,-.21 if n<5 else .21],'position':[-.30,.24,.02 if n<5 else .43],'label':'连接局部'},'actions':[],'evidence':s['evidence']}
    step['camera']['position']=[1.1,-.7,1.2] if n<3 else [1.1,.22,1.2 if n<5 else -1.2]
    if n>=3:step['detail']['target']=[-.425,MARK_Y,-.224 if n<5 else .224]
    if n>=5:step['detail']['position']=[-.30,.06,-.02]
    if n==1:
        step['actions']=[action('install',[f'dowel-{i}' for i in range(1,5)],(0,-.10,0),turns=2)]
        step['instruction']='在软垫上倒放桌面，安装面朝上。用手将 4 枚双头螺钉分别旋入四角的孔。'
        step['detail']={'target':[-.425,.4,-.25],'position':[-.29,.28,-.10],'label':'115980 双头连接螺钉'}
    if n==2:
        step['actions']=[action('install',[f'leg-{i}' for i in range(1,5)],(0,-.18,0),turns=2)]
        step['instruction']='将桌腿端孔对准露出的螺钉，向下轻压并旋紧。其余三条腿依次装好。'
        step['detail']={'target':[-.425,.4,-.25],'position':[-.29,.28,-.10],'label':'桌腿与双头螺钉对位'}
    if n in [3,5]:
        indices=[1,2] if n==3 else [3,4]
        step['tools']=['120938 定位模板（同一个重复使用）','尖锥/打孔锥']
        step['instruction']=('将桌体侧放。' if n==3 else '把桌体翻到另一侧。')+'把定位模板的折边抵住腿端，用尖锥穿过小孔，在腿的内侧做标记。取下模板，在同侧另一条腿上重复。'
        step['actions']=[action('mark',['template-1'],(0,0,.05 if n==3 else -.05),tool={'id':'awl','contact':[mark_x,MARK_Y,.001],'outward':[0,0,-1]},orientation=[0,math.pi if n==3 else 0,0],placements=[[POSITIONS[i-1][0]+(mark_x if n==3 else -mark_x),0,(-.224 if n==3 else .224)] for i in indices])]
    if n in [4,6]:
        indices=[1,2] if n==4 else [3,4];sign=-1 if n==4 else 1
        step['tools']=['十字螺丝刀']
        step['instruction']='把角形连接件的圆孔对准腿上的标记，用十字螺丝刀旋入一枚长螺钉 108530。同侧另一条腿也装好一个连接件。'
        step['actions']=[action('install',[f'bracket-{i}' for i in indices],(0,.009,0))]+[action('install',[f'long-{i}'],(0,0,-sign*.019),(0,0,sign),2,tool={'id':'screwdriver','tipOffset':socket_offsets[f'long-{i}'],'driveDistance':.019*.75}) for i in indices]
    if n==7:
        step['actions']=[action('install',['shelf-1'],(0,-.18,0),startRotation=[.22,0,0])]
        step['instruction']='将搁板倾斜送入四条腿之间，放平，让四角的孔分别对准连接件的长孔。'
    if n==8:
        step['tools']=['十字螺丝刀'];step['actions']=[action('install',[f'short-{i}'],(0,-.08,0),turns=2,tool={'id':'screwdriver','tipOffset':socket_offsets[f'short-{i}'],'driveDistance':.012*.75}) for i in range(1,5)]
        step['instruction']='用十字螺丝刀将 4 枚短螺钉分别穿过连接件的长孔，固定搁板四角。装好后把桌子扶正。'
    steps.append(step)

manifest={'schemaVersion':1,'modelFile':'lack.glb','product':{'name':'LACK 茶几','article':'401.042.94','dimensionsMm':[900,450,550],'accuracyNote':'整体尺寸来自官方商品页；单件尺寸、孔位、螺纹和动作路径为说明用途的比例示意，不能用于钻孔、配五金或制造。'},'sources':[{'id':s['id'],'url':s['url'],'localPdf':'references/manual.pdf' if s['type']=='official_assembly_pdf' else None,'pageCount':s.get('pageCount'),'revision':s.get('documentId')} for s in EVIDENCE['sources']],'partTypes':part_types,'instances':instances,'initialInstalled':['top-1'],'steps':steps,'unknowns':[{'field':u['id'],'reason':u['description'],'impact':u['impact']} for u in EVIDENCE['unresolved']],'geometryEvidence':{'known':'Official overall900x550x450mm;6structuralpieces+16hardware;1reusabletool','illustrativeDimensionsMm':{'tabletop':[900,50,550],'leg':[50,400,50],'shelf':[900,15,450],'shelfBottomHeight':226,'bracketLateralInsetFromLegCenter':0,'templateLength':round(template_length*1000,2),'templateWidth':round(2*template_half_width*1000,2),'doubleEndedScrewLength':35,'longScrewLength':19,'shortScrewLength':12},'basis':'PDF p3 hardware outlines, p5 template approximately0.5–0.55 of leg length and a strip against one long leg edge, with the other edge of the leg exposed; p7/p8 shelf length near tabletop length; leg outer faces align tabletop edges. All are visual reconstruction, not measured dimensions.','coordinateSystem':'glTF Y-up; metres; assembled upright pose','legTopHoleEvidence':'Functional mating-hole inference from step2; not directly exposed by PDF. Leg side marking/drilling is not represented as a factory-pre-drilled hole.','mechanics':'Visible hardware morphology reconstructed from official PDF: pointed continuous helix; arched slotted bracket with flanking holes; traced template openings and hook. Exact metric thread/fit specifications are unavailable.'}}
manifest['toolAssets']={'file':'tools.glb','items':[{'id':'awl','nodeName':'awl','name':'尖锥'},{'id':'screwdriver','nodeName':'screwdriver','name':'十字螺丝刀'}]}
manifest['geometryEvidence']['toolContactAnchors']={'driveSockets':socket_offsets,'method':'Actual final Blender mesh central ray from outside head toward shaft; negative offset relative to head origin along install axis','templateLocalMarkHole':[mark_x,MARK_Y,0],'templateLocalWoodContact':[mark_x,MARK_Y,.001],'templateLocalOutward':[0,0,-1],'toolDimensions':'Auxiliary hand tools150mm total,80mm shaft and70mm grip; illustrative,not official specifications'}
(ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'lack.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'lack.glb'),export_format='GLB',use_selection=True)
permanent=[o for o in objects if o.name!='template-1']
points=[o.matrix_world@Vector(c) for o in permanent for c in o.bound_box]
sizes=[1000*(max(p[i] for p in points)-min(p[i] for p in points)) for i in range(3)]
assert len(objects)==23 and len(permanent)==22
assert all(abs(a-b)<.01 for a,b in zip(sizes,[900,550,450])),sizes
report={'status':'PASS','glbNodesExpected':23,'permanentInstances':22,'reusableTools':1,'assembledDimensionsMmYUp':[sizes[0],sizes[2],sizes[1]],'blenderVersion':bpy.app.version_string,'scope':'Node count and actual mesh bounds; topology/thread fit/physical collision not claimed'}
binary=(ROOT/'lack.glb').read_bytes()
json_length=struct.unpack_from('<I',binary,12)[0]
gltf=json.loads(binary[20:20+json_length])
assert {node['name'] for node in gltf['nodes']}=={item['nodeName'] for item in instances}
report.update(actualExportNodes=len(gltf['nodes']),nodeNamesMatchManifest=True,glbSha256=hashlib.sha256(binary).hexdigest())
(ROOT/'geometry-check.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
