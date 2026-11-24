# Compiler reference

**Compile** checks source syntax and semantic rules without executing gates, measurements, `print`, or `inspect` statements. The equivalent CLI command is `qode check`.

## Compile source

Select **Compile**, or press **Ctrl/Cmd + Shift + Enter** in the editor. A successful result appears in **Build log** with the instruction count. The compiled circuit becomes available in the Circuit panel.

Compiling changed source creates a new initial state. Compiling unchanged source preserves the current debugger position. Use **Reset** to restart execution. **Run** and **Step** compile changed source automatically before executing it.

## Validation rules

- Declare every qubit and classical bit before operations.
- Use unique names and the required operand count for each gate.
- Use distinct qubits for multi-qubit operands.
- Terminate statements with `;`; close strings and conditional blocks.
- Write a classical bit through measurement before reading it in an `if` condition.
- Use finite constant arithmetic for rotation angles. Variables and division by zero are invalid.
- Stay within the source, qubit, instruction, and nesting limits in the [language reference](LANGUAGE.md).

## Diagnostics

A failed compilation opens **Problems**. Each diagnostic shows the filename, one-based line and column, error category, message, and source context. The editor highlights the affected line. Columns are byte positions, so a line containing non-ASCII text may have a different visual column.

| Category | Check |
| --- | --- |
| Syntax | Statement spelling, punctuation, strings, expressions, and block delimiters. |
| Semantic | Declarations, duplicate names, operand types/counts, repeated operands, and initialized classical reads. |
| Limit | Source length, qubit count, instruction count, or nesting depth. |
| Seed or shots | Execution settings; these are not source syntax errors. |

Correct the reported error and compile again. Compilation stops on the first reported error; another error may become visible after that correction. Editing clears the previous diagnostic and invalidates the previous compiled circuit.

## Command-line checking

```sh
./build/native/qode check program.qc
./build/native/qode check program.qc --json
```

A valid program exits with status 0. Invalid source exits nonzero, with diagnostics on stderr. `check` does not execute the program. See [Command-line interface](CLI.md) for file input, standard input, and execution options.
