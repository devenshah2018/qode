// parser.h
#ifndef PARSER_H
#define PARSER_H

#include "token.h"

typedef enum {
    NODE_GATE,           // Quantum gate
    NODE_MEASURE         // Measurement operation
} NodeType;

typedef struct ASTNode {
    NodeType type;
    char *value;            // For gate names like "X", "H", or qubit names like "q1"
    struct ASTNode *next;   // Linked list to handle multiple operations in sequence
} ASTNode;

// Function to parse the token stream into an AST
ASTNode *parse(Token *tokens, int token_count);

// Function to create a new AST node
ASTNode *new_ast_node(NodeType type, const char *value);

// Function to free AST
void free_ast(ASTNode *root);

#endif
