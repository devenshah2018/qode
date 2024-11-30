#include <stdio.h>
#include <math.h>
#include "quantum.h"
#include "parser.h"

void apply_h_gate(ASTNode *qubit_node) {
    if (qubit_node == NULL) return;
    double alpha = qubit_node->state[0];
    double beta = qubit_node->state[1];
    double new_alpha = (alpha + beta) / sqrt(2);
    double new_beta = (alpha - beta) / sqrt(2);
    double alpha_prob = pow(new_alpha, 2);
    double beta_prob = pow(new_beta, 2);
    qubit_node->state[0] = alpha_prob;
    qubit_node->state[1] = beta_prob;
    printf("Hadamard gate applied to %s. Alpha Probability: %f. Beta Probability: %f\n", qubit_node->value, qubit_node->state[0], qubit_node->state[1]);
}

void apply_x_gate(ASTNode *qubit_node) {
    double temp = qubit_node->state[0];
    qubit_node->state[0] = qubit_node->state[1];
    qubit_node->state[1] = temp;
    printf("Pauli-X gate applied to %s. Alpha Probability: %f. Beta Probability: %f\n", qubit_node->value, qubit_node->state[0], qubit_node->state[1]);
}


