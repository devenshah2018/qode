#include "internal.h"
#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#ifdef _WIN32
#include <fcntl.h>
#include <io.h>
#endif

static volatile sig_atomic_t interrupted;
static void on_interrupt(int sig) {
    (void)sig;
    interrupted = 1;
}
static int cancelled(void *context) {
    (void)context;
    return interrupted != 0;
}
static void usage(void) {
    puts("Qode " QODE_VERSION " — understand every quantum step\n"
         "Usage: qode check FILE [--json]\n"
         "       qode run FILE [--seed UINT64] [--json]\n"
         "       qode sample FILE [--shots 1..100000] [--seed UINT64] [--json]\n"
         "FILE may be - for standard input. Default seed: 42; default shots: 1024.\n"
         "Run JSON includes up to 64 largest amplitudes; inspect events are explicit.\n"
         "Options: --help, --version");
}
static bool unsigned_value(const char *s, uint64_t *out) {
    if (!*s)
        return false;
    for (const char *p = s; *p; p++)
        if (*p < '0' || *p > '9')
            return false;
    errno = 0;
    char *end;
    unsigned long long n = strtoull(s, &end, 10);
    if (errno || *end)
        return false;
    *out = (uint64_t)n;
    return true;
}
static char *read_source(FILE *f, size_t *length) {
    size_t cap = 4096, n = 0;
    char *s = malloc(cap + 1);
    if (!s)
        return NULL;
    for (;;) {
        if (n == cap) {
            if (cap == QODE_MAX_SOURCE) {
                int c = fgetc(f);
                if (c != EOF || ferror(f)) {
                    free(s);
                    return NULL;
                }
                break;
            }
            size_t newcap = cap * 2;
            if (newcap > QODE_MAX_SOURCE)
                newcap = QODE_MAX_SOURCE;
            char *p = realloc(s, newcap + 1);
            if (!p) {
                free(s);
                return NULL;
            }
            s = p;
            cap = newcap;
        }
        size_t got = fread(s + n, 1, cap - n, f);
        n += got;
        if (ferror(f)) {
            free(s);
            return NULL;
        }
        if (feof(f))
            break;
    }
    s[n] = 0;
    *length = n;
    return s;
}
static void diagnostic(const char *file, const char *source, const QodeDiagnostic *d, bool json) {
    if (json) {
        Json j = {0};
        json_add(&j,
                 "{\"schemaVersion\":1,\"status\":\"%s\",\"file\":", qode_status_name(d->status));
        json_string(&j, file);
        json_add(&j, ",\"line\":%zu,\"column\":%zu,\"offset\":%zu,\"message\":", d->line, d->column,
                 d->offset);
        json_string(&j, d->message);
        json_add(&j, "}");
        char *s = json_finish(&j);
        if (s) {
            fprintf(stderr, "%s\n", s);
            free(s);
        }
        return;
    }
    fprintf(stderr, "%s:%zu:%zu: %s: %s\n", file, d->line, d->column, qode_status_name(d->status),
            d->message);
    size_t n = strlen(source), start = d->offset < n ? d->offset : n, end = start;
    while (start && source[start - 1] != '\n')
        start--;
    while (end < n && source[end] != '\n' && end - start < 160)
        end++;
    fprintf(stderr, "  %.*s\n  ", (int)(end - start), source + start);
    for (size_t i = 1; i < d->column && i < 160; i++)
        fputc(' ', stderr);
    fputs("^\n", stderr);
}
static void human_event(const char *event) {
    const char *text = strstr(event, "\"text\":\"");
    if (!text) {
        puts(event);
        return;
    }
    text += 8;
    while (*text && *text != '"') {
        unsigned char c = (unsigned char)*text++;
        if (c == '\\') {
            c = (unsigned char)*text++;
            if (c == 'n')
                c = '\n';
            else if (c == 'r')
                c = '\r';
            else if (c == 't')
                c = '\t';
            else if (c == 'u') {
                unsigned value = 0;
                if (sscanf(text, "%4x", &value) == 1)
                    c = (unsigned char)value;
                text += 4;
            }
        }
        fputc(c, stdout);
    }
    fputc('\n', stdout);
}
int main(int argc, char **argv) {
    if (argc == 2 && !strcmp(argv[1], "--version")) {
        puts(QODE_VERSION);
        return 0;
    }
    if (argc == 1 || (argc == 2 && !strcmp(argv[1], "--help"))) {
        usage();
        return argc == 1 ? 2 : 0;
    }
    if (argc < 3) {
        usage();
        return 2;
    }
    bool check = !strcmp(argv[1], "check"), sample = !strcmp(argv[1], "sample"),
         run = !strcmp(argv[1], "run"), json = false;
    if (!check && !sample && !run) {
        fprintf(stderr, "Unknown command: %s\n", argv[1]);
        return 2;
    }
    uint64_t seed = 42, shots = 1024;
    for (int i = 3; i < argc; i++) {
        if (!strcmp(argv[i], "--json"))
            json = true;
        else if ((!strcmp(argv[i], "--seed") || (sample && !strcmp(argv[i], "--shots"))) &&
                 i + 1 < argc) {
            bool shot = !strcmp(argv[i], "--shots");
            uint64_t value = 0;
            if (!unsigned_value(argv[++i], &value) || (shot && (!value || value > 100000))) {
                fprintf(stderr, "Invalid numeric option\n");
                return 2;
            }
            if (shot)
                shots = value;
            else
                seed = value;
        } else {
            fprintf(stderr, "Unknown or incomplete option: %s\n", argv[i]);
            return 2;
        }
    }
    bool read_stdin = !strcmp(argv[2], "-");
    FILE *file = read_stdin ? stdin : fopen(argv[2], "rb");
    if (!file) {
        fprintf(stderr, "Cannot open %s: %s\n", argv[2], strerror(errno));
        return 3;
    }
#ifdef _WIN32
    if (read_stdin && _setmode(_fileno(stdin), _O_BINARY) == -1) {
        fprintf(stderr, "Cannot read standard input in binary mode\n");
        return 3;
    }
#endif
    size_t length = 0;
    char *source = read_source(file, &length);
    if (!read_stdin)
        fclose(file);
    if (!source) {
        fprintf(stderr,
                "Unable to read source (I/O, allocation failure, or source exceeds 1 MiB)\n");
        return 3;
    }
    QodeProgram *p = NULL;
    QodeDiagnostic d = {0};
    QodeStatus s = qode_compile(source, length, &p, &d);
    if (s != QODE_OK) {
        if (!d.status) {
            d.status = s;
            snprintf(d.message, sizeof(d.message), "Compilation failed: %s", qode_status_name(s));
        }
        diagnostic(argv[2], source, &d, json);
        free(source);
        return 2;
    }
    free(source);
    if (check) {
        if (json)
            printf("{\"schemaVersion\":1,\"valid\":true,\"qubits\":%zu,\"instructions\":%zu}\n",
                   p->nqubits, p->count);
        else
            printf("Valid: %zu qubits, %zu instructions\n", p->nqubits, p->count);
        qode_program_destroy(p);
        return 0;
    }
    (void)signal(SIGINT, on_interrupt);
    char *output = NULL;
    QodeRuntime *r = NULL;
    if (sample)
        s = qode_sample(p, (size_t)shots, seed, QODE_MAX_QUBITS, cancelled, NULL, &output);
    else {
        s = qode_runtime_create(p, seed, QODE_MAX_QUBITS, &r);
        if (s == QODE_OK)
            s = qode_runtime_run(r, cancelled, NULL);
        if (s == QODE_OK) {
            if (json)
                output = qode_runtime_json(r, 64);
            else {
                for (size_t i = 0; i < r->nevents; i++) {
                    human_event(r->events[i]);
                }
                for (size_t i = 0; i < p->nbits; i++)
                    if (r->bits[i] >= 0)
                        printf("%s = %d\n", p->bits[i], r->bits[i]);
            }
        }
    }
    if (s == QODE_OK && (json || sample) && !output)
        s = QODE_MEMORY;
    if (s == QODE_OK && output)
        puts(output);
    if (s != QODE_OK)
        fprintf(stderr, "Execution failed: %s%s\n", qode_status_name(s),
                sample && s == QODE_SEMANTIC ? " (sample requires a measurement before halt)" : "");
    free(output);
    qode_runtime_destroy(r);
    qode_program_destroy(p);
    return s == QODE_OK ? 0 : s == QODE_CANCELLED ? 130 : 4;
}
