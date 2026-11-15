"""Generate original, scalable Xiangqi artwork and native PNG assets."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1] / 'assets/chess'
ROOT.mkdir(parents=True, exist_ok=True)

def save(name, width, height, content):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">{content}</svg>'
    target = ROOT / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.with_suffix('.svg').write_text(svg)
    subprocess.run(['rsvg-convert', '-o', str(target.with_suffix('.png')), str(target.with_suffix('.svg'))], check=True)

wood = '''<defs><linearGradient id="wood" x2="1" y2="1"><stop stop-color="#f5d39a"/><stop offset=".48" stop-color="#eac18a"/><stop offset="1" stop-color="#c98f52"/></linearGradient></defs>'''
grain = ''.join(f'<path d="M {x} 0 Q {x-30} 260 {x+8} 550 T {x-8} 1120" fill="none" stroke="#9c632c" opacity=".055" stroke-width="{2+x%4}"/>' for x in range(10, 1000, 13))
lines = ''
for y in range(10):
    lines += f'<path d="M 76 {76+y*100} H 876"/>'
for x in range(9):
    xx = 76+x*100
    lines += f'<path d="M {xx} 76 V 476 M {xx} 576 V 976"/>'
lines += '<path d="M 76 476 V 576 M 876 476 V 576 M 376 76 L 576 276 M 576 76 L 376 276 M 376 776 L 576 976 M 576 776 L 376 976"/>'
marks = ''
for x,y in [(1,2),(7,2),(1,7),(7,7)]+[(x,y) for y in (3,6) for x in range(0,9,2)]:
    for dx in (-1,1):
        if (x==0 and dx==-1) or (x==8 and dx==1): continue
        for dy in (-1,1):
            xx,yy=76+x*100,76+y*100
            marks += f'<path d="M {xx+dx*19} {yy+dy*7} H {xx+dx*7} V {yy+dy*19}"/>'
save('board',952,1052,wood+'<rect x="3" y="3" width="946" height="1046" rx="16" fill="url(#wood)" stroke="#a56d39" stroke-width="6"/>'+grain+'<rect x="62" y="62" width="828" height="928" fill="none" stroke="#a77745" stroke-width="6"/><g fill="none" stroke="#a77745" stroke-width="2.5">'+lines+marks+'</g><g fill="#90643c" font-family="Kaiti SC,STKaiti,KaiTi,serif" font-size="48" text-anchor="middle"><text x="276" y="543">楚 河</text><text x="676" y="543">漢 界</text></g>')
labels={'red':['帥','仕','相','馬','車','炮','兵'],'black':['將','士','象','馬','車','砲','卒']}
for side,names in labels.items():
    color='#923829' if side=='red' else '#303735'
    for kind,label in zip(['king','advisor','elephant','horse','rook','cannon','pawn'],names):
        save(f'pieces/{side}-{kind}',160,168,f'''<defs><radialGradient id="face" cx=".35" cy=".25" r=".8"><stop stop-color="#ffe5ad"/><stop offset=".65" stop-color="#f4cb85"/><stop offset="1" stop-color="#d99b51"/></radialGradient><linearGradient id="rim" x2="0" y2="1"><stop stop-color="#fff0c8"/><stop offset=".5" stop-color="#d9a35f"/><stop offset="1" stop-color="#98602d"/></linearGradient></defs><ellipse cx="83" cy="91" rx="69" ry="69" fill="#44240e" opacity=".2"/><circle cx="80" cy="85" r="69" fill="url(#rim)" stroke="#99632e" stroke-width="2"/><circle cx="80" cy="77" r="67" fill="url(#face)" stroke="#ffe6b1" stroke-width="3"/><circle cx="80" cy="77" r="56" fill="none" stroke="{color}" stroke-width="2.3"/><circle cx="80" cy="77" r="61" fill="none" stroke="#ad753b" opacity=".5"/><text x="80" y="102" text-anchor="middle" font-family="Kaiti SC,STKaiti,KaiTi,serif" font-size="79" font-weight="600" fill="{color}">{label}</text>''')
save('table',640,960,'<rect width="640" height="960" fill="#634329"/>'+''.join(f'<path d="M {x} 0 Q {x-18} 200 {x+4} 480 T {x-6} 960" fill="none" stroke="'+('#a67a48' if x%2 else '#382616')+f'" opacity=".12" stroke-width="{x%5+1}"/>' for x in range(0,660,7)))
print('Generated board, table, and 14 piece designs (SVG + PNG).')
