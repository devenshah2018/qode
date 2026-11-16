# Completion and evidence

This matrix maps the original GitHub backlog and the 1.0 additions to working behavior. Historical issues are reference material; they have not been automatically closed.

| Original request | 1.0 behavior | Verification |
| --- | --- | --- |
| #1 state output | Explicit inspection; identity is a no-op | Core/CLI inspections; numerical identities |
| #2 reference and usage | README, language reference, examples, migration | Clean-build quick start and all-example test |
| #3 string output / #21 spaces | Quoted Unicode strings with spaces and escapes | CLI and browser Unicode/import tests |
| #4 gate prefix | Replaced by readable commands with strict parsing | Unknown-command/arity diagnostics; migration |
| #5 Hadamard/X | Correct complex amplitudes and interference | Dense matrices, random Qiskit circuits, H² regression |
| #6 state preservation / #20 early stopping | Immutable instructions and separate joint runtime | Two-qubit regression; long programs; replay |
| #7 comments | Multiword/multiline brackets and line comments | Core lexer/compiler and CLI regressions |
| #8–#11 Y/Z/S/T | Full complex gates and S/T inverses | Every operand position on complex entangled inputs |
| #12 CNOT | Joint-state controlled X | Bell/GHZ correlations; Qiskit |
| #13 SWAP | Subsystem exchange | Dense matrix and all operand orders |
| #14 CCNOT | Two controls and one target | Dense matrix and all operand orders |
| #15–#17 CZ/CS/CT | Correct conditional phases | Dense matrices and Qiskit controlled phases |
| #18 Fredkin | Controlled SWAP (`cswap`) | Dense matrix and all operand orders |
| #19 termination | Optional `halt`, normal EOF | Core/CLI halt and diagnostic checks |

| Added capability | Evidence |
| --- | --- |
| RX/RY/RZ with constant angle arithmetic | Reference matrices, Qiskit, expression errors |
| Measurement, collapse, reset | Seeded tests; repeated measurements; reset-aware sampling |
| Classical correction | Teleportation in all four branches; dynamic sampling |
| Reentrant library and deep checkpoints | Multiple runtimes, clone/reset/cancellation tests |
| CLI, JSON, source diagnostics | CLI integration suite; invalid UTF-8 and boundary checks |
| Explain-every-step playground | Three-browser debugger and mobile tests |
| Correct mixed-state Bloch views | Bell reduced-state purity and teleportation comparisons |
| Import/export, autosave, sharing | Browser shared Unicode, file import, reload and download tests |
| Worker cancellation and large source transfer | Expensive-circuit Stop/recovery and large-source browser tests |
| Controlled memory use | Qubit/instruction/source limits, checkpoint budget, allocation-failure injection |
| Native/Wasm parity | Eight circuits × three seeds, including full-width seeds |
| Reproducible release preparation | Clean build, pinned tool versions/actions, checksummed archives |

The public release excludes hardware, noise, GPU backends, a package manager, user-defined functions, and general-purpose loops. These are explicit product boundaries, not unfinished promises.
