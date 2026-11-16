# Embedding Qode

The public interface is `include/qode.h`. It requires only C11 standard headers. Build and run the complete example:

```sh
cmake -S . -B build/native -DCMAKE_BUILD_TYPE=Release
cmake --build build/native --parallel
cc -std=c11 -Iinclude examples/embed.c build/native/libqode.a -lm -o build/native/embed
./build/native/embed
```

Windows users can link the CMake-produced `qode.lib` using their native compiler instead of the Unix command.

## Ownership

1. `qode_compile(source, length, &program, &diagnostic)` copies source and returns an opaque program. No quantum operation runs during compilation.
2. `qode_runtime_create(program, seed, maximum_qubits, &runtime)` creates a state initialized to zero, with classical bits unset. The maximum is 1–24.
3. Call `qode_runtime_step` for one instruction or `qode_runtime_run` to finish. Step returns `QODE_DONE` when no instructions remain; run returns `QODE_OK` on completion.
4. Inspect read-only amplitudes with `qode_runtime_state`, individual classical bits with `qode_runtime_bit`, or allocate structured JSON with `qode_runtime_json`.
5. Release JSON with `qode_string_free`, runtimes with `qode_runtime_destroy`, and programs with `qode_program_destroy`, in that order.

The state pointer is borrowed and valid until the runtime is destroyed; its contents change on execution/reset. JSON strings are owned by the caller. `qode_program_json` exposes names, instructions, and source spans. `qode_runtime_reset` resets a runtime and its observations using the supplied seed. `qode_runtime_clone` makes a deep checkpoint; the original program must outlive both copies.

`qode_sample` returns aggregate counts without mutating an existing runtime. Supply a cancellation callback to run/sample; nonzero requests cancellation. Kernels finish the current gate before checking cancellation. Destruction accepts NULL. Runtime creation and compilation clear their output handles on failure.

## Errors and JSON

Statuses distinguish syntax, semantic, resource, allocation, argument, and cancellation failures. Diagnostics contain line, column, offset, length, and a bounded message; offsets and columns are bytes. A status is authoritative even if an early allocation failure leaves the diagnostic empty.

JSON schema version 1 uses `qubitOrder: "little-endian"`. Runtime results include the seed as a decimal string, instruction pointer, executed steps, completion, norm, qubit names, bit values (NULL when unset), reduced Bloch states, selected amplitudes, truncation, and requested observations. Sample results include seed, shots, whether terminal optimization was used, qubit/bit ordering, and a counts object. The seed is a string so JavaScript preserves all 64 bits.

State JSON selects the largest `max_entries` probabilities, breaking ties by ascending basis index. The argument must be 1–4,096. `stateTruncated` makes omitted amplitudes explicit. Norm and reduced states always use the complete vector. Inspection snapshots omit nested observation history to keep serialization bounded.

Use separate runtime handles concurrently; never mutate one handle from multiple threads. Maintain the C numeric locale when embedding. The API never changes the caller's locale or signal handlers; only the CLI installs SIGINT handling.
