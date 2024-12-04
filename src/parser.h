#ifndef PARSER_H
#define PARSER_H
#include "token.h"

typedef enum {
    NODE_UNKNOWN,
    NODE_QUBIT,
    NODE_TEXT,
    NODE_PRINT_FUNCTION,
    NODE_H_GATE,
    NODE_X_GATE,
    NODE_I_GATE,
    NODE_Y_GATE,
    NODE_COMMENT,
    NODE_TERMINATE
} NodeType;

typedef struct ASTNode {
    double id;
    NodeType type;
    char *value;            
    struct ASTNode *next;   
    double state[4];
} ASTNode;

ASTNode *parse(Token *tokens, int token_count);
ASTNode *new_ast_node(NodeType type, const char *value, double id);
void free_ast(ASTNode *root);

#endif
