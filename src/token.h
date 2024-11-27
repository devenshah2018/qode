#ifndef TOKEN_H
#define TOKEN_H

typedef enum {
    TOKEN_UNKNOWN,
    TOKEN_GATE,           
    TOKEN_QUBIT,          
    TOKEN_MEASURE,        
    TOKEN_IDENTIFIER,     
    TOKEN_SEMICOLON,      
    TOKEN_END,            
    TOKEN_ERROR           
} TokenType;

typedef struct {
    TokenType type;
    char *value;
} Token;

#endif
