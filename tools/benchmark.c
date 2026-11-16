#include "qode.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#if defined(__unix__) || defined(__APPLE__)
#include <sys/resource.h>
#endif
static double now(void) {
    struct timespec t;
    timespec_get(&t, TIME_UTC);
    return t.tv_sec + t.tv_nsec / 1e9;
}
int main(int argc, char **argv) {
    unsigned n = argc > 1 ? (unsigned)strtoul(argv[1], NULL, 10) : 12;
    size_t gates = argc > 2 ? (size_t)strtoul(argv[2], NULL, 10) : 1000;
    int trace = argc > 3 ? atoi(argv[3]) : 0;
    if (!n || n > 24 || !gates || gates > 90000)
        return 2;
    char *source = calloc(1, 256 + gates * 40);
    if (!source)
        return 1;
    size_t length = 0;
    for (unsigned q = 0; q < n; q++)
        length += (size_t)sprintf(source + length, "qubit q%u;", q);
    length += (size_t)sprintf(source + length, "bit m;");
    for (size_t g = 0; g < gates; g++)
        length += (size_t)sprintf(source + length, "ry(.731) q%u;", (unsigned)(g % n));
    length += (size_t)sprintf(source + length, "measure q0->m;");
    QodeProgram *p = NULL;
    QodeDiagnostic d;
    double start = now();
    if (qode_compile(source, length, &p, &d) != QODE_OK) {
        free(source);
        return 1;
    }
    double compile = now() - start;
    QodeRuntime *r = NULL;
    if (qode_runtime_create(p, 42, 24, &r) != QODE_OK) {
        qode_program_destroy(p);
        free(source);
        return 1;
    }
    start = now();
    QodeStatus status;
    if (trace) {
        size_t i = 0;
        while ((status = qode_runtime_step(r)) == QODE_OK) {
            if (++i % 32 == 0) {
                QodeRuntime *copy = NULL;
                if (qode_runtime_clone(r, &copy) != QODE_OK)
                    return 1;
                qode_runtime_destroy(copy);
            }
            if (i % 16 == 0) {
                char *json = qode_runtime_json(r, 64);
                if (!json)
                    return 1;
                free(json);
            }
        }
    } else
        status = qode_runtime_run(r, NULL, NULL);
    double execute = now() - start;
    if (status != QODE_OK && status != QODE_DONE)
        return 1;
    start = now();
    char *sample = NULL;
    if (qode_sample(p, 10000, 42, 24, NULL, NULL, &sample) != QODE_OK)
        return 1;
    double sampling = now() - start;
    free(sample);
    long rss = 0;
#if defined(__unix__) || defined(__APPLE__)
    struct rusage usage;
    if (getrusage(RUSAGE_SELF, &usage) == 0)
        rss = usage.ru_maxrss;
#if !defined(__APPLE__)
    rss *= 1024;
#endif
#endif
    printf("{\"qubits\":%u,\"gates\":%zu,\"trace\":%s,\"compileMs\":%.6f,\"executeMs\":%.6f,"
           "\"sample10000Ms\":%.6f,\"peakRssBytes\":%ld}\n",
           n, gates, trace ? "true" : "false", compile * 1000, execute * 1000, sampling * 1000,
           rss);
    qode_runtime_destroy(r);
    qode_program_destroy(p);
    free(source);
    return 0;
}
