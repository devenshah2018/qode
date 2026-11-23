# The quantum model

Qode simulates ideal, noiseless quantum states. It helps you inspect the mathematical model of a circuit; it does not connect to hardware or claim a computational speedup over classical computing.

## One state, many amplitudes

A qubit has two basis states, `|0⟩` and `|1⟩`. A pure state is described by complex amplitudes α and β:

```text
|ψ⟩ = α|0⟩ + β|1⟩
|α|² + |β|² = 1
```

For two qubits there are four amplitudes, one each for `|00⟩`, `|01⟩`, `|10⟩`, and `|11⟩`. For n qubits there are 2ⁿ. Qode stores the joint vector; it does not store a separate independent wavefunction for each qubit. This distinction makes entanglement possible.

## Amplitude, probability, and phase

For an amplitude `a + bi`, probability is `a² + b²`. Phase is the angle of the complex number, usually calculated with `atan2(b, a)`. Phase is useful only for a nonzero amplitude. Absolute global phase does not change physical measurement outcomes; relative phase between branches can change interference.

These two states have identical basis probabilities:

```text
|+⟩ = (|0⟩ + |1⟩) / √2
|−⟩ = (|0⟩ − |1⟩) / √2
```

They behave differently after H. H maps `|+⟩` to `|0⟩`, and `|−⟩` to `|1⟩`. Looking only at probability bars before H would miss the information carried by relative phase.

```qode
qubit wave;
h wave;
z wave;
inspect state;
h wave;
inspect probabilities;
```

The final probability of one is 1, up to floating-point rounding. Remove Z and the final probability of zero becomes 1 instead.

## Unitary gates preserve norm

The state norm is the sum of every amplitude's squared magnitude. Ideal gates preserve it. Qode's ordinary gates update complex amplitudes without unconditionally renormalizing the vector, so numerical errors cannot be concealed by normalizing after each gate.

The engine uses double precision. Values such as `0.9999999999999996` are expected floating-point representations of a normalized result. The UI rounds display values; exported JSON retains more precision. Use tolerances rather than exact decimal-string equality in your own analysis.

## Entanglement is a property of the joint state

A Bell state cannot be written as a product of two independent pure qubit states. Measurement outcomes are correlated: measuring Alice predicts Bob's result in the same basis.

This does not allow instantaneous communication. A user cannot choose a measurement outcome. Qode's statevector is an explicit classical simulation of the correlations, not a communications channel or a hardware measurement service.

## Bloch vectors and reduced states

A single qubit's reduced state can be represented by a Bloch vector `(x, y, z)`. For an isolated pure qubit, its vector has length one and lies on the sphere. For a mixed reduced state, its vector lies inside. The probabilities of zero and one are `(1+z)/2` and `(1−z)/2`.

Purity is `(1+x²+y²+z²)/2`. It ranges from 0.5 for the maximally mixed qubit to 1 for a pure qubit. A zero vector in an entangled pair is meaningful; it is not an empty or broken visualization.

The sphere is an orthographic drawing. Its vector endpoint is projected with orthonormal camera axes so valid states remain inside its outline. The exact numeric coordinates are shown beside it and available to assistive technology.

## Inspection and measurement differ

Inspection can expose simulated amplitudes because the engine explicitly stores them. A physical quantum device cannot reveal an unknown statevector through a single observation. Treat inspection as a debugging capability of a classical simulator.

Measurement samples an outcome and changes the joint state. Only amplitudes consistent with the selected bit survive, and the surviving branch is normalized. Measuring again in the same basis returns the same outcome unless an intervening operation changes that qubit.

## Size grows exponentially

Each amplitude uses 16 bytes. A complete n-qubit state therefore uses `16 × 2ⁿ` bytes before sampling buffers, observations, JSON, and checkpoints. Adding a qubit doubles the main state, rather than adding a constant amount of memory.

Use a small circuit while learning. Browser runs support up to 16 qubits, interactive stepping up to 12, and the native engine up to 24. These are resource boundaries, not a claim that every large program runs quickly on every device.
