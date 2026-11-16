#include "qode.h"
#include <stdint.h>
#include <stdio.h>
#include <string.h>
static uint32_t next(uint32_t *state) {
    *state = *state * UINT32_C(1664525) + UINT32_C(1013904223);
    return *state;
}
int main(void) {
    const char *seeds[] = {
        "qubit a; qubit b; bit m; h a; cx a,b; measure a->m; if m==1{x b;}",
        "qubit a; ry((pi/3)+.1) a; print \"hello world\"; inspect state;",
        "[comment with spaces]\nqubit a;bit m;reset a;measure a->m;halt;",
    };
    unsigned char input[4096];
    uint32_t rng = 20261113;
    size_t valid = 0;
    for (size_t trial = 0; trial < 40000; trial++) {
        size_t length;
        if (trial % 3) {
            const char *seed = seeds[next(&rng) % 3];
            length = strlen(seed);
            memcpy(input, seed, length);
            size_t changes = next(&rng) % 8;
            for (size_t i = 0; i < changes; i++)
                input[next(&rng) % length] = (unsigned char)next(&rng);
            if (trial % 7 == 0)
                length = next(&rng) % (length + 1);
        } else {
            length = next(&rng) % sizeof(input);
            for (size_t i = 0; i < length; i++)
                input[i] = (unsigned char)(next(&rng) >> 24);
        }
        QodeProgram *p = NULL;
        QodeDiagnostic d;
        if (qode_compile((const char *)input, length, &p, &d) == QODE_OK)
            valid++;
        qode_program_destroy(p);
    }
    printf("40,000 deterministic parser mutations survived (%zu valid programs)\n", valid);
    return 0;
}
