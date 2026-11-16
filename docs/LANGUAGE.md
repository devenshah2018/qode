# Qode 1.0 language reference

Source files are UTF-8 and use the `.qc` extension. Names are case-sensitive ASCII letters/underscores followed by letters, digits, or underscores, up to 63 bytes. Strings may contain Unicode. Diagnostics use one-based lines and byte columns.

## Grammar

```ebnf
program      = { declaration }, { statement } ;
declaration  = ("qubit" | "bit"), name, ";" ;
statement    = gate, ";"
             | "measure", name, "->", name, ";"
             | "reset", name, ";"
             | "print", string, ";"
             | "inspect", ("state" | "probabilities" | "qubit", name), ";"
             | "if", name, "==", ("0" | "1"), "{", { conditional }, "}"
             | "halt", ";" ;
conditional  = gate, ";" | "if", name, "==", ("0" | "1"), "{", { conditional }, "}" ;
gate         = single, name
             | rotation, "(", angle, ")", name
             | double, name, ",", name
             | triple, name, ",", name, ",", name ;
single       = "i" | "h" | "x" | "y" | "z" | "s" | "sdg" | "t" | "tdg" ;
rotation     = "rx" | "ry" | "rz" ;
double       = "cx" | "swap" | "cz" | "cs" | "ct" ;
triple       = "ccx" | "cswap" ;
angle        = constant arithmetic using numbers, "pi", +, -, *, /, and parentheses ;
```

Multiplication and division precede addition and subtraction; unary signs bind first. Angles are radians, evaluated once during compilation. Division by zero, overflow, and out-of-range numeric literals are errors. Expression nesting is limited to 64; conditional nesting to 32. There are no dynamic angle variables, functions, arrays, or loops.

Strings support `\n`, `\r`, `\t`, `\"`, and `\\`. Literal control characters and unknown escapes are errors. Use `//` through the end of a line or `[ ... ]` for a non-nesting comment that may span lines.

## State and ordering

Qubits start together in `|0...0⟩`. A program with `n` qubits has `2^n` complex amplitudes. If `alice` is declared first and `bob` second, `|10⟩` means `bob=1, alice=0`. All gate operands must name distinct declared qubits.

`cx control, target` flips the target when the control is 1. `ccx control1, control2, target` requires both controls. `cswap control, left, right` conditionally exchanges the last two qubits. Controlled phase gates apply their phase to the joint `11` branch: CZ = π, CS = π/2, CT = π/4. `swap left, right` exchanges the two subsystems, including their correlations.

S and T are `diag(1, i)` and `diag(1, exp(iπ/4))`. `sdg` and `tdg` are their inverses. Rotations follow `R_axis(θ) = exp(-iθ σ_axis/2)`. Identity does nothing.

## Measurement and classical control

`bit result;` declares an unset classical bit. `measure alice -> result;` samples in the computational basis, writes 0 or 1, and projects the **joint state** onto the selected outcome with normalization. Measuring an already measured qubit gives the same result until another operation changes it.

`reset alice;` measures internally and flips a 1 outcome to 0; it does not write a classical bit. Reset can disturb entangled partners. A reset anywhere in a sampled program disables the terminal sampling optimization.

`if result == 1 { x bob; }` requires a bit initialized by an earlier measurement. Conditional blocks contain only gates and nested conditions, so definite initialization is straightforward. Measurements may overwrite bits. `halt;` ends execution; later instructions are still checked at compile time. EOF ends execution without requiring halt.

## Inspection and output

`print "Hello world";` emits text. `inspect state;` and `inspect probabilities;` record the current state, while `inspect qubit alice;` selects a reduced-state view. Inspections do not affect the state or consume randomness. For large states, observations expose the 64 largest amplitudes and a truncation flag; probabilities derive from the full state.

`run --json` includes observations in source execution order. Text-mode runs print text directly and structured inspection records as JSON lines. `sample` suppresses observations and returns aggregated classical-bit counts. Counts display the highest-index declared bit on the left; `-` denotes an unset bit. At least one measurement before the first halt is required to sample.

## Randomness and reproducibility

PCG-XSH-RR uses a 64-bit state with multiplier `6364136223846793005` and increment `1442695040888963407`. Seeding starts with state zero, advances once, adds the unsigned 64-bit seed, then advances again. Two outputs supply a 53-bit uniform draw: `(a>>5)*2^26 + (b>>6)`, divided by `2^53`.

Each physical measure/reset consumes a draw, including deterministic outcomes. Dynamic sampling resets state and bits for every shot while retaining one PRNG stream. Terminal-only sampling draws one joint basis outcome per shot from the final distribution. Its draw schedule therefore differs from repeated `run` invocations. Seeds reproduce a fixed execution mode and version; floating-point results are compared with tolerance across architectures.

## Resource limits and errors

The engine accepts at most 24 qubits, 256 bits, 1 MiB of source, and 100,000 instructions. The browser lowers qubits to 16; debugging to 12. Sampling accepts 1–100,000 shots. A runtime records at most 1,024 observations and 16 MiB of serialized observation data; exceeding a limit returns a typed failure.

Unknown syntax, missing semicolons, late/duplicate declarations, undeclared operands, uninitialized bit reads, invalid gate arities, invalid UTF-8/NUL bytes, and duplicate gate operands fail compilation. Syntax checking executes nothing. Runtime failures do not silently produce a successful exit status.

CLI exit codes are 0 for success, 2 for invalid options/programs, 3 for input failures, 4 for runtime/resource failures, and 130 for an interrupted execution.
