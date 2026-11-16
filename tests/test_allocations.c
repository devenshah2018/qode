#include "qode.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static long remaining = -1;
static int fail(void) {
    if (remaining < 0)
        return 0;
    if (!remaining)
        return 1;
    remaining--;
    return 0;
}
void *qode_test_malloc(size_t n) {
    return fail() ? NULL : malloc(n);
}
void *qode_test_calloc(size_t n, size_t s) {
    return fail() ? NULL : calloc(n, s);
}
void *qode_test_realloc(void *p, size_t n) {
    return fail() ? NULL : realloc(p, n);
}
int main(void) {
    const char *source =
        "qubit a;qubit b;bit m;h a;cx a,b;print \"hello world\";inspect state;measure a->m;";
    for (long budget = 0; budget < 400; budget++) {
        remaining = budget;
        QodeProgram *p = NULL;
        QodeRuntime *r = NULL, *copy = NULL;
        QodeDiagnostic d;
        char *s = NULL;
        if (qode_compile(source, strlen(source), &p, &d) == QODE_OK) {
            s = qode_program_json(p);
            free(s);
            s = NULL;
            if (qode_runtime_create(p, 42, 24, &r) == QODE_OK) {
                (void)qode_runtime_run(r, NULL, NULL);
                s = qode_runtime_json(r, 64);
                free(s);
                s = NULL;
                (void)qode_runtime_clone(r, &copy);
                qode_runtime_destroy(copy);
            }
            (void)qode_sample(p, 10, 42, 24, NULL, NULL, &s);
            free(s);
        }
        qode_runtime_destroy(r);
        qode_program_destroy(p);
    }
    remaining = -1;
    puts("400 allocation-failure schedules survived");
    return 0;
}
