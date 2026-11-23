# Native CLI workflow

The native executable uses the same C engine as the browser. It is useful for scripts, repeatable experiments, CI checks, and programs larger than the browser's resource limit. Running native Qode does not require Node, Emscripten, or Qiskit.

## Build

```sh
cmake -S . -B build/native -DCMAKE_BUILD_TYPE=Release
cmake --build build/native --parallel
ctest --test-dir build/native --output-on-failure
```

On Unix-like systems, `make` and `make test` wrap these commands. On Windows, use a Visual Studio Developer PowerShell with C11 support; a multi-configuration build may place the executable under `build/native/Release/qode.exe`.

## Validate without executing

```sh
./build/native/qode check examples/teleportation.qc
./build/native/qode check examples/teleportation.qc --json
```

Check performs scanning, parsing, angle evaluation, and semantic validation. It does not apply gates, produce measurements, or emit program prints. Use it before running an expensive experiment or when checking syntax in a script.

## Execute one trajectory

```sh
./build/native/qode run examples/bell.qc --seed 42
./build/native/qode run examples/bell.qc --seed 42 --json
```

Text mode prints requested text, structured inspection records, and measured classical bits. JSON mode emits a versioned result containing observations, selected amplitudes, reduced states, final classical bits, norm, and completion metadata. JSON state output includes the 64 largest amplitudes by default; the complete vector is still used for execution.

## Estimate a distribution

```sh
./build/native/qode sample examples/bell.qc --shots 10000 --seed 42 --json
```

Sampling requires a measurement before halt. It returns classical-bit counts, with the highest-index declared bit at the left. An unset classical bit appears as `-`. Printing and inspection are suppressed during sampling so thousands of shots do not generate repeated output.

For circuits with only terminal measurements and no reset, the engine evolves once and samples the joint basis distribution. Reset, classical feed-forward, or post-measurement gates require independent runtime executions. Both strategies preserve the intended output distribution.

## Read from standard input

```sh
printf 'qubit wave; h wave; h wave; inspect probabilities;' | ./build/native/qode run -
```

The `-` filename reads the source stream without seeking. File sources and standard input are bounded to 1 MiB. On Windows, the CLI reads standard input in binary mode so source bytes are not altered by text-mode EOF handling.

## Options and exit codes

| Item | Meaning |
| --- | --- |
| `--seed UINT64` | Unsigned decimal seed; defaults to 42. |
| `--shots N` | Sample count from 1 through 100,000; defaults to 1,024. |
| `--json` | Structured machine-readable result. |
| `--help` | Top-level usage. |
| `--version` | Current language/engine version. |
| Exit 0 | Success. |
| Exit 2 | Invalid command options or program. |
| Exit 3 | Input failure. |
| Exit 4 | Runtime/resource failure. |
| Exit 130 | Interrupted execution. |

Diagnostics use stderr. Successful JSON results use stdout, allowing a caller to parse output separately from errors. Seed values are serialized as strings to preserve all 64 bits in JavaScript.

## Reproducible experiments

Keep the source revision, Qode version, seed, execution mode, and shot count beside your result JSON. A seed reproduces a fixed mode's random-draw schedule; it does not imply that one run and one sample use identical draws. Floating-point results across platforms should be compared within a tolerance.

Use Ctrl+C to interrupt long native executions. Cancellation is checked between operations and shots, so the current gate completes before interruption is observed. The library itself does not install signal handlers or exit the process; these behaviors belong to the CLI adapter.
