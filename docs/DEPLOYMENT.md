# Deploy Qode to Vercel

Qode is a static, account-free application. GitHub Actions compiles its C engine to WebAssembly and builds both the workbench and handbook. After verification, Actions uploads the resulting files to Vercel using `vercel deploy --prebuilt --prod`. Vercel serves these files; simulation runs on the visitor's device. No database, server functions, paid build machine, or Emscripten installation on Vercel is required.

## One-time setup

Complete these steps after committing and pushing the repository changes, including the new deployment files, to `main`.

### 1. Create or link a Vercel project

From the **repository root**, with Node installed:

```sh
npm --prefix tools/deploy ci
./tools/deploy/node_modules/.bin/vercel link
```

Log in when prompted, choose your Vercel account/team, and create a project named `qode` or link an existing project. Keep the project root at the repository root (`.`), rather than `web`. `link` creates local project configuration; it does not deploy. If the setup asks about a framework, select Other. Build/install/output overrides are unnecessary: the workflow supplies a complete prebuilt artifact.

Open the generated `.vercel/project.json`. You need its `orgId` and `projectId` for the next step. `.vercel/` is ignored by Git; do not commit the file. Existing projects linked directly to GitHub should disconnect their Git repository under Vercel Project Settings → Git. The checked-in `vercel.json` also disables automatic Git deployments, preventing a second, unverified build.

### 2. Add three GitHub Actions secrets

Create a Vercel token at [Account Settings → Tokens](https://vercel.com/account/settings/tokens), scoped to the account/team containing the project. Choose an expiry that you can maintain.

In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Secret | Value |
| --- | --- |
| `VERCEL_TOKEN` | The Vercel token you just created |
| `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |

These are GitHub Actions secrets, not frontend environment variables. Never add the token to source files, `VITE_*` variables, or Vercel's browser build environment.

### 3. Enable Actions and run the pipeline

If GitHub Actions is disabled, enable it under repository Settings → Actions. Open **Actions → Verify → Run workflow**, select `main`, and run it. Alternatively, push a new commit to `main`.

The workflow creates/uses the GitHub `production` environment. If you add environment restrictions, allow `main`. Reviews are optional and would introduce a manual gate. A successful **Deploy production to Vercel** job records the deployment URL in the workflow summary and environment link. In Vercel, use the project's production domain to visit `/` and `/docs/`; run the Bell example and try Step, Back, and Sample.

For a publicly accessible demo, ensure Vercel's Deployment Protection settings permit anonymous access to **production**. Preview protection can stay enabled. A custom domain is optional and can be added in Vercel's Domains settings.

## What happens after setup

1. Every push and pull request runs the existing verification suite. Native Linux, macOS, and Windows builds, numerical comparisons, sanitizers, static analysis, parser fuzzing, Wasm/native parity, and browser tests must succeed.
2. The browser job installs pinned Node 22.15.0 and Emscripten 4.0.10, builds Wasm from the same source revision, then builds the site at `/`.
3. Packaging validates the engine, both pages, and license files. It generates Vercel's Build Output API v3 directory plus SHA-256 checksums. Browser tests run against the same `web/dist` that was packaged.
4. Only a push to `main` or a manual run on `main` may deploy. The deployment job waits for **all three verification jobs**, downloads only its own run's artifact, checks every file's digest, and uploads it with the lockfile-pinned Vercel CLI. Vercel does not rebuild the site.
5. Production deployments are serialized. A revision that is no longer the tip of `main` is skipped so an older, slower CI run cannot knowingly replace a newer revision. A push arriving after the revision check will get its own verification and deployment run.

Pull requests, including forks, never deploy and never receive deployment credentials. No `pull_request_target` or privileged `workflow_run` trigger is used. Missing secrets produce an explicit setup notice and skip deployment while leaving verification usable in a public clone. Branches other than `main` only verify; this pipeline does not consume Vercel deployments for each PR.

## Hosting behavior

- `/` serves the workbench; `/docs` redirects to `/docs/` and serves the separate handbook entry point. Chapter links remain URL fragments, for example `/docs/#syntax`.
- Unknown paths return 404, including absent assets. There is no catch-all rewrite that might return HTML for a missing Wasm file.
- Hashed `/assets/` files receive immutable caching. HTML and the stable `/wasm/qode.js` and `/wasm/qode.wasm` paths revalidate, avoiding a stale loader paired with a new engine.
- Wasm is served as `application/wasm`. Security headers prevent MIME sniffing and framing. The engine uses no threads or shared memory, so cross-origin isolation headers are unnecessary.
- Bundled GPL and third-party license files ship with the site. Source remains in the public GitHub repository; keep the deployed source revision available when distributing its binaries.

The site uses static hosting rather than server execution. It fits Vercel Hobby's capabilities for personal, non-commercial projects, subject to the plan's current usage limits and terms. It is not a promise of unlimited free bandwidth or build/deployment usage. See [Vercel Hobby](https://vercel.com/docs/plans/hobby).

## Troubleshooting and rollback

- **Setup pending:** all three secrets must be configured in this repository, or its `production` environment. Rerun Verify on `main` after adding them.
- **Verification failed:** deployment deliberately does not run. Fix the failing job rather than deploying around it. Browser traces are attached on failure.
- **Unauthorized / project not found:** check token scope and expiry, and that org/project IDs belong to that same Vercel account. Rotate the GitHub secret when the token expires.
- **Workflow passed but no deployment:** check the deploy job's summary for a superseded revision or missing setup. PR and non-main runs intentionally never deploy.
- **Missing/invalid Wasm:** do not commit generated binaries. The Actions browser job must run `make wasm`; packaging rejects missing or malformed binaries.
- **Vercel starts its own source build:** disconnect its Git integration and retain `git.deploymentEnabled: false`. Use the GitHub workflow, not Vercel's source rebuild button.
- **Private production page:** adjust production Deployment Protection in Vercel; this is a hosting setting, not a Qode login.
- **Rollback:** use Vercel's deployment dashboard to restore a previously working production deployment, or revert the faulty source change through Git and let the pipeline deploy it. A later successful push will supersede a dashboard rollback.

To recreate the artifact locally after building Wasm:

```sh
make wasm
npm --prefix web ci
npm --prefix web run build
node --test tests/test_deployment.mjs
node tools/package-vercel.mjs
node tools/package-vercel.mjs --verify
```

Generated files live in ignored `.vercel/output/`; checksums are in ignored `work/vercel-manifest.json`. The workflow retains the tested artifact for seven days. No Vercel credentials are needed to build, test, or package locally. Actual upload requires your one-time account setup.

This follows Vercel's documented [prebuilt GitHub Actions deployment model](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel) and [Build Output API](https://vercel.com/docs/build-output-api/configuration).
