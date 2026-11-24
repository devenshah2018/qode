# Debugger and console

The editor displays source and the next instruction. Circuit and State display the current execution. Problems, Console, and Build log appear below the editor.

## Execution controls

| Control | Behavior |
| --- | --- |
| Compile | Validate source without executing it. Unchanged source keeps its execution position. |
| Run | Execute from the current instruction to completion. |
| Step | Execute one instruction and update the source highlight, circuit, state, and bits. |
| Back | Return one instruction step, restoring quantum state, classical bits, output, and measurement sampling state. |
| Reset | Return to the initial state using the current seed. |
| Stop | Cancel execution and discard the active session. Run or Reset starts a new session. |

Declarations and comments do not consume execution steps. The highlight identifies the **next** instruction, not the last executed instruction. Conditional blocks can skip gates; their presence in the circuit does not imply they executed.

Back repeats the same measurement outcome when replayed from the same checkpoint. Reset uses the current seed; choose a different seed for a different reproducible sampling sequence. Run does not restart a partially stepped program.

## Diagnostics and logs

- **Problems:** compiler or execution errors with source location and context. Editing clears the previous diagnostic.
- **Console:** text emitted by `print` statements during the current execution.
- **Build log:** compilation and execution results. **Clear log** clears these messages, not source or runtime state.
- **State → Output:** recorded `inspect` snapshots and text output, including source lines. Expand a recorded snapshot for its available JSON values.

## Inspector panels

Circuit, State, and Sample collapse independently from their headings. Collapsing a panel releases space without resetting execution, selected views, seed, or shot count.

State includes **Amplitudes**, **Qubits**, and **Output** tabs. See [State & results](CONCEPTS.md) for fields, ordering, and display limits.

## Sampling

Enter a seed and shot count in **Sample**, then select **Sample**. Each shot starts from the program's initial state. The histogram aggregates final classical-bit outcomes, independently of the current paused debugger state. Per-shot print and inspection events are suppressed.

Shots must be an integer from 1 to 100,000. Seed must be an unsigned 64-bit integer. Invalid shots disable sampling; Run and Step remain available. A program needs measurements for meaningful classical-bit sample counts.

**Export results** downloads the latest sample result when present, otherwise the current execution snapshot, as JSON. Program execution and edits clear previous sample results.

## Limits and cancellation

Run and Sample support up to 16 browser qubits. Step and Back support up to 12. Back is available only for a valid active execution with at least one completed step. Stop and execution failures discard that session; Back cannot restore it.

If execution is slow, use Stop, reduce qubits or shots, and remove repeated inspections. Source edits invalidate the compiled program; execution must compile the changed source before continuing.
