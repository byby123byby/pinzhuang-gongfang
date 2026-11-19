"""Extract the IVAR preparation illustrations for the shared academy layout."""
from pathlib import Path
import fitz
from PIL import Image

root=Path(__file__).resolve().parent
dest=root/'player/public/prep'
dest.mkdir(parents=True,exist_ok=True)
doc=fitz.open(root/'source/manual.pdf')
def crop(n,coords):
    pix=doc[n-1].get_pixmap(clip=fitz.Rect(*(x/1.15 for x in coords)), matrix=fitz.Matrix(1.55,1.55))
    return Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
a=crop(5,[43,688,632,896]);b=crop(6,[38,32,640,453])
w=930; a.thumbnail((420,250));b.thumbnail((500,270))
plate=Image.new('RGB',(w,275),'white')
plate.paste(a,(0,(275-a.height)//2));plate.paste(b,(430,(275-b.height)//2))
plate.save(dest/'hardware.png')
for label,box in [('wall',[42,483,639,666]),('help',[42,262,640,450])]:
    crop(5,box).save(dest/(label+'.png'))
# These boxes are on the 115% page proof; each opens the corresponding source page.
items={
 '100214':(5,[45,685,112,866]),'101350':(5,[115,742,167,863]),'101532':(5,[176,778,229,863]),
 '100344':(5,[241,793,293,863]),'100404':(5,[298,792,349,863]),'100101':(5,[354,728,459,860]),
 '102646':(5,[466,730,573,863]),'108458':(5,[578,775,633,862]),
 '10095544':(6,[39,32,180,186]),'109560':(6,[192,109,255,190]),
 '109336':(6,[277,41,617,181]),'109535':(6,[566,118,613,190]),
 '109220':(6,[37,219,179,424]),'10078170':(6,[201,217,347,425]),'101827':(6,[363,337,532,425]),
 'screwdriver':(5,[234,62,277,209]),'awl':(5,[283,62,326,209]),
 'top':(6,[145,574,489,771]),'bottom':(6,[64,677,344,821]),'side':(7,[93,208,294,336]),
 'back':(7,[109,514,433,730]),'door':(17,[36,246,464,459]),'shelf':(18,[79,313,405,573]),
 'rackSide':(13,[65,344,188,768])
}
import json
for name,(page,box) in items.items():
    cutout=crop(page,box)
    if name=='109336':
        from PIL import ImageDraw
        factor=1.55/1.15
        ImageDraw.Draw(cutout).rectangle(((565-box[0])*factor,(115-box[1])*factor,cutout.width,cutout.height),fill='white')
    cutout.save(dest/(name+'-source.png'))
(dest/'sources.json').write_text(json.dumps({name:page for name,(page,box) in items.items()}))
