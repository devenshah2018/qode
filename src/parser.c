#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "parser.h"
#include "token.h"
#include "lexer.h"

ASTNode *new_ast_node(NodeType type, const char *value) {
    ASTNode *node = (ASTNode *)malloc(sizeof(ASTNode));
    if (node == NULL) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(1);
    }
    node->type = type;
    node->value = strdup(value);
    node->next = NULL;
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
        if (token.type == TOKEN_GATE) {
            ASTNode *gate_node = new_ast_node(NODE_GATE, token.value);
            if (++index < token_count && tokens[index].type == TOKEN_QUBIT) {
                qubit_node = new_ast_node(NODE_QUBIT, tokens[index].value);
                gate_node->next = qubit_node;  
            } else {
                fprintf(stderr, "Error: Gate without qubit %s\n", token.value);
                free_ast(gate_node);
                return NULL;
            }

            
            if (head == NULL) {
                head = tail = gate_node;  
            } else {
                tail->next = gate_node;  
                tail = qubit_node ? qubit_node : gate_node;  
            }
            index++;
        } else {
            fprintf(stderr, "Error: Unexpected token %s\n", token.value);
            return NULL;
        }
    }
    return head;
}

