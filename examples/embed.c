#include "qode.h"
#include <stdio.h>
#include <string.h>
int main(void) {
    const char *source = "qubit alice;qubit bob;h alice;cx alice,bob;";
    QodeProgram *program = NULL;
    QodeRuntime *runtime = NULL;
    QodeDiagnostic diagnostic;
    QodeStatus status = qode_compile(source, strlen(source), &program, &diagnostic);
    if (status != QODE_OK) {
        fprintf(stderr, "%zu:%zu: %s\n", diagnostic.line, diagnostic.column, diagnostic.message);
        return 1;
    }
    status = qode_runtime_create(program, 42, 12, &runtime);
    if (status == QODE_OK)
        status = qode_runtime_run(runtime, NULL, NULL);
    if (status == QODE_OK) {
        char *json = qode_runtime_json(runtime, 64);
        if (json) {
            puts(json);
            qode_string_free(json);
        } else {
            status = QODE_MEMORY;
        }
    }
    qode_runtime_destroy(runtime);
    qode_program_destroy(program);
    return status == QODE_OK ? 0 : 1;
}
