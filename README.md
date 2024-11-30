# Qode: Quantum Computing Made Simple

### Overview

Qode is a lightweight, interpreted quantum programming language designed for efficiently scripting quantum computing operations. It provides an intuitive and concise syntax for applying quantum gates, measuring qubits, and exploring quantum states. Whether you're simulating quantum circuits or experimenting with algorithms, Qode makes quantum computing more accessible.

---

### Getting Started

***Prefixes***

Qode uses prefixes to differentiate commands, ensuring a clear and structured syntax. Here’s a quick guide:

- `q` **(Qubit Initialization)**: Specifies a qubit, with its starting state as ∣0⟩.

- `!` **(Quantum Gates)**: Applies quantum operations to qubits.
    - Example: `!H q1`; applies a Hadamard gate to `q1`.

- `#` **(Built-In Functions)**: Executes measurement or analysis functions.
    - Example: `#M q1`; measures `q1`.

***Comments***

In Qode, comments are used to annotate the code, providing explanations or notes without affecting the execution. Comments are preceded by `//` and can be placed on their own line or at the end of a command.
```
// This is a comment
!X q1;  // Apply Pauli-X gate to q1
```

***Qubit Initialization Syntax***

In Qode, qubits are prefixed with `q`, followed by the name of the qubit. *Qubits must be initialized before applying gates or functions.* Qubits are initialized to the ∣0⟩ state by default.

- **Default Initialization**
    ```
    q1;  // q1 starts in |0⟩
    ```

***Function Syntax***

1. Quantum Gates

    Quantum gates are defined using the `!` prefix, followed by the gate name and the target qubit. Supported gates include:

    - **Pauli-X Gate** (`!X`): Flips the state of the qubit.
        ```
        !X q1;
        ```
    - **Hadamard Gate** (`!H`): Places the qubit into superposition.
        ```
        !H q2;
        ```


        
2. Built-In Functions

    Built-in functions use the `#` prefix to perform operations, such as measurement and state analysis.
    
    - **Measurement** (`#M`): Measures a qubit, collapsing it into ∣0⟩ or ∣1⟩.
        ```
        #M q3;
        ```
        
    - **Probability Vector** (`#P`): Outputs the current probability amplitudes of the qubit's state.
        ```
        #P q2;
        ```

---

### Sample

Below is an example script illustrating Qode’s functionality:

```
// Initialize qubits
q1;         // q1 starts in |0⟩

// Apply gates
!X q1;      // Apply Pauli-X to q1
!H q2;     // Apply Hadamard to q2
!H q3;      // Apply Hadamard to q3

// Perform operations
#M q3;      // Measure q3
#P q2;      // Output probability vector of q2
```

---

### Usage

1. To build the compiler, execute the following:

    ```
    gcc ./src/lexer.c ./src/parser.c ./src/main.c ./src/quantum.c  -o ./build/quantum_interpreter
    ```

    This will compile the source code and generate the `quantum_interpreter` executable in the `./build` directory.

2. Once the compiler is built, you can run the test script to verify the installation:

    ```
    .\build\quantum_interpreter .\examples\test.qc
    ```

    This will execute the `test.qc` script located in the `examples` directory using the compiled interpreter.

---

### Reference

**Gates**
- Hadamard Gate: `!H [qubit]`
- Pauli-X Gate: `!X [qubit]`

**Built-In Functions**
- Measure Qubit: `#M [qubit]`
- Superposition Probability Vector: `#P [qubit]`
- Print Text: `#> [text]`
