"""
Vetoriza um logo de jogo em camadas de cor, por componente conexo.

Gerou `public/games/firered.svg` a partir do PNG/WebP do logo. Fica versionado
para o SVG ser reproduzível, não para rodar no build.

Uso: pip install pillow numpy scipy potracer && python3 scripts/vectorize-logo.py
"""
from PIL import Image, ImageFilter
from scipy import ndimage
import numpy as np
import potrace

import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else 'logo.webp'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'public/games/firered.svg'
a = np.array(Image.open(SRC).convert('RGBA')).astype(np.int16)
H, W = a.shape[:2]
r, g, b = a[..., 0], a[..., 1], a[..., 2]
opaque = a[..., 3] > 128
mx, mn = a[..., :3].max(2), a[..., :3].min(2)

# Camadas exclusivas, da mais externa para a mais interna em cada logo.
LAYERS = {
    'branco':      opaque & (mn > 165),
    'amarelo':     opaque & (r > 140) & ((r - b) > 60),
    'azul':        opaque & ((b - r) > 25) & (mx > 110),
    'azul_fundo':  opaque & ((b - r) > 25) & (mx <= 110),
    'escuro':      opaque & (mx <= 110) & ((b - r) <= 25),
}
# Exclusividade: a primeira regra que casar fica com o pixel.
taken = np.zeros((H, W), bool)
for name in ['branco', 'amarelo', 'azul', 'azul_fundo', 'escuro']:
    LAYERS[name] &= ~taken
    taken |= LAYERS[name]

def median_hex(mask):
    px = a[mask][:, :3]
    c = np.median(px, axis=0).astype(int)
    return '#%02x%02x%02x' % tuple(c)

COLORS = {k: median_hex(v) for k, v in LAYERS.items() if v.any()}

lab, _ = ndimage.label(opaque, structure=np.ones((3, 3)))
GROUPS = {
    'wordmark': lab == 1,   # "Pokémon"
    'version': lab == 2,    # "FireRed Version"
}
# Ordem de pintura em cada grupo, do fundo para a frente.
STACK = {
    'wordmark': ['azul_fundo', 'azul', 'amarelo', 'escuro'],
    'version': ['escuro', 'branco'],
}

def dilate(mask, n=1):
    img = Image.fromarray((mask * 255).astype(np.uint8))
    for _ in range(n):
        img = img.filter(ImageFilter.MaxFilter(3))
    return np.array(img) > 127

def to_path(mask):
    # O construtor do potracer inverte o bitmap; entregamos invertido.
    path = potrace.Bitmap(~mask).trace(turdsize=8, alphamax=1.0, opticurve=True, opttolerance=0.25)
    out = []
    for curve in path:
        sp = curve.start_point
        out.append(f'M{sp.x:.1f} {sp.y:.1f}')
        for seg in curve:
            e = seg.end_point
            if seg.is_corner:
                c = seg.c
                out.append(f'L{c.x:.1f} {c.y:.1f}L{e.x:.1f} {e.y:.1f}')
            else:
                c1, c2 = seg.c1, seg.c2
                out.append(f'C{c1.x:.1f} {c1.y:.1f} {c2.x:.1f} {c2.y:.1f} {e.x:.1f} {e.y:.1f}')
        out.append('Z')
    return ''.join(out)

parts = []
for group, gmask in GROUPS.items():
    stack = STACK[group]
    for i, name in enumerate(stack):
        cumulative = np.zeros((H, W), bool)
        for later in stack[i:]:
            cumulative |= LAYERS[later] & gmask
        if not cumulative.any():
            continue
        d = to_path(dilate(cumulative, 1))
        print(f'{group:9s} {name:11s} {COLORS[name]}  {len(d)/1024:5.1f} kB')
        parts.append(f'<path fill="{COLORS[name]}" d="{d}"/>')

svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">%s</svg>'
    % (W, H, ''.join(parts))
)
open(OUT, 'w').write(svg)
print('total:', round(len(svg) / 1024, 1), 'kB')
