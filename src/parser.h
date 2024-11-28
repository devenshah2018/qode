#ifndef PARSER_H
#define PARSER_H
#include "token.h"

typedef enum {
    NODE_GATE,           
    NODE_MEASURE,
    NODE_QUBIT     
} NodeType;

typedef struct ASTNode {
    NodeType type;
    char *value;            
    struct ASTNode *next;   
} ASTNode;

ASTNode *parse(Token *tokens, int token_count);
ASTNode *new_ast_node(NodeType type, const char *value);
void free_ast(ASTNode *root);

#endif
