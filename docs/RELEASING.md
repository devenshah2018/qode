# Release preparation

The repository contains a locally prepared 1.0.0 candidate. The version lives in the public C header, CMake project, and web package metadata; keep them synchronized for subsequent releases.

1. Run the verification commands in `VERIFICATION.md` from a clean source tree. Inspect the migration guide and numerical evidence.
2. Build native Release and the production playground. Run `python3 tools/package-release.py` to create native, playground, and corresponding source ZIP files plus SHA-256 checksums under ignored `work/release`.
3. Inspect the archive contents and verify the checksums. Native archives include the CLI, static library, public header, examples, documentation, and GPL license. Web archives include generated Wasm and JS, source-site license, and third-party runtime notices.
4. Review and commit the candidate through your normal Git workflow. Run GitHub CI to establish the remote Linux/Windows/platform results before publishing.
5. Use the manual **Prepare release artifacts** workflow to build each platform's downloadable candidates. It uploads workflow artifacts; it does not create a GitHub Release.
6. For automatic Vercel production deployment, follow [Deploy Qode to Vercel](DEPLOYMENT.md). GitHub Actions compiles and verifies the site before uploading prebuilt output.
7. Alternatively, to publish the playground on GitHub Pages, configure the repository's Pages source as GitHub Actions and invoke **Publish playground (manual)**. The app defaults to `/`, with documentation at `/docs/`. This GitHub Pages workflow explicitly builds with `--base=/qode/` for repository hosting; the deployment workflow requests only the required Pages/id-token permissions. A custom domain or repository rename needs a base-path adjustment.

ZIP member order and timestamps are fixed; executable permissions are preserved. Reproducible ZIP packaging does not promise byte-identical native compiler output across different toolchains. Keep the corresponding GPL source revision available with any distributed binary; retain bundled third-party licenses.

All workflow actions use inspected immutable commit references. Tool versions are pinned for Node, Python, Emscripten, and direct npm/Python development dependencies; the npm lockfile pins the JavaScript dependency tree. Compiler patch levels remain those provided by the named CI images and are reported by each run. Hosted workflows have not been invoked by this local implementation.
