#include <stdio.h>
#include <math.h>
#include "quantum.h"

void apply_hadamard(double state[2]) {
    double a = state[0], b = state[1];
    state[0] = (a + b) / sqrt(2);
    state[1] = (a - b) / sqrt(2);
    printf("Applied Hadamard: [%.2f, %.2f]\n", state[0], state[1]);
}

void apply_pauli_x(double state[2]) {
    double temp = state[0];
    state[0] = state[1];
    state[1] = temp;
    printf("Applied Pauli-X: [%.2f, %.2f]\n", state[0], state[1]);
}
