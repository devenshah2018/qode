// The qubits are individually random, but their measurements agree.
qubit alice;
qubit bob;
bit a;
bit b;
h alice;
cx alice, bob;
inspect state;
measure alice -> a;
measure bob -> b;
