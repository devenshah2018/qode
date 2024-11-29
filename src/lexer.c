#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "token.h"

Token *lexer(const char *code, int *token_count) {
    Token *tokens = malloc(100 * sizeof(Token));  
    *token_count = 0;
    const char *delimiters = " \t\n;";
    char *code_copy = strdup(code);  
    char *token_str = strtok(code_copy, delimiters);
    while (token_str != NULL) {
        if (token_str[0] == '!') {
            tokens[*token_count].type = TOKEN_GATE;
        } else if (token_str[0] == 'q') {
            tokens[*token_count].type = TOKEN_QUBIT;
        } else if (token_str[0] == '#' && token_str[1] == '>') {
            tokens[*token_count].type = TOKEN_PRINT_FUNCTION;
        } else if (isalpha(token_str[0]) || isdigit(token_str[0]) || ispunct(token_str[0])) {
            tokens[*token_count].type = TOKEN_TEXT;
        } else {
            tokens[*token_count].type = TOKEN_UNKNOWN;
        }
        tokens[*token_count].value = strdup(token_str);
        (*token_count)++;
        token_str = strtok(NULL, delimiters);
    }
    free(code_copy);  
    return tokens;  
}

void tokenize(const char *code) {
    printf("Tokenizing code: %s\n", code);
    Token token;
    if (strcmp(code, "!") == 0) {
        token.type = TOKEN_GATE;
        token.value = strdup(code);
    } else if (strcmp(code, "q1") == 0) {
        token.type = TOKEN_QUBIT;
        token.value = strdup(code);
    } else if (strcmp(code, "M") == 0) {
        token.type = TOKEN_MEASURE;
        token.value = strdup(code);
    } else {
        token.type = TOKEN_UNKNOWN;
        token.value = strdup(code);
    }
    printf("Token type: %d, Token value: %s\n", token.type, token.value);
}
