"""Every fenced Qode example in the handbook must compile and execute."""
import json
import pathlib
import re
import subprocess
import sys
root = pathlib.Path(__file__).resolve().parents[1]
exe = str(pathlib.Path(sys.argv[1] if len(sys.argv)>1 else root/'build/native/qode').resolve())
count = 0
for document in (root/'docs').glob('*.md'):
    for index, source in enumerate(re.findall(r'^```qode\n(.*?)^```',document.read_text(encoding='utf-8'),re.M|re.S),1):
        run = subprocess.run([exe,'run','-','--json'], input=source, capture_output=True, text=True, encoding='utf-8', timeout=10)
        if run.returncode:
            raise AssertionError(f'{document.name} example {index}: {run.stderr}')
        assert abs(json.loads(run.stdout)['norm']-1)<1e-9, document
        count += 1
print(f'{count} handbook Qode examples compiled and executed with normalized states')
