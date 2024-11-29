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
        if (token_str[0] == '!' && token_str[1] == 'H') {
            tokens[*token_count].type = TOKEN_HADAMARD_GATE;
        } else if (token_str[0] == '!' && token_str[1] == 'X') {
            tokens[*token_count].type = TOKEN_X_GATE;
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
