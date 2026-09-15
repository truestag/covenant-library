#!/usr/bin/env python3
"""Compatibility wrapper for the seven-book acquisition build.

The historical Sifrei text export contains at least one empty repeated section
heading. Empty source headings are skipped, while all non-empty source text is
preserved and duplicate non-empty headings are merged instead of overwritten.
"""
from __future__ import annotations
import importlib.util
import re
from pathlib import Path

base = Path(__file__).with_name('acquire-seven-json.py')
spec = importlib.util.spec_from_file_location('covenant_acq', base)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def parse_sifrei(text):
    matches = list(re.finditer(r'(?m)^Paragraph\s+(\d+)\s*$', text))
    if not matches:
        raise ValueError('No Sifrei Paragraph headings')
    chapters = {}
    for i, match in enumerate(matches):
        number = match.group(1)
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        parts = mod.blocks(text[match.end():end].splitlines())
        if not parts:
            continue
        if number not in chapters:
            chapters[number] = mod.segs(parts, f'Paragraph {number}')
        else:
            start = len(chapters[number]) + 1
            for j, part in enumerate(parts, start):
                chapters[number].append({
                    'v': str(j), 'label': str(j), 'text': part,
                    'sourceRef': f'Paragraph {number}:{j}',
                })
    if not chapters:
        raise ValueError('Sifrei contains no readable paragraphs')
    return chapters

mod.parse_sifrei = parse_sifrei
mod.main()
