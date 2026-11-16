"""Fail on diagnostics, including analyzer warnings that exit with status zero."""
import os
import pathlib
import subprocess
import sys
root = pathlib.Path(__file__).resolve().parents[1]
for name in ['scanner', 'compiler', 'runtime', 'json', 'sample', 'cli', 'wasm']:
    command = [os.environ.get('CC', 'clang'), '--analyze', '-std=c11', '-Iinclude', '-Isrc', '-Werror', '-Xanalyzer', '-analyzer-output=text', f'src/{name}.c', '-o', os.devnull]
    result = subprocess.run(command, cwd=root, capture_output=True, text=True)
    output = result.stdout + result.stderr
    if result.returncode or 'warning:' in output or 'error:' in output:
        print(output, file=sys.stderr)
        raise SystemExit(result.returncode or 1)
print('Static analysis: no diagnostics across seven implementation files')
