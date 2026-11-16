#include "internal.h"
#include <math.h>
#include <stdlib.h>
#include <string.h>

static QodeComplex add(QodeComplex a, QodeComplex b) {
    return (QodeComplex){a.re + b.re, a.im + b.im};
}
static QodeComplex mul(QodeComplex a, QodeComplex b) {
    return (QodeComplex){a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re};
}
static double probability(QodeComplex a) {
    return a.re * a.re + a.im * a.im;
}

/* PCG-XSH-RR 64/32, fixed odd increment. Seed procedure is part of the API. */
uint32_t rng_next(QodeRuntime *r) {
    uint64_t old = r->rng;
    r->rng = old * UINT64_C(6364136223846793005) + UINT64_C(1442695040888963407);
    uint32_t x = (uint32_t)(((old >> 18u) ^ old) >> 27u), rot = (uint32_t)(old >> 59u);
    return (x >> rot) | (x << ((-rot) & 31));
}
double rng_uniform(QodeRuntime *r) {
    uint64_t a = rng_next(r) >> 5, b = rng_next(r) >> 6;
    return (a * UINT64_C(67108864) + b) / 9007199254740992.0;
}
void runtime_clear_events(QodeRuntime *r) {
    for (size_t i = 0; i < r->nevents; i++)
        free(r->events[i]);
    free(r->events);
    r->events = NULL;
    r->nevents = 0;
    r->event_bytes = 0;
}
QodeStatus runtime_event(QodeRuntime *r, char *event) {
    if (!event)
        return QODE_MEMORY;
    size_t length = strlen(event) + 1;
    if (r->nevents >= QODE_MAX_EVENTS || length > QODE_MAX_EVENT_BYTES - r->event_bytes) {
        free(event);
        return QODE_LIMIT;
    }
    char **events = realloc(r->events, (r->nevents + 1) * sizeof(*events));
    if (!events) {
        free(event);
        return QODE_MEMORY;
    }
    r->events = events;
    r->events[r->nevents++] = event;
    r->event_bytes += length;
    return QODE_OK;
}
QodeStatus qode_runtime_reset(QodeRuntime *r, uint64_t seed) {
    if (!r)
        return QODE_INVALID;
    memset(r->state, 0, r->size * sizeof(*r->state));
    r->state[0].re = 1;
    r->pc = 0;
    r->steps = 0;
    r->seed = seed;
    r->rng = 0;
    (void)rng_next(r);
    r->rng += seed;
    (void)rng_next(r);
    for (size_t i = 0; i < QODE_MAX_BITS; i++)
        r->bits[i] = -1;
    runtime_clear_events(r);
    return QODE_OK;
}
QodeStatus qode_runtime_create(const QodeProgram *p, uint64_t seed, unsigned max_qubits,
                               QodeRuntime **out) {
    if (!out)
        return QODE_INVALID;
    *out = NULL;
    if (!p || !max_qubits || max_qubits > QODE_MAX_QUBITS)
        return QODE_INVALID;
    if (p->nqubits > max_qubits)
        return QODE_LIMIT;
    size_t size = (size_t)1 << p->nqubits;
    if (size > SIZE_MAX / sizeof(QodeComplex))
        return QODE_LIMIT;
    QodeRuntime *r = calloc(1, sizeof(*r));
    if (!r)
        return QODE_MEMORY;
    r->program = p;
    r->size = size;
    r->state = calloc(size, sizeof(*r->state));
    if (!r->state) {
        free(r);
        return QODE_MEMORY;
    }
    qode_runtime_reset(r, seed);
    *out = r;
    return QODE_OK;
}
void qode_runtime_destroy(QodeRuntime *r) {
    if (r) {
        runtime_clear_events(r);
        free(r->state);
        free(r);
    }
}
QodeStatus qode_runtime_clone(const QodeRuntime *r, QodeRuntime **out) {
    if (!out)
        return QODE_INVALID;
    *out = NULL;
    if (!r)
        return QODE_INVALID;
    QodeRuntime *copy = NULL;
    QodeStatus status = qode_runtime_create(r->program, r->seed, QODE_MAX_QUBITS, &copy);
    if (status != QODE_OK)
        return status;
    memcpy(copy->state, r->state, r->size * sizeof(*r->state));
    memcpy(copy->bits, r->bits, sizeof(r->bits));
    copy->pc = r->pc;
    copy->steps = r->steps;
    copy->rng = r->rng;
    copy->quiet = r->quiet;
    for (size_t i = 0; i < r->nevents; i++) {
        size_t n = strlen(r->events[i]) + 1;
        char *s = malloc(n);
        if (s)
            memcpy(s, r->events[i], n);
        status = runtime_event(copy, s);
        if (status != QODE_OK) {
            qode_runtime_destroy(copy);
            return status;
        }
    }
    *out = copy;
    return QODE_OK;
}
static void matrix(QodeRuntime *r, unsigned target, size_t controls, QodeComplex a, QodeComplex b,
                   QodeComplex c, QodeComplex d) {
    size_t mask = (size_t)1 << target;
    for (size_t base = 0; base < r->size; base += mask * 2) {
        for (size_t j = 0; j < mask; j++) {
            size_t lo = base + j;
            if ((lo & controls) != controls)
                continue;
            size_t hi = lo | mask;
            QodeComplex x = r->state[lo], y = r->state[hi];
            r->state[lo] = add(mul(a, x), mul(b, y));
            r->state[hi] = add(mul(c, x), mul(d, y));
        }
    }
}
static void swap(QodeRuntime *r, unsigned a, unsigned b, size_t controls) {
    size_t am = (size_t)1 << a, bm = (size_t)1 << b;
    for (size_t i = 0; i < r->size; i++)
        if (!(i & am) && (i & bm) && (i & controls) == controls) {
            size_t j = i ^ am ^ bm;
            QodeComplex t = r->state[i];
            r->state[i] = r->state[j];
            r->state[j] = t;
        }
}
static int measure(QodeRuntime *r, unsigned q) {
    size_t mask = (size_t)1 << q;
    double one = 0, zero = 0;
    for (size_t i = 0; i < r->size; i++) {
        if (i & mask)
            one += probability(r->state[i]);
        else
            zero += probability(r->state[i]);
    }
    /* Consume one draw even for deterministic measurements. Never choose an
     * impossible branch, including after accumulated floating-point drift. */
    double u = rng_uniform(r);
    int outcome = one <= 0 ? 0 : zero <= 0 ? 1 : u < one / (one + zero);
    double scale = 1 / sqrt(outcome ? one : zero);
    for (size_t i = 0; i < r->size; i++) {
        if (((i & mask) != 0) == (outcome != 0)) {
            r->state[i].re *= scale;
            r->state[i].im *= scale;
        } else
            r->state[i] = (QodeComplex){0, 0};
    }
    return outcome;
}
QodeStatus qode_runtime_step(QodeRuntime *r) {
    if (!r)
        return QODE_INVALID;
    if (r->pc >= r->program->count)
        return QODE_DONE;
    Instruction in = r->program->code[r->pc];
    QodeComplex zero = {0, 0}, one = {1, 0}, negative = {-1, 0};
    QodeComplex a = one, b = zero, c = zero, d = one;
    unsigned target = in.q[0];
    size_t controls = 0;
    bool apply = true;
    switch (in.op) {
    case OP_I:
        apply = false;
        break;
    case OP_H: {
        double k = 1 / sqrt(2.0);
        a = (QodeComplex){k, 0};
        b = a;
        c = a;
        d = (QodeComplex){-k, 0};
        break;
    }
    case OP_X:
        a = zero;
        b = one;
        c = one;
        d = zero;
        break;
    case OP_Y:
        a = zero;
        b = (QodeComplex){0, -1};
        c = (QodeComplex){0, 1};
        d = zero;
        break;
    case OP_Z:
        d = negative;
        break;
    case OP_S:
        d = (QodeComplex){0, 1};
        break;
    case OP_SDG:
        d = (QodeComplex){0, -1};
        break;
    case OP_T:
        d = (QodeComplex){cos(QODE_PI / 4), sin(QODE_PI / 4)};
        break;
    case OP_TDG:
        d = (QodeComplex){cos(QODE_PI / 4), -sin(QODE_PI / 4)};
        break;
    case OP_RX: {
        double co = cos(in.angle / 2), si = sin(in.angle / 2);
        a = (QodeComplex){co, 0};
        d = a;
        b = (QodeComplex){0, -si};
        c = b;
        break;
    }
    case OP_RY: {
        double co = cos(in.angle / 2), si = sin(in.angle / 2);
        a = (QodeComplex){co, 0};
        d = a;
        b = (QodeComplex){-si, 0};
        c = (QodeComplex){si, 0};
        break;
    }
    case OP_RZ:
        a = (QodeComplex){cos(in.angle / 2), -sin(in.angle / 2)};
        d = (QodeComplex){a.re, -a.im};
        break;
    case OP_CX:
    case OP_CCX:
        target = in.q[in.op == OP_CCX ? 2 : 1];
        controls = (size_t)1 << in.q[0];
        if (in.op == OP_CCX)
            controls |= (size_t)1 << in.q[1];
        a = zero;
        b = one;
        c = one;
        d = zero;
        break;
    case OP_CZ:
    case OP_CS:
    case OP_CT:
        target = in.q[1];
        controls = (size_t)1 << in.q[0];
        if (in.op == OP_CZ)
            d = negative;
        else if (in.op == OP_CS)
            d = (QodeComplex){0, 1};
        else
            d = (QodeComplex){cos(QODE_PI / 4), sin(QODE_PI / 4)};
        break;
    case OP_SWAP:
        swap(r, in.q[0], in.q[1], 0);
        apply = false;
        break;
    case OP_CSWAP:
        swap(r, in.q[1], in.q[2], (size_t)1 << in.q[0]);
        apply = false;
        break;
    case OP_MEASURE:
        r->bits[in.q[1]] = measure(r, in.q[0]);
        apply = false;
        break;
    case OP_RESET:
        if (measure(r, in.q[0])) {
            a = zero;
            b = one;
            c = one;
            d = zero;
        } else
            apply = false;
        break;
    case OP_IF:
        r->pc = r->bits[in.q[0]] == (int)in.q[1] ? r->pc + 1 : in.jump;
        r->steps++;
        return QODE_OK;
    case OP_HALT:
        r->pc = r->program->count;
        r->steps++;
        return QODE_OK;
    case OP_PRINT:
    case OP_INSPECT: {
        apply = false;
        if (!r->quiet) {
            Json j = {0};
            json_add(&j, "{\"kind\":\"%s\",\"line\":%zu,", in.op == OP_PRINT ? "print" : "inspect",
                     in.line);
            if (in.op == OP_PRINT) {
                json_add(&j, "\"text\":");
                json_string(&j, in.text);
            } else {
                json_add(&j, "\"view\":\"%s\",\"qubit\":%u,\"snapshot\":",
                         in.q[0] == 0   ? "state"
                         : in.q[0] == 1 ? "probabilities"
                                        : "qubit",
                         in.q[1]);
                json_runtime(&j, r, 64, false);
            }
            json_add(&j, "}");
            QodeStatus status = runtime_event(r, json_finish(&j));
            if (status != QODE_OK)
                return status;
        }
        break;
    }
    }
    if (apply)
        matrix(r, target, controls, a, b, c, d);
    r->pc++;
    r->steps++;
    return QODE_OK;
}
QodeStatus qode_runtime_run(QodeRuntime *r, QodeCancel cancel, void *context) {
    if (!r)
        return QODE_INVALID;
    for (;;) {
        if (cancel && cancel(context))
            return QODE_CANCELLED;
        QodeStatus s = qode_runtime_step(r);
        if (s == QODE_DONE)
            return QODE_OK;
        if (s != QODE_OK)
            return s;
    }
}
size_t qode_runtime_pc(const QodeRuntime *r) {
    return r ? r->pc : 0;
}
size_t qode_runtime_steps(const QodeRuntime *r) {
    return r ? r->steps : 0;
}
const QodeComplex *qode_runtime_state(const QodeRuntime *r, size_t *length) {
    if (length)
        *length = r ? r->size : 0;
    return r ? r->state : NULL;
}
int qode_runtime_bit(const QodeRuntime *r, size_t i) {
    return r && i < r->program->nbits ? r->bits[i] : -1;
}
