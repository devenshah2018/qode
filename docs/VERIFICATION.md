# Verification

## Observed GitHub results

The following hosted results were checked on November 23, 2026. They apply to commit [`e3cbf606c5a34723300384ac963d8cb3145f25fa`](https://github.com/devenshah2018/qode/commit/e3cbf606c5a34723300384ac963d8cb3145f25fa), rather than every later change.

The [successful Verify run](https://github.com/devenshah2018/qode/actions/runs/45204290587) records:

| Job | Hosted evidence |
| --- | --- |
| Linux, GCC 13 | [Successful native build and tests; numerical and formatting checks](https://github.com/devenshah2018/qode/actions/runs/45204290587/job/137795692270) |
| Linux, Clang 18 | [Successful native build and tests](https://github.com/devenshah2018/qode/actions/runs/45204290587/job/137795692174) |
| macOS 15, Clang | [Successful native build and tests](https://github.com/devenshah2018/qode/actions/runs/45204290587/job/137795692198) |
| Windows 2022, MSVC | [Successful native build and tests](https://github.com/devenshah2018/qode/actions/runs/45204290587/job/137795692334) |
| Sanitizers and analysis | [Successful ASan/UBSan/LSan, static analysis, and bounded parser fuzzing job](https://github.com/devenshah2018/qode/actions/runs/45204290587/job/137795691995) |
| Browser and WebAssembly | [Successful Wasm build, native parity, Wasm sanitizers, frontend, and browser checks](https://github.com/devenshah2018/qode/actions/runs/45204290587/job/137795692024) |

The [earlier successful run of the same revision](https://github.com/devenshah2018/qode/actions/runs/45203276103) also records a [successful Vercel production deployment](https://github.com/devenshah2018/qode/actions/runs/45203276103/job/137794422531). The stable public domain is [qode-olive.vercel.app](https://qode-olive.vercel.app/), with its handbook at [/docs/](https://qode-olive.vercel.app/docs/). Deployment was skipped in the later run; it is not counted as a second deployment.

For later revisions, consult the [verification workflow history](https://github.com/devenshah2018/qode/actions/workflows/ci.yml). Job success is evidence for the bounded checks performed, not proof that every possible program is correct.

## Locally observed results

The local environment is macOS 26.5.1, arm64 Apple M4, Apple Clang 17, Node 22.15.0, and Emscripten 4.0.10. These results describe this release candidate; a configured CI job is not evidence that it has already run on GitHub.

| Check | Local evidence |
| --- | --- |
| Native release build | Builds with C11, warnings as errors |
| CTest | Core, embedding, parser mutations, allocation schedules, and CLI suites |
| Numerical oracle | 78 dense-matrix gate/order cases; 80 seeded Qiskit circuits of 60 gates; 10,000-gate norm; all four teleportation branches; GHZ/Grover and reset/dynamic sampling |
| Tolerances | State/probability error <1e-10; 10,000-gate normalization drift <1e-9 |
| Native/Wasm parity | 24 seeded circuit cases, plus matching terminal and dynamic sample counts |
| Deployment | Five packaging checks: required pages/engine/licenses, root paths, artifact tampering, routing, and cache/MIME policy |
| Browser | 99 checks across Chromium, Firefox, and WebKit, including documentation, mobile layouts, keyboard access, automated WCAG 2.1 AA checks, and worker cancellation |
| Native UBSan | All CTest suites |
| Wasm ASan/UBSan/LSan | Core regressions, 40,000 deterministic parser mutations, 400 allocation-failure schedules |
| Static analysis | No diagnostics in seven implementation translation units |
| Source checks | clang-format, Prettier, strict TypeScript, clean diff whitespace |

The statistical tests use fixed seeds and predetermined bounds: for a fair 10,000-shot binary distribution, each expected count is within 250 of 5,000. They also reject impossible outcomes. These checks complement exact state comparisons; they are not used as a substitute for matrix validation.

## Reproduce

```sh
cmake -S . -B build/native -DCMAKE_BUILD_TYPE=Release
cmake --build build/native --parallel
ctest --test-dir build/native --output-on-failure
python3 -m venv .venv
.venv/bin/python -m pip install -r tests/requirements.txt clang-format==21.1.8
.venv/bin/python tests/test_numerical.py build/native/qode
.venv/bin/clang-format --dry-run --Werror include/*.h src/*.c src/*.h tests/*.c examples/embed.c tools/benchmark.c
CC=clang python3 tools/analyze.py
make wasm
node tests/test_wasm.mjs
python3 tools/check-wasm-sanitizers.py
npm --prefix web ci
npm --prefix web run format:check
npm --prefix web run build
npm --prefix web exec -- playwright install chromium firefox webkit
npm --prefix web test
node --test tests/test_deployment.mjs
node tools/package-vercel.mjs
node tools/package-vercel.mjs --verify
```

Native sanitizer verification on supported hosts:

```sh
cmake -S . -B build/sanitize -DCMAKE_BUILD_TYPE=Debug -DQODE_SANITIZE=ON
cmake --build build/sanitize --parallel
ctest --test-dir build/sanitize --output-on-failure
```

Apple's supplied ASan runtime deadlocks during initialization on the local macOS 26.5.1 environment, before Qode reaches `main`. A process sample identifies recursive sanitizer allocator initialization. Consequently, **native ASan is not claimed as a local pass**. The Emscripten ASan/UBSan/LSan runtime passes under Node; native UBSan also passes. Native ASan/LSan passed in the linked Ubuntu sanitizer job. To select only native UBSan locally, add `-DQODE_SANITIZERS=undefined` and use a separate build directory.

Coverage-guided fuzzing requires a Clang installation with compiler-rt/libFuzzer:

```sh
CC=clang cmake -S . -B build/fuzz -DQODE_FUZZ=ON -DCMAKE_BUILD_TYPE=Debug
cmake --build build/fuzz --target qode_fuzz --parallel
mkdir -p work/corpus
cp examples/*.qc work/corpus/
build/fuzz/qode_fuzz work/corpus -max_total_time=30 -max_len=4096 -timeout=3
```

The local Apple toolchain lacks its libFuzzer archive, so coverage-guided fuzzing is **not claimed as a local pass**; the linked Ubuntu sanitizer job records its successful hosted run. The deterministic 40,000-case mutation driver runs locally, including under Wasm sanitizers. Bounded fuzzing and sanitizers improve confidence; they do not establish correctness for every possible program.

## Platform and release status

CI declares GCC 13 and Clang 18 on Ubuntu 24.04, the runner's Clang on macOS 15, and Visual Studio C11 on Windows 2022. The linked GitHub jobs above establish successful Linux, macOS, and Windows runs for the recorded revision. Browser and native/Wasm parity tests run on built production assets under `/`.

The Pages workflow and release-artifact workflow are manual. Publishing and Pages configuration are separate from local validation; see `RELEASING.md`.
