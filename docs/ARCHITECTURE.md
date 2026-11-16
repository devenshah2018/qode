# Architecture

## Compilation

The scanner reads bounded, copied UTF-8 source, tracks spans, and produces exact tokens. The parser evaluates constant angles, validates declarations and operand types, and produces an immutable instruction vector. A symbol resolves to an integer qubit or bit index during compilation, so gate execution performs no name lookup or per-gate allocation. Conditions compile to forward jumps. Source positions remain attached to instructions.

Compilation has no runtime effects. Program destruction frees instructions, source, names, and strings iteratively. Diagnostic output is owned by the caller; allocation failure can return a status before a diagnostic message is available.

## Simulation

A runtime owns `2^n` pairs of double-precision real/imaginary values, classical bits, PCG state, an instruction pointer, and optional observations. Gate kernels update amplitude pairs with bit masks, without allocating an operator of size `4^n`. Swap gates exchange amplitudes with distinct bit patterns. Only measurement/reset projects and normalizes; ordinary gates never hide drift through renormalization.

Programs can be shared by independent runtimes, but a runtime must be used by one thread at a time. The program must outlive its runtimes and checkpoints. The library has no global mutable state and never exits the process. Numerical parsing and JSON formatting expect the C numeric locale; the CLI uses the process default C locale.

## Sampling

If every operation after the first measurement is a measurement, observation, or halt, and there is no reset, evolve the prefix once. A cumulative distribution permits joint basis sampling with binary search. A hash table accumulates classical count strings; output is sorted lexicographically. This preserves entangled correlations and repeated measurements of the same qubit.

Programs containing reset, post-measurement gates, or classical branches execute independently for each shot. The state is reset without discarding the PRNG stream. Cancellation is checked between operations and shots.

## Browser debugger

React and CodeMirror present source and results. A module worker loads the same C engine through Emscripten. Source is transferred through allocated Wasm heap memory, avoiding large source strings on the C stack. Returned JSON is copied and freed after every call. The worker serializes commands; Stop terminates it and discards the session.

Stepping uses the engine instruction pointer. Every 32 executed instructions, the worker can clone the complete runtime: amplitudes, classical bits, PRNG, observations, instruction pointer, and executed-step counter. Back restores the nearest preceding checkpoint and deterministically replays to the requested execution step. Checkpoints have a 64 MiB total budget; the initial checkpoint is retained and older noninitial checkpoints are evicted before allocating replacements. Full state copies are restricted to at most 12 qubits.

The circuit displays a bounded window, amplitudes are capped at 64 entries, and histograms display the 64 most frequent outcomes while exporting all counts. Reduced Bloch vectors derive from the full joint state and use purity to distinguish mixed states. The site contains no backend or network API calls; runtime assets are served statically under `/qode/`.

## Build boundaries

CMake defines the native static library, CLI, tests, benchmark, and Wasm adapter. Make wraps CMake. Generated JS/Wasm and native executables are ignored; the web build copies only generated browser artifacts into the static output. GitHub workflows build clean artifacts, run validation, and prepare manual release/Pages deployment paths.
