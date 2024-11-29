#include <stdio.h>
#include <math.h>
#include "quantum.h"
#include "parser.h"

void apply_hadamard(ASTNode *qubit_node) {
    if (qubit_node == NULL) return;
    double alpha = qubit_node->state[0];
    double beta = qubit_node->state[1];
    double new_alpha = (alpha + beta) / sqrt(2);
    double new_beta = (alpha - beta) / sqrt(2);
    qubit_node->state[0] = new_alpha;
    qubit_node->state[1] = new_beta;
    printf("Hadamard gate applied to qubit %s. Alpha State: %f. Beta State: %f\n", qubit_node->value, qubit_node->state[0], qubit_node->state[1]);
}

void apply_pauli_x(ASTNode *qubit_node) {
    double temp = qubit_node->state[0];
    qubit_node->state[0] = qubit_node->state[1];
    qubit_node->state[1] = temp;
    printf("Pauli-X gate applied to qubit %s. Alpha State: %f. Beta State: %f\n", qubit_node->value, qubit_node->state[0], qubit_node->state[1]);
}

