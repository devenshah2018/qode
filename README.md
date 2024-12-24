# Qode: Quantum Computing Made Simple

### Overview

Qode is a lightweight, interpreted quantum programming language designed for efficiently scripting quantum computing operations. It provides an intuitive and concise syntax for applying quantum gates, measuring qubits, and exploring quantum states. Whether you're simulating quantum circuits or experimenting with algorithms, Qode makes quantum computing more accessible.

---

### Getting Started

***Prefixes***

Qode uses prefixes to differentiate commands, ensuring a clear and structured syntax. Here’s a quick guide:

- `q` **(Qubit Initialization)**: Specifies a qubit, with its starting state as ∣0⟩.

- `$` **(Text Initialization)**: Specifies a text.

- `!` **(Quantum Gates)**: Applies quantum operations to qubits.
    - Example: `!H q1`; applies a Hadamard gate to `q1`.

- `#` **(Built-In Functions)**: Executes measurement or analysis functions.
    - Example: `#M q1`; measures `q1`.

***Comments***

In Qode, comments are used to annotate the code, providing explanations or notes without affecting the execution. Comments are wrapped by `[]` and can be placed on their own line or at the end of a command.

```
[This is a comment]
!X q1  [Apply Pauli-X gate to q1]
```

***Qubit Initialization Syntax***

In Qode, qubits are prefixed with `q`, followed by the name of the qubit. *Qubits must be initialized before applying gates or functions.* Qubits are initialized to the ∣0⟩ state by default.

- **Default Initialization**

    ```
    q1  // q1 starts in |0⟩
    ```

***Function Syntax***

1. Quantum Gates

    Quantum gates are defined using the `!` prefix, followed by the gate name and the target qubit. Supported gates include:


    - **Identity Gate** (`!I`): Identifies the probability states of the qubit.

        ```
        !I q1
        ```

    - **Hadamard Gate** (`!H`): Places the qubit into superposition.

        ```
        !H q2
        ```

    - **Pauli-X Gate** (`!X`): Flips the state of the qubit.

        ```
        !X q1
        ```
    
    - **Pauli-Y Gate** (`!Y`): Applies a phase and flips the state of the qubit.

        ```
        !Y q1
        ```
    
    - **Pauli-Z Gate** (`!Z`): Applies a phase shift of π to the qubit state.

        ```
        !Z q1
        ```

    - **Phase-S Gate** (`!S`): Applies a phase shift of π/2 to the qubit state.
    
        ```
        !S q1
        ```

2. Built-In Functions

    Built-in functions use the `#` prefix to perform operations, such as output.
    
    - **Output** (`#>`): Outputs text to the console. The text is prefixed by `$`.

        ```
        #> $Hello_World
        ```
    
    - **Terminate** (`TERM`): Terminates the script.

        ```
        TERM
        ```

---

### Sample

Below is an example script illustrating Qode’s functionality:

```
[Initialize qubits]
q1         [q1 starts in |0⟩]

[Apply gates]
!X q1      [Apply Pauli-X to q1]
!H q2      [Apply Hadamard to q2]
!H q3      [Apply Hadamard to q3]
TERM
```

Alternatively, the logic can be written on a single line as well for conciseness:

```
!X q1 !I q1 !H q1 !I q1 TERM
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
- Identitiy Gate: `!I [qubit]`
- Hadamard Gate: `!H [qubit]`
- Pauli-X Gate: `!X [qubit]`
- Pauli-Y Gate: `!Y [qubit]`
- Pauli-Z Gate: `!Z [qubit]`
- Phase-S Gate: `!S [qubit]`

**Built-In Functions**
- Output Text: `#> [text]`
- Terminate: `TERM`
