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
    ASTNode *head = NULL;
    ASTNode *current = NULL;
    while (index < token_count) {
        Token token = tokens[index];
        ASTNode *node = NULL;  
        if (token.type == TOKEN_GATE) {
            node = new_ast_node(NODE_GATE, token.value);
            index++;  
            if (tokens[index].type == TOKEN_QUBIT) {
                
                node->next = new_ast_node(NODE_GATE, tokens[index].value);
            } else {
                fprintf(stderr, "Error: Expected qubit after gate %s\n", token.value);
                free_ast(node);
                return NULL;
            }
            index++;  
        } else if (token.type == TOKEN_MEASURE) {
            node = new_ast_node(NODE_MEASURE, token.value);
            index++;  
            if (tokens[index].type == TOKEN_QUBIT) {
                node->next = new_ast_node(NODE_MEASURE, tokens[index].value);
            } else {
                
                fprintf(stderr, "Error: Expected qubit after measurement\n");
                free_ast(node);
                return NULL;
            }
            index++;  
        } else if (token.type == TOKEN_SEMICOLON) {
            index++;
            continue;
        } else {
            fprintf(stderr, "Error: Unexpected token %s\n", token.value);
            return NULL;
        }
        if (head == NULL) {
            head = current = node;
        } else {
            current->next = node;
            current = node;
        }
    }
    return head;
}
