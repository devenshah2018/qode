#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "token.h"

#ifndef strndup
char *strndup(const char *s, size_t len) {
    char *copy = (char *)malloc(len + 1);
    if (copy == NULL) {
        return NULL; 
    }
    strncpy(copy, s, len);
    copy[len] = '\0'; 
    return copy;
}
#endif

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
        } else if (token_str[0] == '[') {
            char *end_bracket = strchr(token_str, ']');
            if (end_bracket != NULL) {
                size_t comment_length = end_bracket - token_str - 1;
                tokens[*token_count].type = TOKEN_COMMENT;
                tokens[*token_count].value = strndup(token_str + 1, comment_length); 
            }
        } else if (token_str[0] == '$') {
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
