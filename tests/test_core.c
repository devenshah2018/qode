#include "qode.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define CHECK(x)                                                                                   \
    do {                                                                                           \
        if (!(x)) {                                                                                \
            fprintf(stderr, "FAIL %s:%d: %s\n", __FILE__, __LINE__, #x);                           \
            exit(1);                                                                               \
        }                                                                                          \
    } while (0)
static QodeProgram *compile(const char *s) {
    QodeProgram *p = NULL;
    QodeDiagnostic d;
    QodeStatus r = qode_compile(s, strlen(s), &p, &d);
    if (r != QODE_OK)
        fprintf(stderr, "%zu:%zu %s\n", d.line, d.column, d.message);
    CHECK(r == QODE_OK);
    return p;
}
static void state(const char *source, size_t index, double re, double im) {
    QodeProgram *p = compile(source);
    QodeRuntime *r = NULL;
    CHECK(qode_runtime_create(p, 42, 24, &r) == QODE_OK);
    CHECK(qode_runtime_run(r, NULL, NULL) == QODE_OK);
    size_t n;
    const QodeComplex *a = qode_runtime_state(r, &n);
    CHECK(index < n);
    CHECK(fabs(a[index].re - re) < 1e-10);
    CHECK(fabs(a[index].im - im) < 1e-10);
    double norm = 0;
    for (size_t i = 0; i < n; i++)
        norm += a[i].re * a[i].re + a[i].im * a[i].im;
    CHECK(fabs(norm - 1) < 1e-10);
    qode_runtime_destroy(r);
    qode_program_destroy(p);
}
static int cancel_after_five(void *context) {
    unsigned *calls = context;
    return (*calls)++ == 5;
}
int main(void) {
    state("qubit q; h q;", 0, 1 / sqrt(2.), 0);
    state("qubit q; h q; h q;", 0, 1, 0);
    state("qubit a; qubit b; x a; x b;", 3, 1, 0);
    state("[multiple word comment]\nqubit q; // hello\nx q;", 1, 1, 0);
    state("qubit q; y q;", 1, 0, 1);
    state("qubit q; rx(pi) q;", 1, 0, -1);
    state("qubit a; qubit b; h a; cx a,b;", 3, 1 / sqrt(2.), 0);
    state("qubit a; qubit b; qubit c; x a; x b; ccx a,b,c;", 7, 1, 0);
    state("qubit a; qubit b; qubit c; x a; x b; cswap a,b,c;", 5, 1, 0);
    const char *bad[] = {"qubit q; bogus q;",      "qubit q; h missing;", "qubit q; cx q,q;",
                         "bit a; if a == 1 { }",   "print \"broken;",     "qubit q; rx(pi/0) q;",
                         "qubit q; h q; qubit x;", "qubit a; bit a;",     "qubit q; h q",
                         "[unterminated"};
    for (size_t i = 0; i < sizeof(bad) / sizeof(*bad); i++) {
        QodeProgram *p = NULL;
        QodeDiagnostic d;
        CHECK(qode_compile(bad[i], strlen(bad[i]), &p, &d) != QODE_OK);
        CHECK(!p);
        CHECK(d.message[0]);
    }
    QodeProgram *p = compile("qubit a; qubit b; bit m; h a; cx a,b; measure a -> m;");
    QodeRuntime *r = NULL, *copy = NULL;
    CHECK(qode_runtime_create(p, 42, 1, &r) == QODE_LIMIT);
    CHECK(!r);
    CHECK(qode_runtime_create(p, 42, 24, &r) == QODE_OK);
    CHECK(qode_runtime_step(r) == QODE_OK);
    CHECK(qode_runtime_clone(r, &copy) == QODE_OK);
    CHECK(qode_runtime_run(r, NULL, NULL) == QODE_OK);
    CHECK(qode_runtime_run(copy, NULL, NULL) == QODE_OK);
    CHECK(qode_runtime_bit(r, 0) == qode_runtime_bit(copy, 0));
    CHECK(qode_runtime_reset(r, 42) == QODE_OK);
    CHECK(qode_runtime_bit(r, 0) == -1);
    CHECK(qode_runtime_pc(r) == 0);
    char *json = NULL;
    CHECK(qode_sample(p, 4096, 42, 24, NULL, NULL, &json) == QODE_OK);
    CHECK(strstr(json, "\"optimized\":true"));
    free(json);
    qode_runtime_destroy(copy);
    qode_runtime_destroy(r);
    qode_program_destroy(p);
    p = compile("qubit a; bit m; h a; measure a -> m; if m == 1 { x a; } inspect probabilities;");
    CHECK(qode_sample(p, 100, 42, 24, NULL, NULL, &json) == QODE_OK);
    CHECK(strstr(json, "\"optimized\":false"));
    free(json);
    qode_program_destroy(p);
    p = compile("qubit q; h q; h q; h q; h q; h q; h q; h q;");
    CHECK(qode_runtime_create(p, 42, 24, &r) == QODE_OK);
    unsigned calls = 0;
    CHECK(qode_runtime_run(r, cancel_after_five, &calls) == QODE_CANCELLED);
    CHECK(qode_runtime_steps(r) == 5);
    qode_runtime_destroy(r);
    qode_program_destroy(p);
    CHECK(strcmp(qode_status_name((QodeStatus)-1), "unknown") == 0);
    CHECK(qode_sample(NULL, 1, 42, 24, NULL, NULL, &json) == QODE_INVALID);
    puts("Core regressions passed");
    return 0;
}
