# Follow a Bell pair

1. Build the Wasm module and start the playground using the README commands. Select **Entanglement**.
2. Press **Step**. H creates equal `|00⟩` and `|01⟩` amplitudes. The source highlight moves to the next statement.
3. Press **Step** again. CX transfers the `|01⟩` branch to `|11⟩`. Only `00` and `11` have nonzero probabilities.
4. Open **Qubits**. Each qubit has purity 0.5 and a zero-length Bloch vector. These are mixed reduced states: the pair is pure, but either qubit alone is not.
5. Step through inspection, then measurement. The state collapses to one branch. Measuring the other qubit gives the matching bit.
6. Press **Back** to return before the last measurement. PRNG and classical bits are restored too. Stepping again gives the same result.
7. Press **Sample** for 1,024 independent outcomes. Only `00` and `11` occur. Export the full counts as JSON.

For phase interference, use **Interference**. H followed by H returns to zero. For **Teleportation**, compare the input message's inspection with Bob's final inspection under **Output**. Their Bloch vectors agree even though measurement branches differ with the seed.

Run and sample support 16 browser qubits. Step/Back use up to 12 to bound checkpoint memory. The circuit window follows the next instruction; it does not imply that every earlier gate executed, because conditions may skip gates. Press Stop to terminate an expensive experiment immediately, then Reset to recreate its session.

Code is saved locally when storage is available. Import/export works without accounts. Share copies a URL fragment containing source, seed, and shots; large programs should be shared as `.qc` files. Ctrl/Cmd+Enter runs a circuit. Editor and transport controls are keyboard accessible; phase is also shown numerically so color is not the only signal.
