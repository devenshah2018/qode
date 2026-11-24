# Code examples

These complete programs can be opened directly in the workbench. Each example states its expected result. All operations are ideal and noiseless.

## Biased measurement

RY sets a controlled mixture of zero and one. Starting at zero, the probability of one after `ry(theta)` is `sin²(theta/2)`.

```qode
qubit coin;
bit result;
ry(pi / 3) coin;
inspect probabilities;
measure coin -> result;
```

Before measurement, one has probability 0.25. A large sample should approach 25% ones, but a single run yields a definite zero or one. Use the seed to reproduce a fixed experiment, not to force the statistical result to equal its theoretical expectation.

## Phase interference

```qode
qubit wave;
h wave;
z wave;
inspect state;
h wave;
inspect probabilities;
```

Before the second H, probabilities are equal but the amplitudes have opposite signs. After H, the zero branch cancels and the one branch remains. Remove Z to obtain the opposite result. This is why complex-state inspection is separate from probability inspection.

## Build a correlated register

```qode
qubit first;
qubit second;
qubit third;
bit a;
bit b;
bit c;
h first;
cx first, second;
cx first, third;
measure first -> a;
measure second -> b;
measure third -> c;
```

This GHZ experiment yields only `000` and `111`. Each qubit considered alone is mixed. The joint state still carries the coherence that created these correlations.

## Apply classical feed-forward

```qode
qubit coin;
qubit target;
bit decision;
bit output;
h coin;
measure coin -> decision;
if decision == 1 {
    x target;
}
measure target -> output;
```

The measured coin is classical information when the if block runs. Sampling the program gives matching decision/output bits. Unlike coherent CX, the measurement already collapsed the control.

Nested conditions are permitted when all referenced bits were initialized by earlier measurements. Inside condition blocks, use only gates and further conditions. Put measurements, prints, resets, and inspections at the top level.

## Reuse a qubit after measurement

```qode
qubit coin;
bit first;
bit second;
h coin;
measure coin -> first;
reset coin;
h coin;
measure coin -> second;
```

Reset measures internally, then flips a one result to zero. It does not erase `first`, because classical bits are separate storage. Applying H prepares the next coin toss from zero. Reset can also disturb entangled partners; it is not a way to erase one qubit while preserving an arbitrary joint state.

## Teleport a complex state

```qode
qubit message;
qubit alice;
qubit bob;
bit m;
bit a;
ry(pi / 3) message;
rz(pi / 5) message;
inspect qubit message;
h alice;
cx alice, bob;
cx message, alice;
h message;
measure message -> m;
measure alice -> a;
if a == 1 {
    x bob;
}
if m == 1 {
    z bob;
}
inspect qubit bob;
```

Compare the two inspections under Output. Bob's final Bloch coordinates and purity match the initial message's. The measurement outcomes may differ with the seed, but the conditional corrections reproduce the state in every branch. This transfers a state within the simulated protocol; it does not copy an unknown state or transmit matter.

## Search a two-qubit space

```qode
qubit a;
qubit b;
bit x;
bit y;
h a;
h b;
cz a, b;
h a;
h b;
x a;
x b;
cz a, b;
x a;
x b;
h a;
h b;
measure a -> x;
measure b -> y;
```

CZ marks the `11` branch with a phase. The remaining gates implement a diffusion step, up to an irrelevant global phase. One iteration amplifies the marked answer so the ideal final result is `11` with probability one. Inspect between the oracle and diffusion to see the difference between marking a phase and increasing a probability.

## Keep experiments reproducible

Record the full `.qc` source, seed, shot count, execution mode, and Qode version. Export results before modifying the source. `run` performs a particular trajectory; `sample` aggregates fresh executions, with an optimized joint sampler where possible. Their random-draw schedules differ, so using the same seed does not make their outputs interchangeable.

When debugging a stochastic program, use Back to revisit a measurement with the exact same PRNG state. Change the seed, then reset or run the experiment when you intentionally want another trajectory. Resetting with the same seed reproduces the original trajectory. Larger shot counts estimate probabilities; they do not make a single trajectory more deterministic.
