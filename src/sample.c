#include "internal.h"
#include <stdlib.h>
#include <string.h>

typedef struct {
    char *key;
    size_t count;
} Count;
static uint64_t hash(const char *s) {
    uint64_t h = UINT64_C(14695981039346656037);
    while (*s) {
        h ^= (unsigned char)*s++;
        h *= UINT64_C(1099511628211);
    }
    return h;
}
static int compare_count(const void *a, const void *b) {
    return strcmp(((const Count *)a)->key, ((const Count *)b)->key);
}
QodeStatus qode_sample(const QodeProgram *p, size_t shots, uint64_t seed, unsigned max_qubits,
                       QodeCancel cancel, void *context, char **json) {
    if (!json)
        return QODE_INVALID;
    *json = NULL;
    if (!p)
        return QODE_INVALID;
    if (!shots || shots > 100000)
        return QODE_LIMIT;
    size_t first = p->count;
    bool terminal = true;
    for (size_t i = 0; i < p->count; i++) {
        Op op = p->code[i].op;
        if (op == OP_HALT)
            break;
        if (op == OP_RESET)
            terminal = false;
        if (op == OP_MEASURE && first == p->count)
            first = i;
        if (first != p->count && op != OP_MEASURE && op != OP_PRINT && op != OP_INSPECT)
            terminal = false;
    }
    if (first == p->count)
        return QODE_SEMANTIC;
    QodeRuntime *r = NULL;
    QodeStatus status = qode_runtime_create(p, seed, max_qubits, &r);
    if (status != QODE_OK)
        return status;
    r->quiet = true;
    size_t capacity = 16;
    while (capacity < shots * 2)
        capacity *= 2;
    Count *counts = calloc(capacity, sizeof(*counts));
    double *cdf = NULL;
    size_t used = 0;
    if (!counts) {
        status = QODE_MEMORY;
        goto done;
    }
    if (terminal) {
        while (r->pc < first) {
            if (cancel && cancel(context)) {
                status = QODE_CANCELLED;
                goto done;
            }
            status = qode_runtime_step(r);
            if (status != QODE_OK)
                goto done;
        }
        cdf = malloc(r->size * sizeof(*cdf));
        if (!cdf) {
            status = QODE_MEMORY;
            goto done;
        }
        double total = 0;
        for (size_t i = 0; i < r->size; i++) {
            total += r->state[i].re * r->state[i].re + r->state[i].im * r->state[i].im;
            cdf[i] = total;
        }
        for (size_t i = 0; i < r->size; i++)
            cdf[i] /= total;
        cdf[r->size - 1] = 1;
    }
    for (size_t shot = 0; shot < shots; shot++) {
        if (cancel && cancel(context)) {
            status = QODE_CANCELLED;
            goto done;
        }
        if (terminal) {
            double u = rng_uniform(r);
            size_t lo = 0, hi = r->size - 1;
            while (lo < hi) {
                size_t mid = lo + (hi - lo) / 2;
                if (u < cdf[mid])
                    hi = mid;
                else
                    lo = mid + 1;
            }
            for (size_t i = 0; i < p->nbits; i++)
                r->bits[i] = -1;
            for (size_t i = first; i < p->count; i++) {
                Instruction in = p->code[i];
                if (in.op == OP_HALT)
                    break;
                if (in.op == OP_MEASURE)
                    r->bits[in.q[1]] = (lo >> in.q[0]) & 1u;
            }
        } else {
            /* Preserve a single PRNG stream across independent zero states. */
            uint64_t stream = r->rng;
            qode_runtime_reset(r, seed);
            r->rng = stream;
            r->quiet = true;
            status = qode_runtime_run(r, cancel, context);
            if (status != QODE_OK)
                goto done;
        }
        char key[QODE_MAX_BITS + 1];
        for (size_t i = 0; i < p->nbits; i++)
            key[p->nbits - i - 1] = r->bits[i] < 0 ? '-' : (char)('0' + r->bits[i]);
        key[p->nbits] = 0;
        size_t slot = (size_t)hash(key) & (capacity - 1);
        while (counts[slot].key && strcmp(counts[slot].key, key))
            slot = (slot + 1) & (capacity - 1);
        if (!counts[slot].key) {
            counts[slot].key = malloc(p->nbits + 1);
            if (!counts[slot].key) {
                status = QODE_MEMORY;
                goto done;
            }
            memcpy(counts[slot].key, key, p->nbits + 1);
            used++;
        }
        counts[slot].count++;
    }
    {
        Count *ordered = malloc(used * sizeof(*ordered));
        if (!ordered) {
            status = QODE_MEMORY;
            goto done;
        }
        size_t k = 0;
        for (size_t i = 0; i < capacity; i++)
            if (counts[i].key)
                ordered[k++] = counts[i];
        qsort(ordered, used, sizeof(*ordered), compare_count);
        Json j = {0};
        json_add(&j,
                 "{\"schemaVersion\":1,\"qubitOrder\":\"little-endian\",\"seed\":\"%llu\","
                 "\"shots\":%zu,\"optimized\":%s,\"qubits\":",
                 (unsigned long long)seed, shots, terminal ? "true" : "false");
        json_names(&j, p->qubits, p->nqubits);
        json_add(&j, ",\"bits\":");
        json_names(&j, p->bits, p->nbits);
        json_add(&j, ",\"counts\":{");
        for (size_t i = 0; i < used; i++) {
            if (i)
                json_add(&j, ",");
            json_string(&j, ordered[i].key);
            json_add(&j, ":%zu", ordered[i].count);
        }
        json_add(&j, "}}");
        free(ordered);
        *json = json_finish(&j);
        if (!*json)
            status = QODE_MEMORY;
    }
done:
    if (counts) {
        for (size_t i = 0; i < capacity; i++)
            free(counts[i].key);
        free(counts);
    }
    free(cdf);
    qode_runtime_destroy(r);
    return status;
}
