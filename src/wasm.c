#include "internal.h"
#include <stdlib.h>
#include <string.h>

typedef struct {
    QodeProgram *program;
    QodeRuntime *runtime;
} WebSession;
/* Returned strings are owned by JS, which must call free after copying. */
char *qode_web_compile(const char *source, const char *seed, WebSession **out) {
    if (!out)
        return NULL;
    *out = NULL;
    WebSession *s = calloc(1, sizeof(*s));
    if (!s)
        return NULL;
    QodeDiagnostic d = {0};
    QodeStatus status = qode_compile(source, strlen(source), &s->program, &d);
    if (status == QODE_OK)
        status = qode_runtime_create(s->program, strtoull(seed, NULL, 10), 16, &s->runtime);
    Json j = {0};
    if (status != QODE_OK) {
        json_add(&j, "{\"error\":\"%s\",\"message\":", qode_status_name(status));
        json_string(&j, d.message[0] ? d.message : "Browser supports at most 16 qubits");
        json_add(&j, ",\"line\":%zu,\"column\":%zu,\"offset\":%zu}", d.line, d.column, d.offset);
        qode_program_destroy(s->program);
        free(s);
    } else {
        *out = s;
        json_add(&j, "{\"ok\":true}");
    }
    char *result = json_finish(&j);
    if (!result && *out) {
        qode_runtime_destroy((*out)->runtime);
        qode_program_destroy((*out)->program);
        free(*out);
        *out = NULL;
    }
    return result;
}
int qode_web_step(WebSession *s) {
    return s ? (int)qode_runtime_step(s->runtime) : QODE_INVALID;
}
int qode_web_reset(WebSession *s, const char *seed) {
    return s ? (int)qode_runtime_reset(s->runtime, strtoull(seed, NULL, 10)) : QODE_INVALID;
}
char *qode_web_state(WebSession *s) {
    return s ? qode_runtime_json(s->runtime, 64) : NULL;
}
char *qode_web_program(WebSession *s) {
    return s ? qode_program_json(s->program) : NULL;
}
char *qode_web_sample(WebSession *s, int shots, const char *seed) {
    char *result = NULL;
    QodeStatus status = s ? qode_sample(s->program, (size_t)shots, strtoull(seed, NULL, 10), 16,
                                        NULL, NULL, &result)
                          : QODE_INVALID;
    if (status != QODE_OK) {
        Json j = {0};
        json_add(
            &j,
            "{\"error\":\"%s\",\"message\":\"Sampling failed; add measurements and check limits\"}",
            qode_status_name(status));
        result = json_finish(&j);
    }
    return result;
}
QodeRuntime *qode_web_clone(WebSession *s) {
    QodeRuntime *r = NULL;
    if (s)
        (void)qode_runtime_clone(s->runtime, &r);
    return r;
}
int qode_web_restore(WebSession *s, QodeRuntime *checkpoint) {
    if (!s || !checkpoint || checkpoint->program != s->program)
        return QODE_INVALID;
    QodeRuntime *r = NULL;
    QodeStatus status = qode_runtime_clone(checkpoint, &r);
    if (status == QODE_OK) {
        qode_runtime_destroy(s->runtime);
        s->runtime = r;
    }
    return status;
}
void qode_web_drop(QodeRuntime *r) {
    qode_runtime_destroy(r);
}
void qode_web_destroy(WebSession *s) {
    if (s) {
        qode_runtime_destroy(s->runtime);
        qode_program_destroy(s->program);
        free(s);
    }
}
size_t qode_web_bytes(WebSession *s) {
    return s ? s->runtime->size * sizeof(QodeComplex) + s->runtime->event_bytes +
                   s->runtime->nevents * sizeof(char *) + sizeof(QodeRuntime)
             : 0;
}
