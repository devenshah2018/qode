.PHONY: all test clean wasm web
all:
	cmake -S . -B build/native -DCMAKE_BUILD_TYPE=Release
	cmake --build build/native --parallel
test: all
	ctest --test-dir build/native --output-on-failure
wasm:
	emcmake cmake -S . -B build/wasm -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=OFF
	cmake --build build/wasm --parallel
	mkdir -p web/public/wasm
	cp build/wasm/qode.js build/wasm/qode.wasm web/public/wasm/
web: wasm
	npm --prefix web run build
clean:
	cmake -E rm -rf build/native build/wasm web/dist web/public/wasm
