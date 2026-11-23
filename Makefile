# Resolve CMake through the shell: GNU Make 4.3 can mistake Emscripten's
# cmake/ directory on PATH for the executable. Explicit CMAKE overrides still work.
CMAKE ?= $(shell command -v cmake)

.PHONY: all test clean wasm web
all:
	"$(CMAKE)" -S . -B build/native -DCMAKE_BUILD_TYPE=Release
	"$(CMAKE)" --build build/native --parallel
test: all
	ctest --test-dir build/native --output-on-failure
wasm:
	emcmake "$(CMAKE)" -S . -B build/wasm -DCMAKE_BUILD_TYPE=Release
	"$(CMAKE)" --build build/wasm --parallel
	mkdir -p web/public/wasm
	cp build/wasm/qode.js build/wasm/qode.wasm web/public/wasm/
web: wasm
	npm --prefix web run build
clean:
	"$(CMAKE)" -E rm -rf build/native build/wasm web/dist web/public/wasm
