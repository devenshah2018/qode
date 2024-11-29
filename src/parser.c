#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "parser.h"
#include "token.h"
#include "lexer.h"
#include "quantum.h"

ASTNode *new_ast_node(NodeType type, const char *value) {
    ASTNode *node = (ASTNode *)malloc(sizeof(ASTNode));
    if (node == NULL) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(1);
    }
    node->type = type;
    node->value = strdup(value);
    node->next = NULL;
    node->state[0] = 1.0;
    node->state[1] = 0.0;
    return node;
}

void free_ast(ASTNode *root) {
    if (root == NULL) return;
    free(root->value);
    free_ast(root->next);
    free(root);
}

ASTNode *parse(Token *tokens, int token_count) {
    int index = 0;
    ASTNode *head = NULL, *tail = NULL;
    while (index < token_count) {
        Token token = tokens[index];
        ASTNode *node = NULL;
        ASTNode *qubit_node = NULL;
        ASTNode *text_node = NULL;
        if (token.type == TOKEN_HADAMARD_GATE) {  
            ASTNode *hadamard_node = new_ast_node(NODE_GATE, token.value);
            if (++index < token_count && (tokens[index].type == TOKEN_QUBIT)) {  
                qubit_node = new_ast_node(NODE_QUBIT, tokens[index].value);
                qubit_node->state[0] = 1.0;
                qubit_node->state[1] = 0.0;
                apply_hadamard(qubit_node);
                hadamard_node->next = qubit_node;  
            } else {
                fprintf(stderr, "Error: Gate without qubit %s\n", token.value);
                free_ast(hadamard_node);
                return NULL;  
            }
            if (head == NULL) {  
                head = hadamard_node;  
                tail = qubit_node ? qubit_node : hadamard_node;  
            } else {
                tail->next = hadamard_node;  
                tail = qubit_node ? qubit_node : hadamard_node;  
            }
            index++;
        } else if (token.type == TOKEN_X_GATE) {
            ASTNode *x_node = new_ast_node(NODE_GATE, token.value);
            if (++index < token_count && (tokens[index].type == TOKEN_QUBIT)) {  
                qubit_node = new_ast_node(NODE_QUBIT, tokens[index].value);
                qubit_node->state[0] = 1.0;
                qubit_node->state[1] = 0.0;
                apply_pauli_x(qubit_node);
                x_node->next = qubit_node;  
            } else {
                fprintf(stderr, "Error: Gate without qubit %s\n", token.value);
                free_ast(x_node);
                return NULL;  
            }
            if (head == NULL) {  
                head = x_node;  
                tail = qubit_node ? qubit_node : x_node;  
            } else {
                tail->next = x_node;  
                tail = qubit_node ? qubit_node : x_node;  
            }
            index++;
        } else if (token.type == TOKEN_PRINT_FUNCTION){ 
            ASTNode *print_node = new_ast_node(NODE_PRINT_FUNCTION, token.value);
            if (++index < token_count && (tokens[index].type == TOKEN_TEXT)) {  
                text_node = new_ast_node(NODE_TEXT, tokens[index].value);
                printf("%s\n", text_node->value);
                print_node->next = text_node;  
            } else {
                fprintf(stderr, "Error: Built-in function without argument %s\n", token.value);
                free_ast(print_node);
                return NULL;  
            }
            if (head == NULL) {  
                head = print_node;  
                tail = text_node ? text_node : print_node;  
            } else {
                tail->next = print_node;  
                tail = text_node ? text_node : print_node;  
            }
            index++;
        } else {
            return head;  
        }
    }
    return head;  
}
