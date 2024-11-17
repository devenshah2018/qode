// lexer.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "token.h"

// A very basic lexer to recognize quantum operations
Token *lexer(const char *code, int *token_count) {
    Token *tokens = malloc(100 * sizeof(Token));
    *token_count = 0;

    char *token_value = malloc(100 * sizeof(char));
    int token_index = 0;
    int i = 0;

    while (code[i] != '\0') {
        if (code[i] == ' ' || code[i] == '\n' || code[i] == '\t') {
            // Skip whitespace
            i++;
            continue;
        }

        if (code[i] == 'X' || code[i] == 'H' || code[i] == 'C' || code[i] == 'M') {
            // Recognize gate operations (e.g., X, H, M)
            tokens[*token_count].type = TOKEN_GATE;
            tokens[*token_count].value = strdup(&code[i]);
            (*token_count)++;
            i++;
        } else if (code[i] == 'q' && code[i + 1] >= '0' && code[i + 1] <= '9') {
            // Recognize qubit names (e.g., q1, q2, etc.)
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
            // Recognize semicolons
            tokens[*token_count].type = TOKEN_SEMICOLON;
            tokens[*token_count].value = strdup(";");
            (*token_count)++;
            i++;
        } else {
            // Unknown token
            tokens[*token_count].type = TOKEN_ERROR;
            tokens[*token_count].value = strdup("ERROR");
            (*token_count)++;
            i++;
        }
    }

    return tokens;
}

void tokenize(const char *code) {
    // Example: Tokenize a simple code line
    printf("Tokenizing code: %s\n", code);

    Token token;
    if (strcmp(code, "X") == 0) {
        token.type = TOKEN_GATE;  // "X" is a gate operation
        token.value = strdup(code);
    } else if (strcmp(code, "q1") == 0) {
        token.type = TOKEN_QUBIT;  // "q1" is a qubit name
        token.value = strdup(code);
    } else if (strcmp(code, "M") == 0) {
        token.type = TOKEN_MEASURE;  // "M" is a measure operation
        token.value = strdup(code);
    } else {
        token.type = TOKEN_UNKNOWN;  // Unknown token type
        token.value = strdup(code);
    }

    // Output the token for testing
    printf("Token type: %d, Token value: %s\n", token.type, token.value);
}
