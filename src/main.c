// main.c
#include <stdio.h>
#include <stdlib.h>
#include "lexer.h"
#include "parser.h"

int main() {
    const char *code = "X q1;\nH q2;\nM q3;";
    int token_count = 0;
    
    // Tokenize the code
    Token *tokens = lexer(code, &token_count);
    
    // Parse the tokens into an AST
    ASTNode *ast = parse(tokens, token_count);

    // Print AST (for demonstration)
    ASTNode *current = ast;
    while (current != NULL) {
        printf("Node Type: %d, Value: %s\n", current->type, current->value);
        current = current->next;
    }

    // Free resources
    free_ast(ast);
    for (int i = 0; i < token_count; i++) {
        free(tokens[i].value);
    }
    free(tokens);

    return 0;
}
