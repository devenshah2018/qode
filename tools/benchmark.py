"""Run separate-process benchmarks; report medians without cross-machine claims."""
import datetime
import json
import pathlib
import platform
import statistics
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
exe = ROOT / 'build/native/qode_bench'
if sys.platform == 'win32':
    exe = exe.with_suffix('.exe')
rows = []
for n, gates, trace in [(8, 1000, 0), (12, 1000, 0), (16, 200, 0), (20, 100, 0), (12, 1000, 1)]:
    trials = [json.loads(subprocess.check_output([str(exe), str(n), str(gates), str(trace)], text=True)) for _ in range(5)]
    row = {'qubits': n, 'gates': gates, 'trace': bool(trace)}
    for key in ['compileMs', 'executeMs', 'sample10000Ms', 'peakRssBytes']:
        row[key] = statistics.median(t[key] for t in trials)
    rows.append(row)
report = {'date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'platform': platform.platform(), 'architecture': platform.machine(), 'processor': subprocess.check_output(['sysctl', '-n', 'machdep.cpu.brand_string'], text=True).strip() if sys.platform == 'darwin' else platform.processor(), 'compiler': subprocess.check_output(['cc', '--version'], text=True).splitlines()[0], 'build': 'CMake Release, -O3 -DNDEBUG; no fast-math; five fresh-process trials per case', 'results': rows}
output = ROOT/'docs/benchmark-results.json'; output.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
