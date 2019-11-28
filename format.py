#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import subprocess

format_exts = ['h', 'm', 'mm', 'html']

def print_help():
    print('usage: %s      : format changed files' % sys.argv[0])
    print('       %s all  : format all files' % sys.argv[0])
    print('       %s help : print help' % sys.argv[0])

def format_files(files):
    targets = []
    for file in files:
        if not file:
            continue
        ext = file[file.rfind('.') + 1:]
        if ext in format_exts:
            targets.append(file)
    print('\n'.join(targets))
    proc = subprocess.run(['clang-format', '-i'] + targets)

if len(sys.argv) == 1:
    proc = subprocess.run(['git', 'ls-files', '--other', '--modified', '--exclude-standard'], capture_output=True)
    out = proc.stdout.decode('utf-8')
    files = out.split('\n')
    format_files(files)
elif sys.argv[1] == 'all':
    cmd = ['find', '.']
    for ext in format_exts:
        cmd.append('-name')
        cmd.append('*.' + ext)
        cmd.append('-or')
    if cmd[-1] == '-or':
        cmd.pop()
    proc  = subprocess.run(cmd, capture_output=True)
    out = proc.stdout.decode('utf-8')
    files = out.split('\n')
    format_files(files)
    exit(proc.returncode)
elif 'help' in sys.argv[1]:
    print_help()
else:
    print_help()
    exit(1)
