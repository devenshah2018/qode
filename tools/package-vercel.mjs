import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const config = {
    version: 3,
    routes: [
        {
            src: "/(.*)",
            headers: {
                "X-Content-Type-Options": "nosniff",
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "X-Frame-Options": "DENY",
                "Cache-Control": "public, max-age=0, must-revalidate",
            },
            continue: true,
        },
        {
            src: "/assets/(.*)",
            headers: { "Cache-Control": "public, max-age=31536000, immutable" },
            continue: true,
        },
        {
            src: "/wasm/qode.wasm",
            headers: { "Content-Type": "application/wasm" },
            continue: true,
        },
        { src: "/", dest: "/index.html" },
        { src: "/docs", status: 308, headers: { Location: "/docs/" } },
        { src: "/docs/", dest: "/docs/index.html" },
        { handle: "filesystem" },
        { src: "/(.*)", status: 404 },
    ],
};
async function files(directory, prefix = "") {
    const result = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const name = path.posix.join(prefix, entry.name);
        if (entry.isSymbolicLink())
            throw new Error(`Deployment contains a symlink: ${name}`);
        if (entry.isDirectory())
            result.push(
                ...(await files(path.join(directory, entry.name), name)),
            );
        else if (entry.isFile()) result.push(name);
        else throw new Error(`Unexpected deployment entry: ${name}`);
    }
    return result.sort();
}
async function digests(directory) {
    return Object.fromEntries(
        await Promise.all(
            (await files(directory)).map(async (name) => [
                name,
                createHash("sha256")
                    .update(await readFile(path.join(directory, name)))
                    .digest("hex"),
            ]),
        ),
    );
}
export async function packageVercel(project = root) {
    const dist = path.join(project, "web/dist");
    // Fail before removing an earlier package if the build is incomplete or not at root.
    for (const name of [
        "index.html",
        "docs/index.html",
        "wasm/qode.js",
        "LICENSE.txt",
        "THIRD_PARTY_NOTICES.txt",
    ]) {
        const content = await readFile(path.join(dist, name), "utf8");
        if (!content.trim()) throw new Error(`Empty deployment asset: ${name}`);
        if (
            name.endsWith(".html") &&
            (!content.includes("/assets/") || content.includes("/qode/assets/"))
        )
            throw new Error(
                `Build ${name} with the root base URL / before deployment`,
            );
    }
    new WebAssembly.Module(await readFile(path.join(dist, "wasm/qode.wasm")));
    const output = path.join(project, ".vercel/output");
    await rm(output, { recursive: true, force: true });
    await mkdir(output, { recursive: true });
    await cp(dist, path.join(output, "static"), { recursive: true });
    await writeFile(
        path.join(output, "config.json"),
        JSON.stringify(config, null, 2) + "\n",
    );
    const manifest = { schemaVersion: 1, files: await digests(output) };
    await mkdir(path.join(project, "work"), { recursive: true });
    await writeFile(
        path.join(project, "work/vercel-manifest.json"),
        JSON.stringify(manifest, null, 2) + "\n",
    );
    return manifest;
}
export async function verifyVercel(project = root) {
    const manifest = JSON.parse(
        await readFile(path.join(project, "work/vercel-manifest.json"), "utf8"),
    );
    const actual = await digests(path.join(project, ".vercel/output"));
    if (
        manifest.schemaVersion !== 1 ||
        JSON.stringify(actual) !== JSON.stringify(manifest.files)
    )
        throw new Error(
            "Deployment artifact integrity check failed; rebuild instead of uploading it",
        );
    return actual;
}
if (
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    const result = process.argv.includes("--verify")
        ? await verifyVercel()
        : (await packageVercel()).files;
    console.log(
        `Vercel artifact ${process.argv.includes("--verify") ? "verified" : "prepared"}: ${Object.keys(result).length} files`,
    );
}
