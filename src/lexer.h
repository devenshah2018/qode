#ifndef LEXER_H
#define LEXER_H

#include "token.h"  // Include the token definition

Token *lexer(const char *code, int *token_count);
void tokenize(const char *code); 

#endif
