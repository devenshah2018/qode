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
    while (fgets(line, 1024, file)) {  
        tokenize(line); 
        
    }
    free(line);
    fclose(file);
}
