#include <stdio.h>
#include <stdlib.h>
#include "lexer.h"
#include "parser.h"
#include "token.h"

void run_language(const char *file_path) {
    FILE *file = fopen(file_path, "r");
    if (!file) {
        printf("Error: Cannot open file %s\n", file_path);
        return;
    }
    char *line = malloc(1024);
    int token_count = 0;
    Token *tokens = NULL;

    while (fgets(line, 1024, file)) {
        printf("Processing: %s", line);
        tokens = lexer(line, &token_count);
        ASTNode *ast = parse(tokens, token_count);
        ASTNode *current = ast;
        while (current) {
            printf("Node Type: %d, Value: %s\n", current->type, current->value);
            current = current->next;
        }
        free_ast(ast);
        for (int i = 0; i < token_count; i++) {
            free(tokens[i].value);  
        }
            free(tokens); 
        }

    free(line);
    fclose(file);
}

