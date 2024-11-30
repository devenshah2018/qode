#ifndef PARSER_H
#define PARSER_H
#include "token.h"

typedef enum {
    NODE_UNKNOWN,
    NODE_QUBIT,
    NODE_TEXT,
    NODE_PRINT_FUNCTION,
    NODE_HADAMARD_GATE,
    NODE_X_GATE,
    NODE_COMMENT,
    NODE_BUILTIN,        
    NODE_MEASURE
} NodeType;

typedef struct ASTNode {
    NodeType type;
    char *value;            
    struct ASTNode *next;   
    double state[2];
} ASTNode;

ASTNode *parse(Token *tokens, int token_count);
ASTNode *new_ast_node(NodeType type, const char *value);
void free_ast(ASTNode *root);

#endif
