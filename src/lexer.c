
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "token.h"


Token *lexer(const char *code, int *token_count) {
    Token *tokens = malloc(100 * sizeof(Token));
    *token_count = 0;
    char *token_value = malloc(100 * sizeof(char));
    int token_index = 0;
    int i = 0;
    while (code[i] != '\0') {
        if (code[i] == ' ' || code[i] == '\n' || code[i] == '\t') {
            i++;
            continue;
        }
        if (code[i] == 'X' || code[i] == 'H' || code[i] == 'C' || code[i] == 'M') {
            tokens[*token_count].type = TOKEN_GATE;
            tokens[*token_count].value = strdup(&code[i]);
            (*token_count)++;
            i++;
        } else if (code[i] == 'q' && code[i + 1] >= '0' && code[i + 1] <= '9') {
            int j = 0;
            token_value[j++] = code[i++];
            while (code[i] >= '0' && code[i] <= '9') {
                token_value[j++] = code[i++];
            }
            token_value[j] = '\0';
            tokens[*token_count].type = TOKEN_QUBIT;
            tokens[*token_count].value = strdup(token_value);
            (*token_count)++;
        } else if (code[i] == ';') {
            tokens[*token_count].type = TOKEN_SEMICOLON;
            tokens[*token_count].value = strdup(";");
            (*token_count)++;
            i++;
        } else {
            tokens[*token_count].type = TOKEN_ERROR;
            tokens[*token_count].value = strdup("ERROR");
            (*token_count)++;
            i++;
        }
    }
    return tokens;
}

void tokenize(const char *code) {
    printf("Tokenizing code: %s\n", code);
    Token token;
    if (strcmp(code, "X") == 0) {
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
