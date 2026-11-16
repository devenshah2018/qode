#include "qode.h"
#include <stddef.h>
#include <stdint.h>
int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    QodeProgram *p = NULL;
    QodeDiagnostic d;
    (void)qode_compile((const char *)data, size, &p, &d);
    qode_program_destroy(p);
    return 0;
}
