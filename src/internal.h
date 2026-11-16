#ifndef QODE_INTERNAL_H
#define QODE_INTERNAL_H
#include "qode.h"
#include <stdbool.h>

#define QODE_PI 3.14159265358979323846264338327950288
#define QODE_MAX_EVENTS 1024u
#define QODE_MAX_EVENT_BYTES (16u * 1024u * 1024u)

typedef enum {
    OP_I,
    OP_H,
    OP_X,
    OP_Y,
    OP_Z,
    OP_S,
    OP_SDG,
    OP_T,
    OP_TDG,
    OP_RX,
    OP_RY,
    OP_RZ,
    OP_CX,
    OP_SWAP,
    OP_CCX,
    OP_CZ,
    OP_CS,
    OP_CT,
    OP_CSWAP,
    OP_MEASURE,
    OP_RESET,
    OP_PRINT,
    OP_INSPECT,
    OP_IF,
    OP_HALT
} Op;

typedef struct {
    Op op;
    unsigned q[3];
    double angle;
    size_t line, column, offset, length, jump;
    char *text;
} Instruction;

struct QodeProgram {
    char *source;
    Instruction *code;
    size_t count, capacity, nqubits, nbits;
    char *qubits[QODE_MAX_QUBITS];
    char *bits[QODE_MAX_BITS];
};

struct QodeRuntime {
    const QodeProgram *program;
    QodeComplex *state;
    size_t size, pc, steps;
    uint64_t seed, rng;
    int bits[QODE_MAX_BITS];
    bool quiet;
    char **events;
    size_t nevents, event_bytes;
};

typedef struct {
    char *data;
    size_t length, capacity;
    bool failed;
} Json;
void json_add(Json *j, const char *format, ...);
void json_string(Json *j, const char *value);
char *json_finish(Json *j);
void json_names(Json *j, char *const *names, size_t count);
void json_runtime(Json *j, const QodeRuntime *r, size_t limit, bool events);
const char *op_name(Op op);
uint32_t rng_next(QodeRuntime *r);
double rng_uniform(QodeRuntime *r);
QodeStatus runtime_event(QodeRuntime *r, char *event);
void runtime_clear_events(QodeRuntime *r);

#endif
