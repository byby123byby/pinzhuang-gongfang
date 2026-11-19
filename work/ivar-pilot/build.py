"""Build an offline IVAR reading study directly from the verified manual and inventory."""
import base64
from collections import defaultdict
from html import escape
import json
from pathlib import Path

import fitz

root = Path(__file__).resolve().parent
target = root.parents[1] / 'outputs/拼装工坊/site/ivar/notes/index.html'
inventory = json.loads((root / 'inventory.json').read_text())
pdf = '../manual.pdf'
doc = fitz.open(root / 'source/manual.pdf')


def image(page, box):
    # Crop coordinates refer to the 115% reference pages used for visual inspection.
    rect = fitz.Rect(*(coord / 1.15 for coord in box))
    pixels = doc[page - 1].get_pixmap(matrix=fitz.Matrix(2.6, 2.6), clip=rect)
    return 'data:image/png;base64,' + base64.b64encode(pixels.tobytes('png')).decode()


def reference(page):
    return f'<a class="ref" href="{pdf}#page={page}" target="_blank" rel="noreferrer">第 {page} 页 ↗</a>'


def details(title, content):
    return f'<details><summary>{title}</summary>{content}</details>'


def build():
    template = (root / 'study.html').read_text()
    frames = [
        ('把底座装到柜侧', 9, (318, 385, 638, 575), '先把薄垫片 10078170 贴在柜侧内壁，再叠上底座 109220。上下孔各拧入一颗 100344，左右两侧共装四处。'),
        ('把铰杯装到门背', 17, (395, 36, 642, 275), '门背朝上，把 109336 的杯体放进大圆窝，铰臂伸向这扇门的外缘。两翼各用一颗 100344，每扇门装两只。'),
        ('让螺钉头穿过大孔', 17, (468, 475, 635, 616), '托住打开的柜门，让铰臂末端的大圆孔套过底座上预装的螺钉头。此处用手对位。'),
        ('沿窄槽滑入', 17, (468, 616, 635, 743), '沿原图箭头平移铰臂，让螺杆进入窄槽。螺钉头此时压在槽口外侧。'),
        ('用十字刀锁紧', 17, (465, 743, 637, 902), '保持铰臂就位，将十字刀尖对准刚滑入槽中的那颗螺钉，拧紧。两扇门共接合四处。')
    ]
    frame_data = [dict(name=name, page=page, image=image(page, box), text=text)
                  for name, page, box, text in frames]
    groups = defaultdict(list)
    for step in inventory['steps']:
        entry = f'{escape(step["action"])} <small class="meta">{escape(step["tools"])}</small> {reference(step["page"])}'
        groups[step['route']].append('<li>' + entry + '</li>')
    groups['装入侧架'] += groups.pop('侧架防倾倒')
    titles = {'柜体':'共同准备 · 组装柜体', '单柜壁挂':'路线一 · 单柜壁挂', '双柜叠放':'路线二 · 双柜叠放', '装入侧架':'路线三 · 装入 IVAR 侧架', '门与搁板':'三条路线汇合 · 装门与搁板'}
    route_html = ''.join(details(title, '<ul class="rows">' + ''.join(groups[key]) + '</ul>') for key, title in titles.items())
    adjustments = [
        ('门顶一高一低', 19, (54, 105, 635, 330), '松开底座的固定螺钉，沿竖向长孔调整门的高度，再锁紧。'),
        ('两扇门前后不齐', 19, (54, 365, 635, 590), '松开铰臂长槽上的锁紧螺钉，沿臂前后滑动，再锁紧。'),
        ('左右门缝不匀', 19, (54, 620, 635, 847), '松开锁紧螺钉，旋转臂上另一颗调节螺钉修正门缝，再锁紧。'),
        ('合门时边缘相碰', 20, (96, 634, 594, 870), '第 20 页给出了此时的处理方法：拆下底座，取出薄垫片 10078170，再固定底座。'),
    ]
    adjust_html = ''.join(details(title, f'<p>{text} {reference(page)}</p><img style="width:100%;max-height:240px;object-fit:contain;background:white" alt="{title}原图" src="{image(page, box)}">') for title, page, box, text in adjustments)
    items = ''.join(f'<li>{part["name"]} <small>{part["id"]}</small> × {part["quantity"]}</li>' for part in inventory['kit'])
    replacements = {
        '__FRAMES__': json.dumps(frame_data, ensure_ascii=False),
        '__BUTTONS__': ''.join(f'<button type="button"><b>{i:02}</b>{row[0]}</button>' for i, row in enumerate(frames, 1)),
        '__ITEM5__': image(5, (42, 680, 642, 901)), '__ITEM6__': image(6, (38, 32, 639, 450)),
        '__ROUTES__': route_html, '__ADJUST__': adjust_html, '__INVENTORY__': '<ul class="rows">' + items + '</ul>',
        '__PDF__': pdf,
    }
    for key, value in replacements.items():
        template = template.replace(key, value)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(template)


if __name__ == '__main__':
    build()
