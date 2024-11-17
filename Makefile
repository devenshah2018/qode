CC = gcc
CFLAGS = -Iinclude -Wall
SRC = $(wildcard src/*.c)
OBJ = $(SRC:src/%.c=build/%.o)
TARGET = build/quantum_lang

all: $(TARGET)

build/%.o: src/%.c
	$(CC) $(CFLAGS) -c $< -o $@

$(TARGET): $(OBJ)
	$(CC) $(OBJ) -o $@

clean:
	rm -rf build/*.o $(TARGET)
