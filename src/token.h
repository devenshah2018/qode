// token.h
#ifndef TOKEN_H
#define TOKEN_H

typedef enum {
    TOKEN_UNKNOWN,
    TOKEN_GATE,           // Quantum gates (X, H, etc.)
    TOKEN_QUBIT,          // Qubit names (q1, q2, etc.)
    TOKEN_MEASURE,        // Measurement operation (M)
    TOKEN_IDENTIFIER,     // Identifiers (e.g., variables or qubits)
    TOKEN_SEMICOLON,      // Semicolons
    TOKEN_END,            // End of input
    TOKEN_ERROR           // Error in tokenization
} TokenType;

typedef struct {
    TokenType type;
    char *value;
} Token;

#endif
