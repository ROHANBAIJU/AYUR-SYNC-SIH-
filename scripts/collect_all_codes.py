#!/usr/bin/env python3
"""
collect_all_codes.py

Walks the workspace tree and writes the contents of all text files into a single
file named "all codes.txt" in the workspace root. Each file is prefixed with its
absolute path and a separator for easy navigation.

Usage:
    python collect_all_codes.py [--root PATH] [--out PATH] [--max-size MB]

Defaults:
    root: workspace directory containing this script's parent (defaults to project root)
    out:  "all codes.txt" in root

The script skips common venv / binary / git folders and avoids huge files.
"""
import os
import sys
import argparse
import time
from pathlib import Path

SKIP_DIRS = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', '.pytest_cache', 'dist', 'build'}
BINARY_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.zip', '.tar', '.gz', '.bz2', '.exe', '.dll', '.so', '.pyc', '.db'}
TEXT_EXT_WHITELIST = None  # None -> attempt to read everything as text (safe fallback)

def is_binary_name(name):
    ext = Path(name).suffix.lower()
    return ext in BINARY_EXTS


def collect(root: Path, out_path: Path, max_size_mb: float=5.0, excludes=None):
    start = time.strftime('%Y-%m-%d %H:%M:%S')
    out_path.parent.mkdir(parents=True, exist_ok=True)
    max_bytes = int(max_size_mb * 1024 * 1024)
    total_files = 0
    written_files = 0
    with out_path.open('w', encoding='utf-8', errors='replace') as out:
        out.write(f"All Codes Export\nGenerated: {start}\nRoot: {str(root)}\n\n")
        for dirpath, dirnames, filenames in os.walk(root):
            # filter out skip dirs in-place so os.walk won't traverse them
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fname in filenames:
                total_files += 1
                fpath = Path(dirpath) / fname
                # Skip if under any exclude path
                if excludes:
                    skip = False
                    for ex in excludes:
                        try:
                            if Path(fpath).resolve().is_relative_to(ex):
                                skip = True
                                break
                        except Exception:
                            # fallback for Python <3.9: compare parts
                            if str(fpath).startswith(str(ex)):
                                skip = True
                                break
                    if skip:
                        continue
                try:
                    # skip obvious binary extensions
                    if is_binary_name(fname):
                        continue
                    stat = fpath.stat()
                    if stat.st_size > max_bytes:
                        # skip very large files
                        out.write(f"=== SKIPPED (too large): {fpath} ({stat.st_size} bytes) ===\n\n")
                        continue
                    # attempt to read as text
                    with fpath.open('r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                except (PermissionError, OSError) as e:
                    out.write(f"=== SKIPPED (error opening): {fpath} -> {e} ===\n\n")
                    continue

                out.write('='*80 + '\n')
                out.write(f'FILE: {fpath}\n')
                out.write('-'*80 + '\n')
                out.write(content)
                if not content.endswith('\n'):
                    out.write('\n')
                out.write('\n')
                written_files += 1

    print(f"Scanned files: {total_files}; Written files: {written_files}; Output: {out_path}")


def main():
    parser = argparse.ArgumentParser(description='Collect all code/text files into one file.')
    parser.add_argument('--root', '-r', help='Root directory to walk', default=None)
    parser.add_argument('--out', '-o', help='Output file path', default=None)
    parser.add_argument('--max-size', '-m', help='Max file size to include (MB)', type=float, default=5.0)
    parser.add_argument('--exclude', '-e', help='Paths to exclude (can be used multiple times)', action='append', default=[])
    args = parser.parse_args()

    script_path = Path(__file__).resolve()
    default_root = script_path.parent.parent.resolve()
    root = Path(args.root).resolve() if args.root else default_root
    out = Path(args.out).resolve() if args.out else (root / 'all codes.txt')

    # Build exclude list: either from CLI or interactive prompt
    excludes = [Path(p).resolve() for p in args.exclude] if args.exclude else []
    if not excludes:
        print('\nNo exclude paths passed. If you want to exclude specific absolute paths (one per line), enter them now.')
        print('When finished, press Enter on an empty line to continue. Leave empty to exclude none.')
        while True:
            try:
                line = input('Exclude path (absolute) > ').strip()
            except EOFError:
                break
            if not line:
                break
            p = Path(line)
            if not p.is_absolute():
                print('  -> Skipping (please enter an absolute path).')
                continue
            excludes.append(p.resolve())
        if excludes:
            print('\nWill exclude:')
            for ex in excludes:
                print('  -', ex)
        else:
            print('\nNo exclude paths set; scanning entire root.')

    collect(root, out, max_size_mb=args.max_size, excludes=excludes)

if __name__ == '__main__':
    main()
