#include "scanner.h"
#include <ctype.h>
#include <errno.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static char take(Scanner *s) {
    char c = *s->cursor++;
    if (c == '\n') {
        s->line++;
        s->column = 1;
    } else
        s->column++;
    return c;
}
static Token fail(Scanner *s, Token t, const char *message) {
    t.kind = TK_ERROR;
    if (s->diagnostic && s->diagnostic->status == QODE_OK) {
        *s->diagnostic = (QodeDiagnostic){.status = QODE_SYNTAX,
                                          .line = t.line,
                                          .column = t.column,
                                          .offset = t.offset,
                                          .length = t.length};
        snprintf(s->diagnostic->message, sizeof(s->diagnostic->message), "%s", message);
    }
    return t;
}
Token scan_next(Scanner *s) {
    for (;;) {
        while (s->cursor < s->end && isspace((unsigned char)*s->cursor))
            take(s);
        if (s->cursor < s->end && *s->cursor == '[') {
            Token t = {.start = s->cursor,
                       .line = s->line,
                       .column = s->column,
                       .offset = (size_t)(s->cursor - s->source),
                       .length = 1};
            take(s);
            while (s->cursor < s->end && *s->cursor != ']')
                take(s);
            if (s->cursor == s->end)
                return fail(s, t, "Unterminated bracket comment");
            take(s);
        } else if (s->end - s->cursor >= 2 && s->cursor[0] == '/' && s->cursor[1] == '/') {
            while (s->cursor < s->end && *s->cursor != '\n')
                take(s);
        } else
            break;
    }
    Token t = {.kind = TK_END,
               .start = s->cursor,
               .line = s->line,
               .column = s->column,
               .offset = (size_t)(s->cursor - s->source)};
    if (s->cursor == s->end)
        return t;
    char c = take(s);
    t.length = 1;
    if (isalpha((unsigned char)c) || c == '_') {
        while (s->cursor < s->end && (isalnum((unsigned char)*s->cursor) || *s->cursor == '_'))
            take(s);
        t.kind = TK_NAME;
    } else if (isdigit((unsigned char)c) ||
               (c == '.' && s->cursor < s->end && isdigit((unsigned char)*s->cursor))) {
        char *end = NULL;
        errno = 0;
        t.number = strtod(t.start, &end);
        if (end > s->end || end == t.start || errno == ERANGE || !isfinite(t.number))
            return fail(s, t, "Invalid or out-of-range number");
        while (s->cursor < end)
            take(s);
        t.kind = TK_NUMBER;
    } else if (c == '"') {
        bool closed = false;
        while (s->cursor < s->end) {
            char v = take(s);
            if (v == '"') {
                closed = true;
                break;
            }
            if ((unsigned char)v < 32)
                return fail(s, t, "Unescaped control character in string");
            if (v == '\\') {
                if (s->cursor == s->end)
                    break;
                char e = take(s);
                if (e != 'n' && e != 'r' && e != 't' && e != '"' && e != '\\')
                    return fail(s, t, "Unknown string escape");
            }
        }
        if (!closed)
            return fail(s, t, "Unterminated string");
        t.kind = TK_STRING;
    } else {
        switch (c) {
        case ';':
            t.kind = TK_SEMI;
            break;
        case ',':
            t.kind = TK_COMMA;
            break;
        case '(':
            t.kind = TK_LPAREN;
            break;
        case ')':
            t.kind = TK_RPAREN;
            break;
        case '{':
            t.kind = TK_LBRACE;
            break;
        case '}':
            t.kind = TK_RBRACE;
            break;
        case '+':
            t.kind = TK_PLUS;
            break;
        case '*':
            t.kind = TK_STAR;
            break;
        case '/':
            t.kind = TK_SLASH;
            break;
        case '-':
            t.kind = TK_MINUS;
            if (s->cursor < s->end && *s->cursor == '>') {
                take(s);
                t.kind = TK_ARROW;
            }
            break;
        case '=':
            if (s->cursor < s->end && *s->cursor == '=') {
                take(s);
                t.kind = TK_EQ;
                break;
            }
            return fail(s, t, "Use == for a classical condition");
        default:
            return fail(s, t, "Unexpected character");
        }
    }
    t.length = (size_t)(s->cursor - t.start);
    return t;
}
