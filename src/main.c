#include <stdio.h>
#include <stdlib.h>
#include "lexer.h"
#include "parser.h"

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: %s <filename>\n", argv[0]);
        return 1;
    }
    const char *filename = argv[1];
    FILE *file = fopen(filename, "r");
    if (file == NULL) {
        perror("Error opening file");
        return 1;
    }
    fseek(file, 0, SEEK_END);          
    long file_size = ftell(file);      
    fseek(file, 0, SEEK_SET);          
    char *code = (char *)malloc(file_size + 1);  
    if (code == NULL) {
        printf("Memory allocation failed\n");
        fclose(file);
        return 1;
    }
    fread(code, 1, file_size, file);
    code[file_size] = '\0';  
    fclose(file);
    int token_count = 0;
    Token *tokens = lexer(code, &token_count);
    ASTNode *ast = parse(tokens, token_count);
    ASTNode *current = ast;
    while (current != NULL) {
        //printf("Node Type: %d, Value: %s\n", current->type, current->value);
        current = current->next;
    }
    free_ast(ast);  
    for (int i = 0; i < token_count; i++) {
        free(tokens[i].value);  
    }
    free(tokens);  
    free(code);
    return 0;
}
