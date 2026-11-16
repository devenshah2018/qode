# Benchmarks

These are bounded development-machine measurements, not a comparison with other simulators or a guarantee for arbitrary circuits.

## Environment

- Hardware: Apple M4 (arm64); macOS-26.5.1-arm64-arm-64bit-Mach-O.
- Compiler: Apple clang version 17.0.0 (clang-1700.0.13.3).
- Build: CMake Release, -O3 -DNDEBUG; no fast-math; five fresh-process trials per case.
- Median of five fresh-process trials; wall-clock timings use C11 timespec_get. Peak RSS includes the process, state, sampling buffers, and count table. Measurements are subject to machine load.

| Qubits | Gates | Mode | Compile ms | Execute ms | Evolve + 10,000 samples ms | Peak RSS MiB |
| --- | --- | --- | --- | --- | --- | --- |
| 8 | 1000 | Plain engine | 0.182 | 0.505 | 0.657 | 2.05 |
| 12 | 1000 | Plain engine | 0.102 | 2.714 | 2.990 | 2.20 |
| 16 | 200 | Plain engine | 0.026 | 8.560 | 9.034 | 4.44 |
| 20 | 100 | Plain engine | 0.017 | 70.205 | 72.198 | 41.97 |
| 12 | 1000 | Debugger model | 0.092 | 10.825 | 2.901 | 2.33 |

The workload applies deterministic RY rotations across the declared qubits, then measures one qubit. Sampling includes compilation-independent prefix evolution and terminal sampling; it is not a per-shot execution benchmark. The debugger model clones a runtime every 32 operations and serializes a 64-entry state view every 16; it measures representative engine/inspection overhead, not browser DOM rendering or a retained 64 MiB checkpoint cache.

## Reproduce

```sh
cmake -S . -B build/native -DCMAKE_BUILD_TYPE=Release
cmake --build build/native --parallel
python3 tools/benchmark.py
```

Raw records are in [benchmark-results.json](benchmark-results.json). The script writes new measurements when run. Gate execution and state storage are O(2^n); reduced-state inspection is O(n × 2^n). Terminal sampling builds one cumulative distribution, then uses binary search for each shot. Reset or post-measurement operations use fresh execution per shot.

No speedup over the prototype is reported: its amplitudes and state retention were incorrect, making an execution-time comparison misleading.
