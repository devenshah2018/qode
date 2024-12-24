#ifndef QUANTUM_H
#define QUANTUM_H
#include "parser.h"

void apply_h_gate(ASTNode *qubit_node);

void apply_x_gate(ASTNode *qubit_node);

void apply_i_gate(ASTNode *qubit_node);

void apply_y_gate(ASTNode *qubit_node);

void apply_z_gate(ASTNode *qubit_node);

void apply_phase_s_gate(ASTNode *qubit_node);

void apply_phase_t_gate(ASTNode *qubit_node);

#endif
