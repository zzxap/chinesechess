"""Render the original 将 + AI vector mark into each platform's app icons.
Requires Python Pillow, fontTools and cairosvg. Existing app icon slots are replaced.
"""
from pathlib import Path
import io
import json
from PIL import Image, ImageDraw
import cairosvg
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/app-icon'
ART.mkdir(parents=True, exist_ok=True)


def glyph_path(font_path, character, x, y, width, height, color, font_number=0):
    font = TTFont(font_path, fontNumber=font_number)
    glyphs = font.getGlyphSet()
    glyph = glyphs[font.getBestCmap()[ord(character)]]
    bounds = BoundsPen(glyphs)
    glyph.draw(bounds)
    left, bottom, right, top = bounds.bounds
    scale = min(width / (right-left), height / (top-bottom))
    tx = x + (width - (right-left)*scale)/2 - left*scale
    ty = y + (height - (top-bottom)*scale)/2 + top*scale
    pen = SVGPathPen(glyphs)
    glyph.draw(pen)
    return f'<path d="{pen.getCommands()}" transform="translate({tx} {ty}) scale({scale} {-scale})" fill="{color}"/>'


songti = '/System/Library/Fonts/Supplemental/Songti.ttc'
latin = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
mark = glyph_path(songti, '将', 250, 319, 490, 468, '#342c23')
mark += glyph_path(latin, 'A', 735, 109, 90, 100, '#fff0c9')
mark += glyph_path(latin, 'I', 841, 109, 28, 100, '#fff0c9')
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<title>中国象棋 AI — 将</title>
<defs>
 <linearGradient id="table" x2="1" y2="1"><stop stop-color="#573a29"/><stop offset="1" stop-color="#2d201a"/></linearGradient>
 <radialGradient id="wood" cx=".33" cy=".22" r=".85"><stop stop-color="#ffe7b1"/><stop offset=".65" stop-color="#e9bf7c"/><stop offset="1" stop-color="#cb8c45"/></radialGradient>
 <linearGradient id="edge" x2="0" y2="1"><stop stop-color="#ffe4a3"/><stop offset=".5" stop-color="#c18a48"/><stop offset="1" stop-color="#88512c"/></linearGradient>
 <linearGradient id="badge" x2="0" y2="1"><stop stop-color="#b64b36"/><stop offset="1" stop-color="#842d25"/></linearGradient>
</defs>
<rect width="1024" height="1024" fill="url(#table)"/>
<rect x="29" y="29" width="966" height="966" rx="160" fill="none" stroke="#b0824a" stroke-width="3" opacity=".5"/>
<path d="M 60 260 H 964 M 60 765 H 964 M 260 60 V 964 M 764 60 V 964" stroke="#d0a46a" stroke-width="3" opacity=".08"/>
<ellipse cx="505" cy="610" rx="390" ry="357" fill="#1e130e" opacity=".35"/>
<circle cx="495" cy="568" r="382" fill="url(#edge)" stroke="#926034" stroke-width="6"/>
<circle cx="495" cy="544" r="377" fill="url(#wood)" stroke="#ffedc4" stroke-width="7"/>
<circle cx="495" cy="544" r="340" fill="none" stroke="#8b6037" stroke-width="3" opacity=".6"/>
<circle cx="495" cy="544" r="321" fill="none" stroke="#4d4030" stroke-width="7"/>
<path d="M 195 420 Q 465 372 785 420 M 177 590 Q 440 550 812 590 M 228 724 Q 500 688 757 724" fill="none" stroke="#a36c37" stroke-width="3" opacity=".09"/>
<rect x="692" y="71" width="247" height="189" rx="49" fill="#1d140f" opacity=".3"/>
<rect x="684" y="60" width="247" height="189" rx="49" fill="url(#badge)" stroke="#f0cd8e" stroke-width="6"/>
{mark}
</svg>'''
(ART / 'app-icon.svg').write_text(svg)
master = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert('RGB')
master.save(ART / 'app-icon-1024.png')


def png(path, size, rounded=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    image = master.resize((size, size), Image.Resampling.LANCZOS)
    if rounded:
        image = image.convert('RGBA')
        mask = Image.new('L', (size, size))
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size-1, size-1), radius=size*.19, fill=255)
        image.putalpha(mask)
    image.save(path)


def catalog(relative, ipad=False, mac=False):
    folder = ROOT / relative
    data = json.loads((folder / 'Contents.json').read_text())
    if ipad:
        for size in ['20x20', '29x29', '40x40', '76x76']:
            for scale in ['1x', '2x']:
                data['images'].append({'idiom':'ipad', 'size':size, 'scale':scale})
        data['images'].append({'idiom':'ipad', 'size':'83.5x83.5', 'scale':'2x'})
    # Deduplicate slots so running this script again does not grow the catalog.
    data['images'] = list({(v['idiom'],v['size'],v['scale']):v for v in data['images']}.values())
    for item in data['images']:
        pixels = round(float(item['size'].split('x')[0])*float(item['scale'][:-1]))
        item['filename'] = f'icon-{pixels}.png'
        if mac:
            canvas = Image.new('RGBA', (pixels, pixels))
            logo = master.resize((round(pixels*.88), round(pixels*.88)), Image.Resampling.LANCZOS).convert('RGBA')
            mask = Image.new('L', logo.size)
            ImageDraw.Draw(mask).rounded_rectangle((0,0,logo.width-1,logo.height-1),radius=logo.width*.2,fill=255)
            canvas.paste(logo, ((pixels-logo.width)//2, (pixels-logo.height)//2), mask)
            canvas.save(folder / item['filename'])
        else:
            png(folder / item['filename'], pixels)
    (folder / 'Contents.json').write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')


catalog('ios/ChineseChess/Images.xcassets/AppIcon.appiconset', ipad=True)
catalog('macos/ChineseChess-macOS/Assets.xcassets/AppIcon.appiconset', mac=True)
res = ROOT / 'android/app/src/main/res'
for density, size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    folder = res / f'mipmap-{density}'
    png(folder / 'ic_launcher.png', size, rounded=True)
    circular = master.resize((size,size),Image.Resampling.LANCZOS).convert('RGBA')
    mask=Image.new('L',(size,size))
    ImageDraw.Draw(mask).ellipse((0,0,size-1,size-1),fill=255)
    circular.putalpha(mask)
    circular.save(folder / 'ic_launcher_round.png')
# A padded foreground keeps the full mark inside adaptive launcher masks.
foreground=Image.new('RGBA',(432,432))
logo=master.resize((264,264),Image.Resampling.LANCZOS).convert('RGBA')
mask=Image.new('L',logo.size)
ImageDraw.Draw(mask).rounded_rectangle((0,0,263,263),radius=52,fill=255)
foreground.paste(logo,(84,84),mask)
(res / 'drawable-nodpi').mkdir(exist_ok=True)
foreground.save(res / 'drawable-nodpi/ic_launcher_foreground.png')
(res / 'mipmap-anydpi-v26').mkdir(exist_ok=True)
for name in ['ic_launcher','ic_launcher_round']:
    (res / f'mipmap-anydpi-v26/{name}.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background" />
  <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
''')
(res / 'values/icon_colors.xml').write_text('''<resources><color name="ic_launcher_background">#38271D</color></resources>
''')
store=master.resize((512,512),Image.Resampling.LANCZOS)
store.save(ART / 'android-play-store-512.png')
for name in ['ChineseChess.ico','small.ico']:
    master.save(ROOT / 'windows/ChineseChess' / name, format='ICO', sizes=[(s,s) for s in [16,20,24,32,40,48,64,128,256]])
images=ROOT / 'windows/ChineseChess.Package/Images'
for file,size in [('StoreLogo.png',50),('Square150x150Logo.scale-200.png',300),('Square44x44Logo.scale-200.png',88),('Square44x44Logo.targetsize-24_altform-unplated.png',24),('LockScreenLogo.scale-200.png',48)]:
    png(images / file,size,rounded=True)
for file,dimensions,side in [('Wide310x150Logo.scale-200.png',(620,300),240),('SplashScreen.scale-200.png',(1240,600),360)]:
    canvas=Image.new('RGB',dimensions,'#38271d')
    canvas.paste(master.resize((side,side),Image.Resampling.LANCZOS),((dimensions[0]-side)//2,(dimensions[1]-side)//2))
    canvas.save(images / file)
public=ROOT / 'public'
public.mkdir(exist_ok=True)
png(public / 'icon-192.png',192)
png(public / 'icon-512.png',512)
png(public / 'apple-touch-icon.png',180)
master.save(public / 'favicon.ico',format='ICO',sizes=[(s,s) for s in [16,32,48,64]])
print('Generated 将 + AI icons for iOS, macOS, Android, Windows and web')
