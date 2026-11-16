// Teleport a complex state onto bob using entanglement and two classical bits.
qubit message;
qubit alice;
qubit bob;
bit m;
bit a;
ry(pi/3) message;
rz(pi/5) message;
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
