"""Assemble the current production builds under one offline project directory."""
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile

source = Path(__file__).resolve().parent
work = source.parent
outputs = work.parent / 'outputs'
delivery = outputs / '拼装工坊'
site = delivery / 'site'
covers = site / 'covers'
covers.mkdir(parents=True, exist_ok=True)
for name in ['index.html', 'catalog.css', 'return.css', 'collection.css', 'collection.js']:
    shutil.copy2(source / name, site / name)
shutil.copytree(source/'covers', covers, dirs_exist_ok=True)
shutil.copy2(source / '启动拼装工坊.command', delivery / '启动拼装工坊.command')

back = '<a class="academy-return" href="../">← 拼装图鉴</a>'
projects = [
    ('cottage', work / 'cottage-production/dist', '<span class="edition">小小建筑收藏集 <i>／</i> 海边系列</span>'),
    ('lack', work / 'manual-pipeline/app/dist', '<span class="header-note">装配手记</span>'),
]
for route, build, original in projects:
    project = build.parent
    subprocess.run([project/'node_modules/.bin/vite', 'build', '--base', './'], cwd=project, check=True)
    target = site / route
    shutil.copytree(build, target, dirs_exist_ok=True)
    for stale in (target/'assets').glob('index-*'):
        if stale.suffix in {'.css','.js'} and not (build/'assets'/stale.name).exists():
            stale.unlink()
    html = (build / 'index.html').read_text()
    if html.count(original) != 1:
        raise ValueError(f'{route}: project navigation changed')
    html = html.replace(original, back).replace('</head>', '<link rel="stylesheet" href="../return.css"><link rel="stylesheet" href="../collection.css"><script type="module" src="../collection.js"></script>\n</head>')
    html = html.replace('class="brand" href="./"', 'class="brand" href="../"')
    (target / 'index.html').write_text(html)

subprocess.run([sys.executable,work/'ivar-pilot/publish.py'],check=True)
shutil.copy2(work/'ivar-pilot/assembly/cover.png',covers/'ivar.png')
archive = outputs / '拼装工坊-三项目离线版.zip'
with zipfile.ZipFile(archive.with_suffix('.partial'), 'w', zipfile.ZIP_DEFLATED, compresslevel=4) as package:
    for path in sorted(delivery.rglob('*')):
        if path.is_file() and not path.name.startswith('.') and not path.match('index [0-9]*.html'):
            package.write(path, path.relative_to(outputs))
archive.with_suffix('.partial').replace(archive)
print(archive)
