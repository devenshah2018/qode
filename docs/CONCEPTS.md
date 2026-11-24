# State and results reference

The State panel displays the current execution. `inspect` statements record separate snapshots available under Output. Inspection does not change the simulated state; measurement does.

## Basis ordering

The first declared qubit is bit zero, displayed on the right. With declarations `qubit a; qubit b;`, basis `|10⟩` means `b=1` and `a=0`. Each basis label describes the complete register.

## Amplitudes

| Field | Meaning |
| --- | --- |
| Basis | Computational-basis label, with the highest-index qubit on the left. |
| Amplitude | Complex value `re + im·i`. |
| Probability | `re² + im²`, displayed as a percentage. |
| Phase | Angle of the nonzero complex amplitude in degrees. A dash means undefined at zero amplitude. |
| State norm | Sum of all basis probabilities. It should remain approximately 1. |

Relative phase affects later interference even when current probabilities match. Displayed numbers are rounded; JSON exports retain more precision. Values near 1 may differ slightly because of floating-point arithmetic.

The panel shows at most 64 largest amplitude entries. Truncation is stated explicitly and does not truncate the simulated register. Norm and per-qubit values still refer to the full state.

## Classical bits

A declared bit shows `?` until measurement writes it. Measurement writes 0 or 1 and collapses the joint state to the selected branch. Repeated measurement in the same basis gives the same result unless another operation changes the qubit.

## Qubits

Each qubit view shows its reduced-state Bloch vector `(x, y, z)` and purity. The probability of 0 is `(1+z)/2`; the probability of 1 is `(1−z)/2`.

- **Pure:** purity is approximately 1; the vector lies on the sphere.
- **Mixed:** purity is below 1; the vector lies inside the sphere. A qubit entangled with others can be mixed even when the whole register is pure.
- A zero vector with purity 0.5 is a maximally mixed qubit, not a missing result.

## Recorded output

`print` records text. `inspect state` records complex amplitudes, `inspect probabilities` records basis probabilities, and `inspect qubit name` records a per-qubit view. Each entry includes its source line and execution step. A recorded snapshot describes that step, not necessarily the current final state.

## Sample counts

The histogram counts final classical-bit results. Bit strings place the highest-index declared classical bit on the left. Only the 64 most frequent outcomes are displayed; JSON export includes all counts.

The seed makes a sampling sequence reproducible; it does not force observed frequencies to equal theoretical probabilities. Changing the circuit or execution mode can change the sampled sequence.

## Supported scope

Qode simulates ideal, noiseless circuits. It does not execute on quantum hardware. Browser execution supports 16 qubits, browser stepping 12, and the native CLI 24. These limits apply in addition to the source and instruction limits in the language reference.
