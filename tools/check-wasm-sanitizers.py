"""Run ASan/UBSan/LSan under Node; useful when host sanitizer runtimes fail."""
import os
import pathlib
import shutil
import subprocess
ROOT = pathlib.Path(__file__).resolve().parents[1]
work = ROOT/'work/wasm-sanitizers'; work.mkdir(parents=True, exist_ok=True)
env = {**os.environ, 'EM_NODE_JS': shutil.which('node') or 'node'}
flags = ['-g', '-O1', '-fsanitize=address,undefined', '-I'+str(ROOT/'include'), '-I'+str(ROOT/'src')]
core = [ROOT/'src'/f'{name}.c' for name in ['scanner', 'compiler', 'runtime', 'json', 'sample']]
def run(args):
    subprocess.run([str(a) for a in args], cwd=ROOT, env=env, check=True, timeout=120)
run(['emcc', *flags, *core, ROOT/'tests/test_core.c', '-sENVIRONMENT=node', '-sALLOW_MEMORY_GROWTH=1', '-o', work/'core.js'])
run(['node', work/'core.js'])
run(['emcc', *flags, *core, ROOT/'tests/fuzz_smoke.c', '-sENVIRONMENT=node', '-sALLOW_MEMORY_GROWTH=1', '-o', work/'mutations.js'])
run(['node', work/'mutations.js'])
objects = []
for source in core:
    obj = work/(source.stem+'.o'); objects.append(obj)
    run(['emcc', *flags, '-Dmalloc=qode_test_malloc', '-Dcalloc=qode_test_calloc', '-Drealloc=qode_test_realloc', '-c', source, '-o', obj])
run(['emcc', *flags, *objects, ROOT/'tests/test_allocations.c', '-sENVIRONMENT=node', '-sALLOW_MEMORY_GROWTH=1', '-o', work/'allocations.js'])
run(['node', work/'allocations.js'])
