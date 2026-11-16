// Three qubits share one correlated outcome: 000 or 111.
qubit a;
qubit b;
qubit c;
bit x;
bit y;
bit z;
h a;
cx a, b;
cx a, c;
measure a -> x;
measure b -> y;
measure c -> z;
