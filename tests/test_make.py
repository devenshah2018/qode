"""Exercise Make recipes with Emscripten's cmake directory ahead of CMake."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MakeRecipes(unittest.TestCase):
    def test_cmake_directory_on_path(self):
        make = os.environ.get('QODE_TEST_MAKE') or shutil.which('make')
        if not make:
            self.skipTest('make is not installed')
        with tempfile.TemporaryDirectory(prefix='qode make ') as temporary:
            work = Path(temporary)
            shutil.copyfile(ROOT / 'Makefile', work / 'Makefile')
            shadow = work / 'emscripten'
            (shadow / 'cmake').mkdir(parents=True)
            tools = work / 'tools with spaces'
            tools.mkdir()
            cmake = tools / 'cmake'
            cmake.write_text('''#!/bin/sh
printf '%s\\n' "$*" >> "$QODE_MAKE_LOG"
if [ "$1" = '--build' ] && [ "$2" = 'build/wasm' ]; then
    mkdir -p build/wasm
    printf 'loader' > build/wasm/qode.js
    printf 'wasm' > build/wasm/qode.wasm
fi
''', encoding='utf-8')
            cmake.chmod(0o755)
            wrapper = tools / 'emcmake'
            wrapper.write_text(
                f'#!{sys.executable}\nimport subprocess, sys\n'
                'sys.exit(subprocess.call(sys.argv[1:]))\n', encoding='utf-8')
            wrapper.chmod(0o755)
            env = dict(os.environ)
            env.pop('CMAKE', None)
            env.pop('MAKEFLAGS', None)
            log = work / 'cmake.log'
            env['QODE_MAKE_LOG'] = str(log)
            env['PATH'] = os.pathsep.join([str(shadow), str(tools), env['PATH']])
            for target in ['all', 'wasm', 'clean']:
                with self.subTest(target=target):
                    result = subprocess.run([make, target], cwd=work, env=env,
                                            capture_output=True, text=True)
                    self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual((work / 'web/public/wasm/qode.js').read_text(), 'loader')
            self.assertEqual((work / 'web/public/wasm/qode.wasm').read_text(), 'wasm')
            self.assertIn('--build build/native --parallel', log.read_text())
            self.assertIn('--build build/wasm --parallel', log.read_text())
            # A caller can select a specific executable, including a path with spaces.
            result = subprocess.run([make, 'wasm', f'CMAKE={cmake}'], cwd=work,
                                    env=env, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
