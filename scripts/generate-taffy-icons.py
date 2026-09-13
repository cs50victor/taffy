#!/usr/bin/env python3
"""Render Taffy's vector artwork into the macOS icon assets (requires resvg)."""
import json
from pathlib import Path
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
art = root / 'Resources/Branding/Taffy.svg'
for directory in (root / 'Assets.xcassets').glob('AppIcon*.appiconset'):
    catalog = json.loads((directory / 'Contents.json').read_text())
    for item in catalog['images']:
        pixels = int(item['size'].split('x')[0]) * int(item['scale'][0])
        subprocess.run(['resvg', '--width', str(pixels), str(art), str(directory / item['filename'])], check=True)
for name in ['AppIconLight', 'AppIconDark']:
    subprocess.run(['resvg', str(art), str(root / f'Assets.xcassets/{name}.imageset/{name}.png')], check=True)
composer = root / 'AppIcon.icon'
shutil.copyfile(root / 'Resources/Branding/TaffyMark.svg', composer / 'Assets/TaffyMark.svg')
(composer / 'icon.json').write_text(json.dumps({
    'fill': {'linear-gradient': ['extended-srgb:0.09020,0.09020,0.09020,1', 'extended-srgb:0.09020,0.09020,0.09020,1']},
    'groups': [{'layers': [{'glass': False, 'image-name': 'TaffyMark.svg', 'name': 'Taffy ribbon'}],
                'shadow': {'kind': 'none', 'opacity': 0}, 'translucency': {'enabled': False, 'value': 0}}],
    'supported-platforms': {'squares': 'shared'},
}, indent=2) + '\n')
print('Rendered Taffy app, Dock, light, dark, debug, and nightly icons.')
