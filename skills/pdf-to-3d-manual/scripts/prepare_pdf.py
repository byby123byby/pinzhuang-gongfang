#!/usr/bin/env python3
"""Preserve a PDF and render all pages for evidence-based assembly analysis."""

import argparse
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import fitz


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--revision', default=None)
    args = parser.parse_args()
    source, output, document = validate_input(args.pdf, args.output)
    output.mkdir(parents=True, exist_ok=True)
    (output / 'pages').mkdir()
    (output / 'text').mkdir()
    shutil.copyfile(source, output / 'manual.pdf')
    pages = []
    with document:
        for index, page in enumerate(document, start=1):
            image_path = f'pages/page-{index:04d}.png'
            text_path = f'text/page-{index:04d}.txt'
            text = page.get_text('text')
            page.get_pixmap(dpi=144, alpha=False).save(output / image_path)
            (output / text_path).write_text(text, encoding='utf-8')
            pages.append({'page': index, 'image': image_path, 'text': text_path,
                          'sizePoints': [page.rect.width, page.rect.height],
                          'textCharacters': len(text)})
    manifest = {
        'schemaVersion': 'manual-source/v1',
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'sourceName': source.name,
        'localPdf': 'manual.pdf',
        'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'pageCount': len(pages),
        'revision': args.revision,
        'renderDpi': 144,
        'textMethod': 'embedded_pdf_text_without_ocr',
        'interpretationStatus': 'not_performed',
        'pages': pages,
    }
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'manifest': str(output / 'manifest.json'), 'pageCount': len(pages),
                      'interpretationStatus': 'not_performed'}, ensure_ascii=False))


def validate_input(pdf, output):
    source, destination = pdf.expanduser().resolve(), output.expanduser().resolve()
    if destination.exists() and (not destination.is_dir() or any(destination.iterdir())):
        raise SystemExit('Output must be a new or empty directory; existing evidence will not be overwritten.')
    document = fitz.open(source)
    if not document.is_pdf or document.needs_pass or document.page_count == 0:
        document.close()
        raise SystemExit('Input must be an accessible, non-empty PDF without a required password.')
    return source, destination, document


if __name__ == '__main__':
    main()
