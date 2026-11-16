#ifndef QODE_SCANNER_H
#define QODE_SCANNER_H
#include "internal.h"

typedef enum {
    TK_END,
    TK_NAME,
    TK_NUMBER,
    TK_STRING,
    TK_SEMI,
    TK_COMMA,
    TK_LPAREN,
    TK_RPAREN,
    TK_LBRACE,
    TK_RBRACE,
    TK_PLUS,
    TK_MINUS,
    TK_STAR,
    TK_SLASH,
    TK_ARROW,
    TK_EQ,
    TK_ERROR
} TokenKind;
typedef struct {
    TokenKind kind;
    const char *start;
    size_t length, line, column, offset;
    double number;
} Token;
typedef struct {
    const char *source, *cursor, *end;
    size_t line, column;
    QodeDiagnostic *diagnostic;
} Scanner;
Token scan_next(Scanner *scanner);
#endif
