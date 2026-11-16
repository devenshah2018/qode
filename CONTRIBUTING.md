# Contributing

Qode is a small educational language. Contributions should improve correctness, explainability, or its compact implementation. Keep new language features bounded and supply a motivating example.

## Setup and checks

Build native code with the README commands. Install numerical dependencies into a local virtual environment:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r tests/requirements.txt
.venv/bin/python tests/test_numerical.py build/native/qode
```

For the browser:

```sh
npm --prefix web ci
make wasm
npm --prefix web run build
npm --prefix web exec -- playwright install
npm --prefix web test
node tests/test_wasm.mjs
```

Use C11 with `.clang-format` (clang-format 21.1.8), TypeScript strict mode, and existing API ownership conventions. Do not use fast-math or add runtime quantum SDK dependencies. Python/Qiskit is a development-only independent oracle. Source distributions retain GPL-2.0 and third-party package licenses.

## Changes

Add a failing behavioral test first. Gates require a reference matrix, operand-order coverage, complex input states, and numerical comparison. Measurement/control changes require collapse/correlation tests and sampling coverage. Browser changes need keyboard and mobile checks. Update the language reference and migration notes for intentional syntax/API changes.

Run the relevant tests once after the final code change. Use sanitizers, allocation-failure schedules, and fuzzing for parser/runtime changes. See `docs/VERIFICATION.md` for commands and host sanitizer limitations. Never claim platform coverage from a workflow that has not run.

Do not commit generated native binaries, Wasm glue, node_modules, local backups, or build artifacts. Keep unrelated user changes intact. Describe the concrete behavior, evidence, numerical tolerance, and any limitations in your pull request.
