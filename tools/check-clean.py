"""Verify a source-only copy without stashing or changing the user's Git tree."""
import os
import pathlib
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
work = ROOT/'work'; work.mkdir(exist_ok=True)
env = {**os.environ, 'EM_NODE_JS': shutil.which('node') or 'node'}
with tempfile.TemporaryDirectory(prefix='clean-', dir=work) as directory:
    clean = pathlib.Path(directory)
    ignored = shutil.ignore_patterns('node_modules', 'dist', 'wasm', '__pycache__', 'test-results', 'playwright-report')
    for folder in ['src', 'include', 'examples', 'tests', 'tools', 'docs', 'web', '.github']:
        shutil.copytree(ROOT/folder, clean/folder, ignore=ignored)
    for filename in ['CMakeLists.txt', 'Makefile', 'start.sh', 'LICENSE', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', '.clang-format', '.editorconfig', '.gitignore']:
        shutil.copy2(ROOT/filename, clean/filename)
    commands = [
        ['cmake', '-S', '.', '-B', 'build/native', '-DCMAKE_BUILD_TYPE=Release'],
        ['cmake', '--build', 'build/native', '--parallel', '4'],
        ['ctest', '--test-dir', 'build/native', '--output-on-failure'],
        ['make', 'wasm'],
        ['node', 'tests/test_wasm.mjs'],
        ['npm', '--prefix', 'web', 'ci'],
        ['npm', '--prefix', 'web', 'run', 'format:check'],
        ['npm', '--prefix', 'web', 'run', 'build'],
    ]
    for command in commands:
        print('+', ' '.join(command), flush=True)
        subprocess.run(command, cwd=clean, env=env, check=True, timeout=180)
print('Source-only clean build, tests, native/Wasm parity, npm ci, and web production build passed')
