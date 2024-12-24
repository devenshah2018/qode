#include <stdio.h>
#include <math.h>
#include "quantum.h"
#include "parser.h"
#include <complex.h>

void normalize_state(double state[4]) {
    for (int i = 0; i < 4; i++) {
        if (state[i] == -0.0) {
            state[i] = 0.0;
        }
    }
}

void create_qubit(ASTNode *qubit_node, double alpha_real, double alpha_imag, double beta_real, double beta_imag) {
    qubit_node->state[0] = alpha_real;  
    qubit_node->state[1] = alpha_imag;  
    qubit_node->state[2] = beta_real;   
    qubit_node->state[3] = beta_imag;   
    normalize_state(qubit_node->state);
}

void apply_h_gate(ASTNode *qubit_node) {
    if (qubit_node == NULL) return;
    double alpha = qubit_node->state[0];
    double beta = qubit_node->state[2];
    double new_alpha = (alpha + beta) / sqrt(2);
    double new_beta = (alpha - beta) / sqrt(2);
    double alpha_prob = pow(new_alpha, 2);
    double beta_prob = pow(new_beta, 2);
    qubit_node->state[0] = alpha_prob;
    qubit_node->state[2] = beta_prob;
    normalize_state(qubit_node->state);
    printf("Hadamard gate applied to %s.\n", qubit_node->value);
}

void apply_x_gate(ASTNode *qubit_node) {
    if (qubit_node == NULL) return;
    double temp_real = qubit_node->state[0];  
    double temp_imag = qubit_node->state[1];  
    create_qubit(qubit_node, qubit_node->state[2], qubit_node->state[3], temp_real, temp_imag);
    printf("Pauli-X gate applied to %s.\n", qubit_node->value);
}

void apply_i_gate(ASTNode *qubit_node) {
    printf("Identity gate applied to %s. Alpha Probability (Real): %f. Alpha Probability (Complex): %f. Beta Probability (Real): %f. Beta Probability (Complex): %f\n", qubit_node->value, qubit_node->state[0], qubit_node->state[1], qubit_node->state[2], qubit_node->state[3]);
}

void apply_y_gate(ASTNode *qubit_node) {
    if (qubit_node == NULL) return;
    double complex alpha = qubit_node->state[0] + qubit_node->state[1] * I;
    double complex beta = qubit_node->state[2] + qubit_node->state[3] * I;
    double complex new_alpha = -I * beta;
    double complex new_beta = I * alpha;
    create_qubit(qubit_node, creal(new_alpha), cimag(new_alpha), creal(new_beta), cimag(new_beta));
    printf("Pauli-Y gate applied to %s.\n", qubit_node->value);
}

void apply_z_gate(ASTNode *qubit_node) {
    if (qubit_node == NULL) return;
    double complex alpha = qubit_node->state[0] + qubit_node->state[1] * I;
    double complex beta = qubit_node->state[2] + qubit_node->state[3] * I;
    double complex new_alpha = alpha; 
    double complex new_beta = -beta;  
    create_qubit(qubit_node, creal(new_alpha), cimag(new_alpha), creal(new_beta), cimag(new_beta));
    printf("Pauli-Z gate applied to %s.\n", qubit_node->value);
}

void apply_phase_s_gate(ASTNode *qubit_node) {
    if (qubit_node == NULL) return;
    double complex alpha = qubit_node->state[0] + qubit_node->state[1] * I;
    double complex beta = qubit_node->state[2] + qubit_node->state[3] * I;
    double complex new_alpha = alpha; 
    double complex new_beta = beta * cexp(I * M_PI / 2);
    create_qubit(qubit_node, creal(new_alpha), cimag(new_alpha), creal(new_beta), cimag(new_beta));
    printf("Phase S gate applied to %s.\n", qubit_node->value);
}

void apply_phase_t_gate(ASTNode *qubit_node) {
    if (qubit_node == NULL) return;
    double complex alpha = qubit_node->state[0] + qubit_node->state[1] * I;
    double complex beta = qubit_node->state[2] + qubit_node->state[3] * I;
    double complex new_alpha = alpha; 
    double complex new_beta = beta * cexp(I * M_PI / 4);
    create_qubit(qubit_node, creal(new_alpha), cimag(new_alpha), creal(new_beta), cimag(new_beta));
    printf("Phase T gate applied to %s.\n", qubit_node->value);
}
