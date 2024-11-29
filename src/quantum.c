#include <stdio.h>
#include <math.h>
#include "quantum.h"
#include "parser.h"

void apply_hadamard(ASTNode *qubit_node) {
    if (qubit_node->type != NODE_QUBIT) {
        fprintf(stderr, "Error: Hadamard can only be applied to qubits\n");
        return;
    }
    double amp0 = qubit_node->state[0];
    double amp1 = qubit_node->state[1];
    qubit_node->state[0] = (amp0 + amp1) / sqrt(2);
    qubit_node->state[1] = (amp0 - amp1) / sqrt(2);
}

void apply_pauli_x(double state[2]) {
    double temp = state[0];
    state[0] = state[1];
    state[1] = temp;
    printf("Applied Pauli-X: [%.2f, %.2f]\n", state[0], state[1]);
}
