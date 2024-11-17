#include <stdio.h>
#include <stdlib.h>
#include "lexer.h"
#include "parser.h"
#include "token.h"

void run_language(const char *file_path) {
    FILE *file = fopen(file_path, "r");
    if (!file) {
        printf("Error: Cannot open file %s\n", file_path);
        return;
    }

    char *line = NULL;
    size_t len = 0;

    // Replace getline with fgets for Windows compatibility
    while (fgets(line, 1024, file)) {  // 1024 is the max line length
        tokenize(line); // Convert code to tokens
        // Call parse and execution logic here
    }

    free(line);
    fclose(file);
}
