#!/usr/bin/env python3
"""Exercise the shipped CLI and compiled app's public branding."""

import argparse
import json
from pathlib import Path
import plistlib
import re
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cli', type=Path, required=True)
    parser.add_argument('--app', type=Path)
    args = parser.parse_args()

    def output(*command):
        result = subprocess.run(
            [str(args.cli.resolve()), *command],
            capture_output=True, text=True, timeout=20, check=True,
        )
        return re.sub(r'\x1b\[[0-9;]*m', '', result.stdout)

    version = output('--version')
    assert version.startswith('taffy '), version
    assert output('version') == version
    help_text = output('--help')
    assert help_text.startswith('taffy - '), help_text[:200]
    for command in [(), ('workspace',), ('browser',), ('config',), ('settings',), ('theme',)]:
        text = output(*command, '--help')
        assert not re.search(r'(?m)^\s*(?:Usage:\s*)?cmux\s', text), text
    welcome = output('welcome')
    assert 'taffy' in welcome.lower(), welcome
    assert 'github.com/cs50victor/taffy' in welcome, welcome
    assert 'manaflow.com' not in welcome and 'cmux.com' not in welcome, welcome
    paths = output('settings', 'path')
    assert '.config/taffy/' in paths and '.config/cmux/' not in paths, paths

    if args.app:
        with (args.app / 'Contents/Info.plist').open('rb') as stream:
            info = plistlib.load(stream)
        assert info['CFBundleIdentifier'] == 'com.cs50victor.taffy', info
        assert info['CFBundleName'] == 'Taffy', info
        helper = args.app / 'Contents/Library/Taffy Computer Use.app/Contents/Info.plist'
        with helper.open('rb') as stream:
            helper_info = plistlib.load(stream)
        assert helper_info['CFBundleDisplayName'] == 'Taffy Computer Use', helper_info
        assert not (args.app / 'Contents/Library/cmux Computer Use.app').exists()
        for locale in ['en', 'de', 'fr', 'ar', 'es', 'zh-Hant', 'zh-Hans', 'ko', 'ja']:
            path = args.app / f'Contents/Resources/{locale}.lproj/Localizable.strings'
            catalog = json.loads(subprocess.check_output(
                ['/usr/bin/plutil', '-convert', 'json', '-o', '-', str(path)], text=True,
            ))
            assert catalog['about.appName'] == 'Taffy', (locale, catalog['about.appName'])
            assert 'taffy' in catalog['command.installCLI.title'].lower(), locale
            for key in ['menu.app.about', 'settings.app.openSupportedFilesInCmux.subtitle',
                        'settings.computerUse.enabled.note']:
                assert 'cmux' not in catalog[key].lower(), (locale, key, catalog[key])
    print(f'PASS: Taffy CLI and branding checks ({version.strip()})')


if __name__ == '__main__':
    main()
