#ifndef TOKEN_H
#define TOKEN_H

typedef enum {
    TOKEN_UNKNOWN,
    TOKEN_QUBIT,
    TOKEN_TEXT,
    TOKEN_PRINT_FUNCTION,
    TOKEN_H_GATE,
    TOKEN_X_GATE,
    TOKEN_COMMENT  
} TokenType;

typedef struct {
    TokenType type;
    char *value;
} Token;

#endif
