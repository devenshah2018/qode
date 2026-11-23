# Start with a Bell pair

Qode is a compact language for describing ideal quantum circuits. You write named qubits and gates; the workbench shows the joint quantum state after each instruction. The native CLI and the browser share the same C simulation engine.

You do not need a quantum account, a backend, or a Python environment to use the workbench. The simulation runs on your device. Begin with two qubits, then use the language reference as you explore.

## Your first experiment

This complete program entangles two qubits and records their measurements:

```qode
qubit alice;
qubit bob;
bit a;
bit b;

h alice;
cx alice, bob;
inspect state;
measure alice -> a;
measure bob -> b;
```

Choose **Open in workbench** on the code block. Press **Step** once to apply H. The amplitudes of `|00⟩` and `|01⟩` become approximately 0.707. Press Step again to apply CX: the `|01⟩` branch moves to `|11⟩`. Each surviving branch has probability 0.5.

`inspect state` records this moment without disturbing it. The next two statements measure Alice and Bob. The joint state collapses to one branch, so the classical results agree: either both zero or both one.

## Read the result correctly

The first declared qubit occupies bit zero, at the **right** of a basis label. For Alice followed by Bob, `|10⟩` means Bob is one and Alice is zero. A basis label describes the whole register, not a particular named qubit.

An amplitude is a complex number. Probability is its squared magnitude: real² + imaginary². An amplitude of approximately 0.707 has probability approximately 0.5, not 0.707. The inspector shows both quantities separately. The phase of a zero amplitude is undefined and is displayed as a dash.

Open the **Qubits** tab after CX. Each qubit has purity 0.5 and a zero-length Bloch vector. This is expected: the complete Bell pair is pure, but either qubit viewed alone is mixed.

## Run, step, or sample

- **Run** executes from the current instruction to the end. It does not restart a partially stepped experiment.
- **Step** executes one engine instruction. Declarations and comments are compiled before execution and do not consume steps.
- **Back** restores a previous execution step, including its classical bits and random generator state. Repeating the measurement produces the same result.
- **Reset** returns the entire experiment to zero using the selected seed.
- **Stop** destroys the current worker session. Start a fresh execution with Run or Reset; it cannot resume a destroyed checkpoint.
- **Sample** repeats the program from its initial state and aggregates final classical-bit results. It does not continue the partially stepped state.

Sample 1,024 shots of the Bell program. Only `00` and `11` should appear; their counts will usually be close, but need not be identical. Increasing shots improves the estimate of the probability distribution. The results depend on the experiment, seed, and execution mode.

## Change one thing

Replace `cx alice, bob;` with `x bob;` and run again. Alice remains in superposition while Bob is fixed to one. You should now see `10` and `11` rather than `00` and `11`. This is a useful way to separate independent randomness from entanglement.

For interference, choose the Interference example: two Hadamards return the register to zero. For a more complete workflow, choose Teleportation and compare the message's initial reduced state with Bob's final reduced state under Output.

## Save and share

The workbench autosaves source, seed, and shot count in this browser when storage is available. It does not synchronize files between devices. Export code for a portable `.qc` file; export results for JSON evidence of a particular execution or sample.

Share creates a URL fragment containing code and settings. It is not a server-stored project and does not contain a resumable execution checkpoint. Opening a share starts a fresh experiment. Malformed shares produce a notice and keep the saved workspace.

## Run from the repository

```sh
./start.sh
```

The launcher installs missing or changed frontend dependencies, builds the WebAssembly engine, and starts the development server. Node, npm, CMake, Make, and Emscripten must be installed. Use `./start.sh --open` to open a browser or `./start.sh --port 5180` to choose a port. The app's default path is `/`; documentation is at `/docs/`.
