"""Build the IVAR viewer into the existing local academy website."""
from pathlib import Path
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parent
site = root.parents[1] / 'outputs/拼装工坊/site'
player = root / 'player'
target = site / 'ivar'
prep=player/'public/prep'
subprocess.run([sys.executable,root/'prep_images.py'],check=True)
final_lib=root/'model/library-aholo.glb'
final_types=root/'model/types-aholo.json'
views=root/'model'/('views-final' if final_lib.exists() else 'views')
posters=player/'public/posters'
posters.mkdir(exist_ok=True)
for src in views.glob('*-front.png'):
    shutil.copy2(src,posters/(src.name.removesuffix('-front.png')+'.png'))
for tool in ['awl','screwdriver']:
    shutil.copy2(views/f'{tool}-front.png',prep/f'{tool}.png')
subprocess.run([player/'node_modules/.bin/vite','build','--base','./'],cwd=player,check=True)
shutil.copytree(player/'dist',target,dirs_exist_ok=True)
academy = root.parent/'academy'
for name in ('collection.css','collection.js'):
    shutil.copy2(academy/name,site/name)
covers = site/'covers'
covers.mkdir(exist_ok=True)
for route in ('stack','rack'):
    shutil.copy2(academy/'covers'/f'ivar-{route}.png',covers/f'ivar-{route}.png')
shutil.copy2(root/'assembly/cover.png',covers/'ivar.png')
html = target/'index.html'
html.write_text(html.read_text().replace('</head>','<link rel="stylesheet" href="../collection.css"><script type="module" src="../collection.js"></script></head>'))
for stale in (target/'assets').glob('index-*'):
    if stale.suffix in {'.css','.js'} and not (player/'dist/assets'/stale.name).exists():
        stale.unlink()
for name,source in {
    'library.glb':final_lib if final_lib.exists() else root/'model/library.glb','types.json':final_types if final_lib.exists() else root/'model/types.json',
    'inventory.json':root/'inventory.json','manual.pdf':root/'source/manual.pdf',
    'studio.hdr':root.parent/'manual-pipeline/app/public/aholo/studio.hdr',
}.items():
    shutil.copy2(source,target/name)
shutil.copytree(root/'source/pages',target/'pages',dirs_exist_ok=True)
subprocess.run([sys.executable,root/'build.py'],check=True)

legacy=site/'ivar-review/index.html'
legacy.parent.mkdir(parents=True,exist_ok=True)
legacy.write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=../ivar/"><title>宜家 IVAR · 拼装工坊</title><a href="../ivar/">打开 IVAR 装配说明书</a></html>')
