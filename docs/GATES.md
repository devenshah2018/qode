# Gate reference

Gate names are lowercase and case-sensitive. Every gate statement ends with a semicolon. Operands must be declared qubits and must be distinct within the same operation. Controls appear first; targets follow.

## Single-qubit gates

| Gate | Syntax | Action |
| --- | --- | --- |
| Identity | `i q;` | Leaves the state unchanged. It does not print probabilities. |
| Hadamard | `h q;` | Maps zero to the positive equal superposition and one to the negative equal superposition. |
| Pauli X | `x q;` | Exchanges the zero and one amplitudes. |
| Pauli Y | `y q;` | Exchanges the amplitudes with factors −i and +i. |
| Pauli Z | `z q;` | Negates the one amplitude. |
| Phase S | `s q;` | Multiplies the one amplitude by i. |
| Inverse S | `sdg q;` | Multiplies the one amplitude by −i. |
| Phase T | `t q;` | Multiplies the one amplitude by exp(iπ/4). |
| Inverse T | `tdg q;` | Multiplies the one amplitude by exp(−iπ/4). |

For an input column vector `(α, β)`, H produces `((α+β)/√2, (α−β)/√2)`. Amplitudes remain complex throughout. Squaring amplitudes inside a gate would erase interference information and is not how Qode operates.

## Rotations

Rotations use radians and the convention `R_axis(θ) = exp(−iθ σ_axis / 2)`.

| Gate | Syntax | Matrix |
| --- | --- | --- |
| X rotation | `rx(theta) q;` | `[[cos(θ/2), −i sin(θ/2)], [−i sin(θ/2), cos(θ/2)]]` |
| Y rotation | `ry(theta) q;` | `[[cos(θ/2), −sin(θ/2)], [sin(θ/2), cos(θ/2)]]` |
| Z rotation | `rz(theta) q;` | `diag(exp(−iθ/2), exp(iθ/2))` |

`theta` denotes a constant expression in this table, not a declared variable. Write numbers and `pi` directly:

```qode
qubit spin;
ry(pi / 3) spin;
rz(-pi / 5) spin;
inspect qubit spin;
```

Parentheses, unary signs, addition, subtraction, multiplication, and division are supported. Multiplication/division bind before addition/subtraction. Expressions are evaluated during compilation and cannot depend on a measured bit. Division by zero and non-finite results fail compilation.

## Controlled gates

| Gate | Syntax | Condition and action |
| --- | --- | --- |
| CNOT | `cx control, target;` | Apply X to the target when the control is one. |
| Controlled Z | `cz control, target;` | Negate the joint branch where both operands are one. |
| Controlled S | `cs control, target;` | Apply a phase of π/2 to the joint one-one branch. |
| Controlled T | `ct control, target;` | Apply a phase of π/4 to the joint one-one branch. |
| Toffoli | `ccx first, second, target;` | Apply X when both controls are one. |

A quantum control is not a classical if statement. A controlled gate acts coherently on all relevant branches. It does not measure the control or choose one branch of a superposition.

```qode
qubit control;
qubit target;
h control;
cx control, target;
inspect state;
```

This prepares a Bell state. Replacing CX with measurement followed by a classical condition would generally produce different coherence and inspection behavior.

## Swap gates

`swap left, right;` exchanges the two subsystems, including their correlations with the rest of the register. It is not a copy operation. `cswap control, left, right;` performs that exchange only in branches where the control is one; it is also called a Fredkin gate.

```qode
qubit control;
qubit left;
qubit right;
x control;
x left;
cswap control, left, right;
inspect probabilities;
```

The final basis state is `|101⟩`: right and control are one, while left is zero. Recall that the first declaration is the rightmost bit.

## Useful identities

H², X², Y², Z², and two successive identical SWAPs act as identity. S followed by SDG and T followed by TDG undo each other. Two S gates implement Z; two T gates implement S. Rotation by θ followed by rotation by −θ about the same axis cancels.

Use these identities as debugging patterns. Compare amplitudes up to global phase when appropriate, and compare probabilities with a numerical tolerance. A gate that leaves probabilities unchanged may still change relative phase.

## Common mistakes

- `H q;` is not an alias for `h q;`.
- `cx q, q;` is invalid: control and target must be distinct.
- `rx pi/2 q;` is invalid: rotation expressions require parentheses.
- `i q;` does not inspect the state; use an inspect statement.
- A classical bit cannot be passed to a quantum gate.
- Operations do not implicitly declare qubits.
