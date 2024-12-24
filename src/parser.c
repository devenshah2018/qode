#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "parser.h"
#include "token.h"
#include "lexer.h"
#include "quantum.h"

ASTNode *new_ast_node(NodeType type, const char *value, double id) {
    ASTNode *node = (ASTNode *)malloc(sizeof(ASTNode));
    if (node == NULL) {
        fprintf(stderr, "Memory allocation failed\n");
        exit(1);
    }
    node->id = id;
    node->type = type;
    node->value = strdup(value);
    node->next = NULL;
    if (type == NODE_QUBIT) {
        node->state[0] = 1.0;
        node->state[1] = 0.0;
        node->state[2] = 0.0;
        node->state[3] = 0.0;
    }
    return node;
}

void free_ast(ASTNode *root) {
    if (root == NULL) return;
    free(root->value);
    free_ast(root->next);
    free(root);
}

ASTNode *parse(Token *tokens, int token_count) {
    int index = 0;
    ASTNode *head = NULL, *tail = NULL;
    while (index < token_count) {
        Token token = tokens[index];
        ASTNode *node = NULL;
        ASTNode *qubit_node = NULL;
        ASTNode *text_node = NULL;
        if (token.type == TOKEN_H_GATE) {  
            ASTNode *hadamard_node = new_ast_node(NODE_H_GATE, token.value, index);
            if (++index < token_count && (tokens[index].type == TOKEN_QUBIT)) {  
                qubit_node = NULL;
                ASTNode *current = head;
                while (current != NULL) {
                    if (current->type == NODE_QUBIT && strcmp(current->value, tokens[index].value) == 0) {
                        qubit_node = current;
                        break;
                    }
                    current = current->next;
                }
                if (qubit_node == NULL) {
                    qubit_node = new_ast_node(NODE_QUBIT, tokens[index].value, index);
                }
                apply_h_gate(qubit_node);
                hadamard_node->next = qubit_node;  
            } else {
                fprintf(stderr, "Error: Gate without qubit %s\n", token.value);
                free_ast(hadamard_node);
                return NULL;  
            }
            if (head == NULL) {  
                head = hadamard_node;  
                tail = qubit_node ? qubit_node : hadamard_node;  
            } else {
                tail->next = NULL;  
                tail = qubit_node ? qubit_node : hadamard_node;  
            }
            index++;
        } else if (token.type == TOKEN_X_GATE) {
            ASTNode *x_node = new_ast_node(NODE_X_GATE, token.value, index);
            if (++index < token_count && (tokens[index].type == TOKEN_QUBIT)) {  
                qubit_node = NULL;
                ASTNode *current = head;
                while (current != NULL) {
                    if (current->type == NODE_QUBIT && strcmp(current->value, tokens[index].value) == 0) {
                        qubit_node = current;
                        break;
                    }
                    current = current->next;
                }
                if (qubit_node == NULL) {
                    qubit_node = new_ast_node(NODE_QUBIT, tokens[index].value, index);
                }
                apply_x_gate(qubit_node);
                x_node->next = qubit_node;  
            } else {
                fprintf(stderr, "Error: Gate without qubit %s\n", token.value);
                free_ast(x_node);
                return NULL;  
            }
            if (head == NULL) {  
                head = x_node;  
                tail = qubit_node ? qubit_node : x_node;  
            } else {
                tail->next = NULL;  
                tail = qubit_node ? qubit_node : x_node;  
            }
            index++;
        } else if (token.type == TOKEN_I_GATE) {
            ASTNode *identity_node = new_ast_node(NODE_I_GATE, token.value, index);
            if (++index < token_count && (tokens[index].type == TOKEN_QUBIT)) {  
                qubit_node = NULL;
                ASTNode *current = head;
                while (current != NULL) {
                    if (current->type == NODE_QUBIT && strcmp(current->value, tokens[index].value) == 0) {
                        qubit_node = current;
                        break;
                    }
                    current = current->next;
                }
                if (qubit_node == NULL) {
                    qubit_node = new_ast_node(NODE_QUBIT, tokens[index].value, index);
                }
                apply_i_gate(qubit_node);
                identity_node->next = qubit_node;  
            } else {
                fprintf(stderr, "Error: Gate without qubit %s\n", token.value);
                free_ast(identity_node);
                return NULL;  
            }
            if (head == NULL) {  
                head = identity_node;  
                tail = qubit_node ? qubit_node : identity_node;  
            } else {
                tail->next = NULL;  
                tail = qubit_node ? qubit_node : identity_node;  
            }
            index++;
        } else if (token.type == TOKEN_Y_GATE) {
            ASTNode *y_node = new_ast_node(NODE_Y_GATE, token.value, index);
            if (++index < token_count && (tokens[index].type == TOKEN_QUBIT)) {  
                qubit_node = NULL;
                ASTNode *current = head;
                while (current != NULL) {
                    if (current->type == NODE_QUBIT && strcmp(current->value, tokens[index].value) == 0) {
                        qubit_node = current;
                        break;
                    }
                    current = current->next;
                }
                if (qubit_node == NULL) {
                    qubit_node = new_ast_node(NODE_QUBIT, tokens[index].value, index);
                }
                apply_y_gate(qubit_node);
                y_node->next = qubit_node;  
            } else {
                fprintf(stderr, "Error: Gate without qubit %s\n", token.value);
                free_ast(y_node);
                return NULL;  
            }
            if (head == NULL) {  
                head = y_node;  
                tail = qubit_node ? qubit_node : y_node;  
            } else {
                tail->next = NULL;  
                tail = qubit_node ? qubit_node : y_node;  
            }
            index++;
        } else if (token.type == TOKEN_Z_GATE) {
            ASTNode *z_node = new_ast_node(NODE_Z_GATE, token.value, index);
            if (++index < token_count && (tokens[index].type == TOKEN_QUBIT)) {  
                qubit_node = NULL;
                ASTNode *current = head;
                while (current != NULL) {
                    if (current->type == NODE_QUBIT && strcmp(current->value, tokens[index].value) == 0) {
                        qubit_node = current;
                        break;
                    }
                    current = current->next;
                }
                if (qubit_node == NULL) {
                    qubit_node = new_ast_node(NODE_QUBIT, tokens[index].value, index);
                }
                apply_z_gate(qubit_node);
                z_node->next = qubit_node;  
            } else {
                fprintf(stderr, "Error: Gate without qubit %s\n", token.value);
                free_ast(z_node);
                return NULL;  
            }
            if (head == NULL) {  
                head = z_node;  
                tail = qubit_node ? qubit_node : z_node;  
            } else {
                tail->next = NULL;  
                tail = qubit_node ? qubit_node : z_node;  
            }
            index++;
        } else if (token.type == TOKEN_Z_GATE) {
            ASTNode *z_node = new_ast_node(NODE_Z_GATE, token.value, index);
            if (++index < token_count && (tokens[index].type == TOKEN_QUBIT)) {  
                qubit_node = NULL;
                ASTNode *current = head;
                while (current != NULL) {
                    if (current->type == NODE_QUBIT && strcmp(current->value, tokens[index].value) == 0) {
                        qubit_node = current;
                        break;
                    }
                    current = current->next;
                }
                if (qubit_node == NULL) {
                    qubit_node = new_ast_node(NODE_QUBIT, tokens[index].value, index);
                }
                apply_z_gate(qubit_node);
                z_node->next = qubit_node;  
            } else {
                fprintf(stderr, "Error: Gate without qubit %s\n", token.value);
                free_ast(z_node);
                return NULL;  
            }
            if (head == NULL) {  
                head = z_node;  
                tail = qubit_node ? qubit_node : z_node;  
            } else {
                tail->next = NULL;  
                tail = qubit_node ? qubit_node : z_node;  
            }
            index++;
        } else if (token.type == TOKEN_Z_GATE) {
            ASTNode *z_node = new_ast_node(NODE_Z_GATE, token.value, index);
            if (++index < token_count && (tokens[index].type == TOKEN_QUBIT)) {  
                qubit_node = NULL;
                ASTNode *current = head;
                while (current != NULL) {
                    if (current->type == NODE_QUBIT && strcmp(current->value, tokens[index].value) == 0) {
                        qubit_node = current;
                        break;
                    }
                    current = current->next;
                }
                if (qubit_node == NULL) {
                    qubit_node = new_ast_node(NODE_QUBIT, tokens[index].value, index);
                }
                apply_z_gate(qubit_node);
                z_node->next = qubit_node;  
            } else {
                fprintf(stderr, "Error: Gate without qubit %s\n", token.value);
                free_ast(z_node);
                return NULL;  
            }
            if (head == NULL) {  
                head = z_node;  
                tail = qubit_node ? qubit_node : z_node;  
            } else {
                tail->next = NULL;  
                tail = qubit_node ? qubit_node : z_node;  
            }
            index++;
        } else if (token.type == TOKEN_PHASE_S_GATE) {
            ASTNode *z_node = new_ast_node(NODE_PHASE_S_GATE, token.value, index);
            if (++index < token_count && (tokens[index].type == TOKEN_QUBIT)) {  
                qubit_node = NULL;
                ASTNode *current = head;
                while (current != NULL) {
                    if (current->type == NODE_QUBIT && strcmp(current->value, tokens[index].value) == 0) {
                        qubit_node = current;
                        break;
                    }
                    current = current->next;
                }
                if (qubit_node == NULL) {
                    qubit_node = new_ast_node(NODE_QUBIT, tokens[index].value, index);
                }
                apply_phase_s_gate(qubit_node);
                z_node->next = qubit_node;  
            } else {
                fprintf(stderr, "Error: Gate without qubit %s\n", token.value);
                free_ast(z_node);
                return NULL;  
            }
            if (head == NULL) {  
                head = z_node;  
                tail = qubit_node ? qubit_node : z_node;  
            } else {
                tail->next = NULL;  
                tail = qubit_node ? qubit_node : z_node;  
            }
            index++;
        } else if (token.type == TOKEN_COMMENT) {
            ASTNode *comment_node = new_ast_node(NODE_COMMENT, token.value, index);
            if (head == NULL) {  
                head = comment_node;  
                tail = comment_node;  
            } else {
                tail->next = NULL;  
                tail = comment_node;  
            }
            index++;
        } else if (token.type == TOKEN_PRINT_FUNCTION){ 
            ASTNode *print_node = new_ast_node(NODE_PRINT_FUNCTION, token.value, index);
            if (++index < token_count && (tokens[index].type == TOKEN_TEXT)) {  
                text_node = new_ast_node(NODE_TEXT, tokens[index].value, index);
                printf("%s\n", text_node->value + 1);
                print_node->next = text_node;  
            } else {
                fprintf(stderr, "Error: Built-in function without argument %s\n", token.value);
                free_ast(print_node);
                return NULL;  
            }
            if (head == NULL) {  
                head = print_node;  
                tail = text_node ? text_node : print_node;  
            } else {
                tail->next = NULL;  
                tail = text_node ? text_node : print_node;  
            }
            index++;
        } else if (token.type == TOKEN_TERMINATE){ 
            ASTNode *print_node = new_ast_node(NODE_TERMINATE, token.value, index);
            if (head == NULL) {  
                head = print_node;  
                tail = text_node ? text_node : print_node;  
            } else {
                tail->next = NULL;  
                tail = text_node ? text_node : print_node;  
            }
            printf("Terminated.");
            free_ast(head);
            exit(0);
        } else {
            return head;  
        }
    }
    return head;  
}
