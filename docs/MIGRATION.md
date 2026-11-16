# Prototype → Qode 1.0

Qode 1.0 deliberately replaces the prototype parser and syntax. There is no compatibility mode. The old interpreter had incorrect amplitudes, unreliable state retention, and commands that stopped processing silently; reproducing those behaviors would undermine correctness.

| Prototype | Qode 1.0 |
| --- | --- |
| `q1` or implicit initialization | `qubit q1;` before operations |
| `!H q1` | `h q1;` |
| `!X`, `!Y`, `!Z`, `!S`, `!T` | Lowercase `x`, `y`, `z`, `s`, `t` with a terminating semicolon |
| `!I q1` prints probabilities | `i q1;` is identity; use `inspect qubit q1;` or `inspect probabilities;` |
| `#> $Hello_World` | `print "Hello World";` |
| Documented but absent `#M q1` | `bit result;` then `measure q1 -> result;` |
| `TERM` | Optional `halt;`, or EOF |
| `[comments]` | Bracket comments retained and fixed; `//` also supported |
| `quantum_interpreter FILE` | `qode run FILE` |
| Checked-in executable/JS/Wasm | Reproducible CMake/Emscripten build outputs |

Gate names are case-sensitive. Multiple statements can share a line, but semicolons are required. All qubit/bit declarations precede operations. Invalid input now fails with source diagnostics and a nonzero status.

The original prototype commits remain available in Git history for reference.
