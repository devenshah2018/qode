// parser.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "parser.h"
#include "token.h"
#include "lexer.h"

// Function to create a new AST node
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

// Function to free an AST node and its children
void free_ast(ASTNode *root) {
    if (root == NULL) return;
    free(root->value);
    free_ast(root->next);
    free(root);
}

// Main parsing function
ASTNode *parse(Token *tokens, int token_count) {
    int index = 0;
    ASTNode *head = NULL;
    ASTNode *current = NULL;

    while (index < token_count) {
        Token token = tokens[index];
        ASTNode *node = NULL;  // Initialize node here, inside the loop

        if (token.type == TOKEN_GATE) {
            // Handle quantum gate (e.g., X q1;)
            node = new_ast_node(NODE_GATE, token.value);
            index++;  // Move to the next token (the qubit name)
            if (tokens[index].type == TOKEN_QUBIT) {
                // Set the qubit name (e.g., q1)
                node->next = new_ast_node(NODE_GATE, tokens[index].value);
            } else {
                // Error: expected a qubit
                fprintf(stderr, "Error: Expected qubit after gate %s\n", token.value);
                free_ast(node);
                return NULL;
            }
            index++;  // Move past the qubit name
        } else if (token.type == TOKEN_MEASURE) {
            // Handle measurement (e.g., M q1;)
            node = new_ast_node(NODE_MEASURE, token.value);
            index++;  // Move to the next token (the qubit name)
            if (tokens[index].type == TOKEN_QUBIT) {
                node->next = new_ast_node(NODE_MEASURE, tokens[index].value);
            } else {
                // Error: expected a qubit for measurement
                fprintf(stderr, "Error: Expected qubit after measurement\n");
                free_ast(node);
                return NULL;
            }
            index++;  // Move past the qubit name
        } else if (token.type == TOKEN_SEMICOLON) {
            // Skip over semicolons
            index++;
            continue;
        } else {
            // Unexpected token
            fprintf(stderr, "Error: Unexpected token %s\n", token.value);
            return NULL;
        }

        // Add the operation to the AST linked list
        if (head == NULL) {
            head = current = node;
        } else {
            current->next = node;
            current = node;
        }
    }

    return head;
}
