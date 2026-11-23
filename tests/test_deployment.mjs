import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
    config,
    packageVercel,
    verifyVercel,
} from "../tools/package-vercel.mjs";

async function fixture(t) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qode-deploy-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    for (const folder of ["docs", "wasm", "assets"])
        await mkdir(path.join(root, "web/dist", folder), { recursive: true });
    for (const name of ["index.html", "docs/index.html"])
        await writeFile(
            path.join(root, "web/dist", name),
            '<script src="/assets/app-hash.js"></script>',
        );
    await writeFile(
        path.join(root, "web/dist/assets/app-hash.js"),
        "export const ready = true;",
    );
    await writeFile(
        path.join(root, "web/dist/wasm/qode.js"),
        "export default async () => ({});",
    );
    await writeFile(
        path.join(root, "web/dist/wasm/qode.wasm"),
        Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]),
    );
    for (const name of ["LICENSE.txt", "THIRD_PARTY_NOTICES.txt"])
        await writeFile(path.join(root, "web/dist", name), "License fixture");
    return root;
}

test("packages both pages, engine, and licenses as an exact prebuilt artifact", async (t) => {
    const root = await fixture(t);
    const manifest = await packageVercel(root);
    assert.equal(Object.keys(manifest.files).length, 8);
    assert.deepEqual(await verifyVercel(root), manifest.files);
    assert.deepEqual(
        JSON.parse(
            await readFile(path.join(root, ".vercel/output/config.json")),
        ),
        config,
    );
    const second = await packageVercel(root);
    assert.deepEqual(second, manifest);
});

test("refuses an absent or corrupt engine rather than shipping a broken playground", async (t) => {
    const root = await fixture(t);
    await rm(path.join(root, "web/dist/wasm/qode.wasm"));
    await assert.rejects(packageVercel(root), /ENOENT/);
    await writeFile(path.join(root, "web/dist/wasm/qode.wasm"), "not wasm");
    await assert.rejects(packageVercel(root), WebAssembly.CompileError);
});

test("rejects repository-subpath builds and missing docs or licenses", async (t) => {
    const root = await fixture(t);
    await writeFile(
        path.join(root, "web/dist/index.html"),
        '<script src="/qode/assets/app.js"></script>',
    );
    await assert.rejects(packageVercel(root), /root base URL/);
    await writeFile(
        path.join(root, "web/dist/index.html"),
        '<script src="/assets/app.js"></script>',
    );
    await rm(path.join(root, "web/dist/docs/index.html"));
    await assert.rejects(packageVercel(root), /ENOENT/);
    await writeFile(
        path.join(root, "web/dist/docs/index.html"),
        '<script src="/assets/app.js"></script>',
    );
    await rm(path.join(root, "web/dist/LICENSE.txt"));
    await assert.rejects(packageVercel(root), /ENOENT/);
});

test("detects changed, missing, and extra deployment files after artifact transfer", async (t) => {
    const root = await fixture(t);
    for (const mutation of ["changed", "missing", "extra"]) {
        await packageVercel(root);
        const target = path.join(root, ".vercel/output/static/index.html");
        if (mutation === "changed") await writeFile(target, "tampered");
        else if (mutation === "missing") await rm(target);
        else
            await writeFile(
                path.join(root, ".vercel/output/static/extra.js"),
                "unexpected",
            );
        await assert.rejects(verifyVercel(root), /integrity check failed/);
    }
});

test("routes docs independently, preserves unknown-path 404s and serves Wasm with its MIME type", () => {
    const first = (pathname) =>
        config.routes.find(
            (route) =>
                route.src &&
                !route.continue &&
                new RegExp(`^${route.src}$`).test(pathname),
        );
    assert.equal(first("/").dest, "/index.html");
    assert.equal(first("/docs").headers.Location, "/docs/");
    assert.equal(first("/docs").status, 308);
    assert.equal(first("/docs/").dest, "/docs/index.html");
    assert.equal(first("/not-a-page").status, 404);
    assert.equal(
        config.routes.find((route) => route.src === "/wasm/qode.wasm").headers[
            "Content-Type"
        ],
        "application/wasm",
    );
    assert.match(
        config.routes.find((route) => route.src === "/assets/(.*)").headers[
            "Cache-Control"
        ],
        /immutable/,
    );
    assert.match(config.routes[0].headers["Cache-Control"], /must-revalidate/);
});
