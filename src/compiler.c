#include "scanner.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    Scanner scanner;
    Token token;
    QodeProgram *program;
    QodeDiagnostic *diagnostic;
    QodeStatus status;
    bool operations, initialized[QODE_MAX_BITS];
    unsigned depth, expression_depth;
} Parser;

static void error(Parser *p, QodeStatus status, Token at, const char *message) {
    if (p->status != QODE_OK)
        return;
    p->status = status;
    if (p->diagnostic && p->diagnostic->status == QODE_OK) {
        *p->diagnostic = (QodeDiagnostic){.status = status,
                                          .line = at.line,
                                          .column = at.column,
                                          .offset = at.offset,
                                          .length = at.length};
        snprintf(p->diagnostic->message, sizeof(p->diagnostic->message), "%s", message);
    }
}
static void next(Parser *p) {
    if (p->status != QODE_OK)
        return;
    p->token = scan_next(&p->scanner);
    if (p->token.kind == TK_ERROR)
        p->status = QODE_SYNTAX;
}
static bool word(Token t, const char *name) {
    return t.kind == TK_NAME && strlen(name) == t.length && memcmp(t.start, name, t.length) == 0;
}
static bool expect(Parser *p, TokenKind kind, const char *message) {
    if (p->status != QODE_OK)
        return false;
    if (p->token.kind != kind) {
        error(p, QODE_SYNTAX, p->token, message);
        return false;
    }
    next(p);
    return p->status == QODE_OK;
}
static char *copy_token(Token t) {
    char *s = malloc(t.length + 1);
    if (s) {
        memcpy(s, t.start, t.length);
        s[t.length] = 0;
    }
    return s;
}
static int find(char *const *names, size_t count, Token t) {
    for (size_t i = 0; i < count; i++)
        if (strlen(names[i]) == t.length && !memcmp(names[i], t.start, t.length))
            return (int)i;
    return -1;
}
static unsigned operand(Parser *p, bool bit) {
    Token t = p->token;
    if (!expect(p, TK_NAME, bit ? "Expected a classical bit name" : "Expected a qubit name"))
        return 0;
    int i = bit ? find(p->program->bits, p->program->nbits, t)
                : find(p->program->qubits, p->program->nqubits, t);
    if (i < 0) {
        error(p, QODE_SEMANTIC, t, bit ? "Undeclared classical bit" : "Undeclared qubit");
        return 0;
    }
    return (unsigned)i;
}
static bool append(Parser *p, Instruction in) {
    QodeProgram *g = p->program;
    if (p->status != QODE_OK) {
        free(in.text);
        return false;
    }
    if (g->count == QODE_MAX_INSTRUCTIONS) {
        error(p, QODE_LIMIT, p->token, "Instruction limit exceeded");
        free(in.text);
        return false;
    }
    if (g->count == g->capacity) {
        size_t cap = g->capacity ? g->capacity * 2 : 32;
        if (cap > QODE_MAX_INSTRUCTIONS)
            cap = QODE_MAX_INSTRUCTIONS;
        Instruction *code = realloc(g->code, cap * sizeof(*code));
        if (!code) {
            error(p, QODE_MEMORY, p->token, "Unable to allocate instructions");
            free(in.text);
            return false;
        }
        g->code = code;
        g->capacity = cap;
    }
    g->code[g->count++] = in;
    return true;
}
static double expression(Parser *p);
static double primary(Parser *p) {
    if (p->status != QODE_OK)
        return 0;
    if (++p->expression_depth > 64) {
        error(p, QODE_LIMIT, p->token, "Angle expression nesting exceeds 64");
        p->expression_depth--;
        return 0;
    }
    double result = 0;
    if (p->token.kind == TK_NUMBER) {
        result = p->token.number;
        next(p);
    } else if (word(p->token, "pi")) {
        result = QODE_PI;
        next(p);
    } else if (p->token.kind == TK_PLUS || p->token.kind == TK_MINUS) {
        bool negative = p->token.kind == TK_MINUS;
        next(p);
        result = primary(p);
        if (negative)
            result = -result;
    } else if (p->token.kind == TK_LPAREN) {
        next(p);
        result = expression(p);
        expect(p, TK_RPAREN, "Expected ) in angle expression");
    } else
        error(p, QODE_SYNTAX, p->token, "Expected number, pi, or parenthesized angle");
    p->expression_depth--;
    return result;
}
static double product(Parser *p) {
    double a = primary(p);
    while (p->status == QODE_OK && (p->token.kind == TK_STAR || p->token.kind == TK_SLASH)) {
        Token op = p->token;
        next(p);
        double b = primary(p);
        if (op.kind == TK_SLASH && b == 0) {
            error(p, QODE_SEMANTIC, op, "Division by zero in angle");
            return 0;
        }
        a = op.kind == TK_STAR ? a * b : a / b;
        if (!isfinite(a))
            error(p, QODE_SEMANTIC, op, "Non-finite angle");
    }
    return a;
}
static double expression(Parser *p) {
    double a = product(p);
    while (p->status == QODE_OK && (p->token.kind == TK_PLUS || p->token.kind == TK_MINUS)) {
        Token op = p->token;
        next(p);
        double b = product(p);
        a = op.kind == TK_PLUS ? a + b : a - b;
        if (!isfinite(a))
            error(p, QODE_SEMANTIC, op, "Non-finite angle");
    }
    return a;
}
static void declaration(Parser *p, bool bit) {
    Token at = p->token;
    next(p);
    Token name = p->token;
    if (p->operations) {
        error(p, QODE_SEMANTIC, at, "Declarations must precede operations");
        return;
    }
    if (name.length > 63) {
        error(p, QODE_LIMIT, name, "Names are limited to 63 ASCII characters");
        return;
    }
    if (!expect(p, TK_NAME, "Expected a declaration name"))
        return;
    QodeProgram *g = p->program;
    if (find(g->qubits, g->nqubits, name) >= 0 || find(g->bits, g->nbits, name) >= 0) {
        error(p, QODE_SEMANTIC, name, "Duplicate declaration");
        return;
    }
    if ((bit && g->nbits == QODE_MAX_BITS) || (!bit && g->nqubits == QODE_MAX_QUBITS)) {
        error(p, QODE_LIMIT, name,
              bit ? "At most 256 classical bits are supported" : "At most 24 qubits are supported");
        return;
    }
    if (!expect(p, TK_SEMI, "Expected ; after declaration"))
        return;
    char *s = copy_token(name);
    if (!s) {
        error(p, QODE_MEMORY, name, "Unable to allocate name");
        return;
    }
    if (bit)
        g->bits[g->nbits++] = s;
    else
        g->qubits[g->nqubits++] = s;
}
static void statement(Parser *p, bool conditional);
static void condition(Parser *p, Instruction in) {
    if (++p->depth > 32) {
        error(p, QODE_LIMIT, p->token, "Conditional nesting exceeds 32");
        p->depth--;
        return;
    }
    in.op = OP_IF;
    in.q[0] = operand(p, true);
    if (p->status == QODE_OK && !p->initialized[in.q[0]])
        error(p, QODE_SEMANTIC, p->token, "Classical condition reads an uninitialized bit");
    expect(p, TK_EQ, "Expected == in condition");
    Token value = p->token;
    if (value.kind != TK_NUMBER || value.length != 1 ||
        (value.start[0] != '0' && value.start[0] != '1'))
        error(p, QODE_SYNTAX, value, "Condition must compare to 0 or 1");
    in.q[1] = value.kind == TK_NUMBER && value.number == 1 ? 1 : 0;
    next(p);
    expect(p, TK_LBRACE, "Expected { for conditional gate block");
    in.length = p->token.offset - in.offset;
    size_t index = p->program->count;
    if (!append(p, in)) {
        p->depth--;
        return;
    }
    while (p->status == QODE_OK && p->token.kind != TK_RBRACE && p->token.kind != TK_END)
        statement(p, true);
    expect(p, TK_RBRACE, "Expected } after conditional gate block");
    p->program->code[index].jump = p->program->count;
    p->depth--;
}
static void statement(Parser *p, bool conditional) {
    Token at = p->token;
    if (!conditional && (word(at, "qubit") || word(at, "bit"))) {
        declaration(p, word(at, "bit"));
        return;
    }
    p->operations = true;
    if (at.kind != TK_NAME) {
        error(p, QODE_SYNTAX, at, "Expected a statement");
        return;
    }
    next(p);
    Instruction in = {.line = at.line, .column = at.column, .offset = at.offset};
    if (word(at, "if")) {
        condition(p, in);
        return;
    }
    bool gate = false, rotation = false;
    unsigned arity = 1;
    for (int op = OP_I; op <= OP_CSWAP; op++)
        if (word(at, op_name((Op)op))) {
            in.op = (Op)op;
            gate = true;
            break;
        }
    if (gate) {
        rotation = in.op >= OP_RX && in.op <= OP_RZ;
        if (rotation) {
            expect(p, TK_LPAREN, "Expected (angle) after rotation gate");
            in.angle = expression(p);
            expect(p, TK_RPAREN, "Expected ) after rotation angle");
        }
        if (in.op == OP_CCX || in.op == OP_CSWAP)
            arity = 3;
        else if (in.op >= OP_CX && in.op <= OP_CT)
            arity = 2;
        for (unsigned i = 0; i < arity && p->status == QODE_OK; i++) {
            if (i)
                expect(p, TK_COMMA, "Expected , between qubits");
            in.q[i] = operand(p, false);
            for (unsigned j = 0; j < i; j++)
                if (in.q[j] == in.q[i])
                    error(p, QODE_SEMANTIC, at, "Gate operands must be distinct qubits");
        }
    } else if (conditional) {
        error(p, QODE_SEMANTIC, at,
              "Conditional blocks may contain only gates and nested conditions");
        return;
    } else if (word(at, "measure")) {
        in.op = OP_MEASURE;
        in.q[0] = operand(p, false);
        expect(p, TK_ARROW, "Expected -> before measurement destination");
        in.q[1] = operand(p, true);
        if (p->status == QODE_OK)
            p->initialized[in.q[1]] = true;
    } else if (word(at, "reset")) {
        in.op = OP_RESET;
        in.q[0] = operand(p, false);
    } else if (word(at, "print")) {
        in.op = OP_PRINT;
        Token text = p->token;
        if (!expect(p, TK_STRING, "Expected a quoted string after print"))
            return;
        in.text = malloc(text.length);
        if (!in.text) {
            error(p, QODE_MEMORY, text, "Unable to allocate text");
            return;
        }
        size_t n = 0;
        for (size_t i = 1; i + 1 < text.length; i++) {
            char c = text.start[i];
            if (c == '\\') {
                c = text.start[++i];
                if (c == 'n')
                    c = '\n';
                else if (c == 'r')
                    c = '\r';
                else if (c == 't')
                    c = '\t';
            }
            in.text[n++] = c;
        }
        in.text[n] = 0;
    } else if (word(at, "inspect")) {
        in.op = OP_INSPECT;
        if (word(p->token, "state") || word(p->token, "probabilities")) {
            in.q[0] = word(p->token, "state") ? 0 : 1;
            next(p);
        } else if (word(p->token, "qubit")) {
            in.q[0] = 2;
            next(p);
            in.q[1] = operand(p, false);
        } else
            error(p, QODE_SYNTAX, p->token,
                  "Expected state, probabilities, or qubit after inspect");
    } else if (word(at, "halt"))
        in.op = OP_HALT;
    else {
        error(p, QODE_SYNTAX, at, "Unknown statement or gate");
        return;
    }
    in.length = p->token.offset + p->token.length - at.offset;
    expect(p, TK_SEMI, "Expected ; after statement");
    append(p, in);
}
static bool valid_utf8(const unsigned char *s, size_t n) {
    for (size_t i = 0; i < n; i++) {
        unsigned c = s[i], count = 0;
        uint32_t value = 0, min = 0;
        if (c < 128)
            continue;
        if (c >= 0xc2 && c <= 0xdf) {
            count = 1;
            value = c & 31;
            min = 0x80;
        } else if (c >= 0xe0 && c <= 0xef) {
            count = 2;
            value = c & 15;
            min = 0x800;
        } else if (c >= 0xf0 && c <= 0xf4) {
            count = 3;
            value = c & 7;
            min = 0x10000;
        } else
            return false;
        if (count > n - i - 1)
            return false;
        while (count--) {
            c = s[++i];
            if ((c & 0xc0) != 0x80)
                return false;
            value = (value << 6) | (c & 63);
        }
        if (value < min || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff))
            return false;
    }
    return true;
}
QodeStatus qode_compile(const char *source, size_t length, QodeProgram **out,
                        QodeDiagnostic *diagnostic) {
    if (diagnostic)
        *diagnostic = (QodeDiagnostic){0};
    if (!out)
        return QODE_INVALID;
    *out = NULL;
    if (!source) {
        if (diagnostic) {
            diagnostic->status = QODE_INVALID;
            snprintf(diagnostic->message, sizeof(diagnostic->message), "Source is NULL");
        }
        return QODE_INVALID;
    }
    if (length > QODE_MAX_SOURCE) {
        if (diagnostic) {
            diagnostic->status = QODE_LIMIT;
            snprintf(diagnostic->message, sizeof(diagnostic->message), "Source exceeds 1 MiB");
        }
        return QODE_LIMIT;
    }
    QodeProgram *g = calloc(1, sizeof(*g));
    if (!g)
        return QODE_MEMORY;
    g->source = malloc(length + 1);
    if (!g->source) {
        free(g);
        return QODE_MEMORY;
    }
    memcpy(g->source, source, length);
    g->source[length] = 0;
    Parser p = {.program = g, .diagnostic = diagnostic};
    p.scanner = (Scanner){.source = g->source,
                          .cursor = g->source,
                          .end = g->source + length,
                          .line = 1,
                          .column = 1,
                          .diagnostic = diagnostic};
    if (memchr(source, 0, length))
        error(&p, QODE_SYNTAX, (Token){.line = 1, .column = 1}, "Source contains a NUL byte");
    if (!valid_utf8((const unsigned char *)source, length))
        error(&p, QODE_SYNTAX, (Token){.line = 1, .column = 1}, "Source must be valid UTF-8");
    next(&p);
    while (p.status == QODE_OK && p.token.kind != TK_END)
        statement(&p, false);
    if (p.status != QODE_OK) {
        qode_program_destroy(g);
        return p.status;
    }
    *out = g;
    return QODE_OK;
}
void qode_program_destroy(QodeProgram *g) {
    if (!g)
        return;
    for (size_t i = 0; i < g->count; i++)
        free(g->code[i].text);
    for (size_t i = 0; i < g->nqubits; i++)
        free(g->qubits[i]);
    for (size_t i = 0; i < g->nbits; i++)
        free(g->bits[i]);
    free(g->code);
    free(g->source);
    free(g);
}
size_t qode_program_qubits(const QodeProgram *p) {
    return p ? p->nqubits : 0;
}
size_t qode_program_instructions(const QodeProgram *p) {
    return p ? p->count : 0;
}
const char *op_name(Op op) {
    static const char *const names[] = {
        "i",     "h",       "x",     "y",     "z",       "s",   "sdg", "t",  "tdg",
        "rx",    "ry",      "rz",    "cx",    "swap",    "ccx", "cz",  "cs", "ct",
        "cswap", "measure", "reset", "print", "inspect", "if",  "halt"};
    return op <= OP_HALT ? names[op] : "unknown";
}
const char *qode_status_name(QodeStatus s) {
    static const char *const names[] = {"ok",    "done",   "syntax",  "semantic",
                                        "limit", "memory", "invalid", "cancelled"};
    return (unsigned)s <= QODE_CANCELLED ? names[s] : "unknown";
}
void qode_string_free(char *s) {
    free(s);
}
