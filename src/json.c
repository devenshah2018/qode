#include "internal.h"
#include <math.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void json_add(Json *j, const char *format, ...) {
    if (j->failed)
        return;
    va_list ap, copy;
    va_start(ap, format);
    va_copy(copy, ap);
    int n = vsnprintf(NULL, 0, format, copy);
    va_end(copy);
    if (n < 0 || (size_t)n > SIZE_MAX - j->length - 1) {
        j->failed = true;
        va_end(ap);
        return;
    }
    size_t need = j->length + (size_t)n + 1;
    if (need > j->capacity) {
        size_t cap = j->capacity ? j->capacity : 256;
        while (cap < need) {
            if (cap > SIZE_MAX / 2) {
                cap = need;
                break;
            }
            cap *= 2;
        }
        char *p = realloc(j->data, cap);
        if (!p) {
            j->failed = true;
            va_end(ap);
            return;
        }
        j->data = p;
        j->capacity = cap;
    }
    (void)vsnprintf(j->data + j->length, j->capacity - j->length, format, ap);
    va_end(ap);
    j->length += (size_t)n;
}
void json_string(Json *j, const char *s) {
    json_add(j, "\"");
    for (const unsigned char *p = (const unsigned char *)s; *p; p++) {
        if (*p == '"' || *p == '\\')
            json_add(j, "\\%c", *p);
        else if (*p < 32)
            json_add(j, "\\u%04x", *p);
        else
            json_add(j, "%c", *p);
    }
    json_add(j, "\"");
}
char *json_finish(Json *j) {
    if (j->failed) {
        free(j->data);
        return NULL;
    }
    if (!j->data) {
        j->data = calloc(1, 1);
    }
    return j->data;
}
void json_names(Json *j, char *const *names, size_t n) {
    json_add(j, "[");
    for (size_t i = 0; i < n; i++) {
        if (i)
            json_add(j, ",");
        json_string(j, names[i]);
    }
    json_add(j, "]");
}
char *qode_program_json(const QodeProgram *p) {
    if (!p)
        return NULL;
    Json j = {0};
    json_add(&j, "{\"schemaVersion\":1,\"qubits\":");
    json_names(&j, p->qubits, p->nqubits);
    json_add(&j, ",\"bits\":");
    json_names(&j, p->bits, p->nbits);
    json_add(&j, ",\"instructions\":[");
    for (size_t i = 0; i < p->count; i++) {
        const Instruction *in = &p->code[i];
        if (i)
            json_add(&j, ",");
        json_add(
            &j,
            "{\"op\":\"%s\",\"line\":%zu,\"column\":%zu,\"offset\":%zu,\"length\":%zu,\"qubits\":[",
            op_name(in->op), in->line, in->column, in->offset, in->length);
        unsigned n = in->op <= OP_RZ || in->op == OP_MEASURE || in->op == OP_RESET ? 1
                     : in->op == OP_CCX || in->op == OP_CSWAP                      ? 3
                     : in->op >= OP_CX && in->op <= OP_CT                          ? 2
                                                                                   : 0;
        for (unsigned k = 0; k < n; k++)
            json_add(&j, "%s%u", k ? "," : "", in->q[k]);
        json_add(&j, "],\"angle\":%.17g,\"jump\":%zu,\"bit\":%u,\"conditionValue\":%u}", in->angle,
                 in->jump, in->op == OP_MEASURE ? in->q[1] : in->q[0], in->q[1]);
    }
    json_add(&j, "]}");
    return json_finish(&j);
}
typedef struct {
    size_t index;
    double p;
} Entry;
static bool better(Entry a, Entry b) {
    return a.p > b.p || (a.p == b.p && a.index < b.index);
}
/* A bounded min-heap keeps selection O(2^n log(limit)), O(limit) memory. */
static void down(Entry *heap, size_t n, size_t i) {
    for (;;) {
        size_t child = 2 * i + 1;
        if (child >= n)
            return;
        if (child + 1 < n && better(heap[child], heap[child + 1]))
            child++;
        if (!better(heap[i], heap[child]))
            return;
        Entry t = heap[i];
        heap[i] = heap[child];
        heap[child] = t;
        i = child;
    }
}
static int compare_entry(const void *a, const void *b) {
    Entry x = *(const Entry *)a, y = *(const Entry *)b;
    return better(x, y) ? -1 : better(y, x) ? 1 : 0;
}
void json_runtime(Json *j, const QodeRuntime *r, size_t limit, bool events) {
    const QodeProgram *p = r->program;
    json_add(j,
             "{\"schemaVersion\":1,\"qubitOrder\":\"little-endian\",\"seed\":\"%llu\",\"pc\":%zu,"
             "\"steps\":%zu,\"done\":%s,\"stateSize\":%zu,\"qubits\":",
             (unsigned long long)r->seed, r->pc, r->steps, r->pc >= p->count ? "true" : "false",
             r->size);
    json_names(j, p->qubits, p->nqubits);
    json_add(j, ",\"bits\":[");
    for (size_t i = 0; i < p->nbits; i++) {
        if (i)
            json_add(j, ",");
        json_add(j, "{\"name\":");
        json_string(j, p->bits[i]);
        if (r->bits[i] < 0)
            json_add(j, ",\"value\":null}");
        else
            json_add(j, ",\"value\":%d}", r->bits[i]);
    }
    json_add(j, "],\"reduced\":[");
    for (size_t q = 0; q < p->nqubits; q++) {
        size_t mask = (size_t)1 << q;
        double x = 0, y = 0, z = 0;
        for (size_t base = 0; base < r->size; base += 2 * mask)
            for (size_t k = 0; k < mask; k++) {
                QodeComplex a = r->state[base + k], b = r->state[base + k + mask];
                x += 2 * (a.re * b.re + a.im * b.im);
                y += 2 * (a.re * b.im - a.im * b.re);
                z += a.re * a.re + a.im * a.im - b.re * b.re - b.im * b.im;
            }
        if (q)
            json_add(j, ",");
        json_add(j, "{\"name\":");
        json_string(j, p->qubits[q]);
        json_add(j, ",\"x\":%.17g,\"y\":%.17g,\"z\":%.17g,\"purity\":%.17g}", x, y, z,
                 (1 + x * x + y * y + z * z) / 2);
    }
    json_add(j, "],\"amplitudes\":[");
    size_t n = limit < r->size ? limit : r->size;
    Entry *heap = malloc(n * sizeof(*heap));
    if (!heap) {
        j->failed = true;
        return;
    }
    double norm = 0;
    size_t count = 0;
    for (size_t i = 0; i < r->size; i++) {
        double prob = r->state[i].re * r->state[i].re + r->state[i].im * r->state[i].im;
        norm += prob;
        Entry e = {i, prob};
        if (count < n) {
            size_t k = count++;
            heap[k] = e;
            while (k) {
                size_t parent = (k - 1) / 2;
                if (!better(heap[parent], heap[k]))
                    break;
                Entry t = heap[k];
                heap[k] = heap[parent];
                heap[parent] = t;
                k = parent;
            }
        } else if (better(e, heap[0])) {
            heap[0] = e;
            down(heap, n, 0);
        }
    }
    qsort(heap, n, sizeof(*heap), compare_entry);
    for (size_t i = 0; i < n; i++) {
        size_t k = heap[i].index;
        char basis[QODE_MAX_QUBITS + 1];
        for (size_t q = 0; q < p->nqubits; q++)
            basis[p->nqubits - q - 1] = (k & ((size_t)1 << q)) ? '1' : '0';
        basis[p->nqubits] = 0;
        if (i)
            json_add(j, ",");
        json_add(j, "{\"basis\":\"%s\",\"re\":%.17g,\"im\":%.17g,\"probability\":%.17g}", basis,
                 r->state[k].re, r->state[k].im, heap[i].p);
    }
    free(heap);
    json_add(j, "],\"norm\":%.17g,\"stateTruncated\":%s", norm, n < r->size ? "true" : "false");
    if (events) {
        json_add(j, ",\"observations\":[");
        for (size_t i = 0; i < r->nevents; i++)
            json_add(j, "%s%s", i ? "," : "", r->events[i]);
        json_add(j, "]");
    }
    json_add(j, "}");
}
char *qode_runtime_json(const QodeRuntime *r, size_t limit) {
    if (!r || !limit || limit > 4096)
        return NULL;
    Json j = {0};
    json_runtime(&j, r, limit, true);
    return json_finish(&j);
}
