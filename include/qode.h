#ifndef QODE_H
#define QODE_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define QODE_VERSION "1.0.0"
#define QODE_MAX_QUBITS 24u
#define QODE_MAX_SOURCE (1024u * 1024u)
#define QODE_MAX_INSTRUCTIONS 100000u
#define QODE_MAX_BITS 256u

typedef enum {
    QODE_OK = 0,
    QODE_DONE,
    QODE_SYNTAX,
    QODE_SEMANTIC,
    QODE_LIMIT,
    QODE_MEMORY,
    QODE_INVALID,
    QODE_CANCELLED
} QodeStatus;

typedef struct {
    QodeStatus status;
    size_t line, column, offset, length;
    char message[256];
} QodeDiagnostic;

typedef struct {
    double re, im;
} QodeComplex;
typedef struct QodeProgram QodeProgram;
typedef struct QodeRuntime QodeRuntime;
typedef int (*QodeCancel)(void *context);

/* Compilation copies source. On failure *out is NULL; diagnostics are optional.
 * Program must outlive its runtimes. All handles have explicit ownership;
 * separate handles are reentrant and contain no shared mutable state. */
QodeStatus qode_compile(const char *source, size_t length, QodeProgram **out,
                        QodeDiagnostic *diagnostic);
void qode_program_destroy(QodeProgram *program);
size_t qode_program_qubits(const QodeProgram *program);
size_t qode_program_instructions(const QodeProgram *program);
char *qode_program_json(const QodeProgram *program);

/* max_qubits must be 1..24. A fresh runtime starts in |0...0>, bits unset.
 * Inspection is observational. Only measure/reset consume random numbers. */
QodeStatus qode_runtime_create(const QodeProgram *program, uint64_t seed, unsigned max_qubits,
                               QodeRuntime **out);
void qode_runtime_destroy(QodeRuntime *runtime);
QodeStatus qode_runtime_reset(QodeRuntime *runtime, uint64_t seed);
QodeStatus qode_runtime_step(QodeRuntime *runtime);
QodeStatus qode_runtime_run(QodeRuntime *runtime, QodeCancel cancel, void *context);
QodeStatus qode_runtime_clone(const QodeRuntime *runtime, QodeRuntime **out);
size_t qode_runtime_pc(const QodeRuntime *runtime);
size_t qode_runtime_steps(const QodeRuntime *runtime);
const QodeComplex *qode_runtime_state(const QodeRuntime *runtime, size_t *length);
/* Returns -1 for an unset bit or an invalid index. */
int qode_runtime_bit(const QodeRuntime *runtime, size_t index);
/* max_entries is 1..4096. Entries are the largest probabilities, sorted by
 * probability then basis index. Truncation is explicit in the result. */
char *qode_runtime_json(const QodeRuntime *runtime, size_t max_entries);

/* Counts are classical-bit strings (highest declaration index first), '-'
 * denotes an unmeasured bit. Sampling suppresses print/inspect events.
 * Terminal measurement circuits use one evolution plus joint sampling. */
QodeStatus qode_sample(const QodeProgram *program, size_t shots, uint64_t seed, unsigned max_qubits,
                       QodeCancel cancel, void *context, char **json);
void qode_string_free(char *string);
const char *qode_status_name(QodeStatus status);

#ifdef __cplusplus
}
#endif
#endif
