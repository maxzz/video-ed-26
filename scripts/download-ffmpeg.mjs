// Downloads static ffmpeg/ffprobe builds and copies them to build/bin/ffmpeg next to the app,
// the folder the backend checks before PATH (see backend/ffbin).
//
// Usage: node scripts/download-ffmpeg.mjs [--platform windows|darwin|linux] [--force]
// Downloads are cached in build/ffmpeg-cache/<platform> so `wails build --clean` does not re-download.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const force = args.includes("--force");
const platformArg = args[args.indexOf("--platform") + 1];
const platform = args.includes("--platform") ? platformArg : { win32: "windows", darwin: "darwin", linux: "linux" }[process.platform];

const sources = {
    windows: [{ url: "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip", archive: "ffmpeg.zip" }],
    darwin: [
        { url: "https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip", archive: "ffmpeg.zip" },
        { url: "https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip", archive: "ffprobe.zip" },
    ],
    linux: [{ url: "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz", archive: "ffmpeg.tar.xz" }],
};

if (!sources[platform]) {
    console.error(`Unsupported platform "${platform}"`);
    process.exit(1);
}

const exe = platform === "windows" ? ".exe" : "";
const binaries = [`ffmpeg${exe}`, `ffprobe${exe}`];
const cacheDir = join(root, "build", "ffmpeg-cache", platform);
const targetDir = join(root, "build", "bin", "ffmpeg");

if (force || !binaries.every((b) => existsSync(join(cacheDir, b)))) {
    rmSync(cacheDir, { recursive: true, force: true });
    mkdirSync(cacheDir, { recursive: true });

    for (const { url, archive } of sources[platform]) {
        const file = join(cacheDir, archive);
        console.log(`Downloading ${url}`);
        const res = await fetch(url, { redirect: "follow" });
        if (!res.ok) {
            throw new Error(`Download failed: ${res.status} ${res.statusText}`);
        }
        writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        extract(file, join(cacheDir, "x"));
        rmSync(file);
    }

    for (const name of binaries) {
        const found = findFile(join(cacheDir, "x"), name);
        if (!found) {
            throw new Error(`${name} not found in the downloaded archive`);
        }
        cpSync(found, join(cacheDir, name));
        if (!exe) {
            chmodSync(join(cacheDir, name), 0o755);
        }
    }
    rmSync(join(cacheDir, "x"), { recursive: true, force: true });
}

mkdirSync(targetDir, { recursive: true });
for (const name of binaries) {
    cpSync(join(cacheDir, name), join(targetDir, name));
}
console.log(`ffmpeg and ffprobe copied to ${targetDir}`);

function extract(file, dir) {
    mkdirSync(dir, { recursive: true });
    if (file.endsWith(".zip")) {
        if (process.platform === "win32") {
            execFileSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${file}' -DestinationPath '${dir}' -Force`], { stdio: "inherit" });
        } else {
            execFileSync("unzip", ["-o", file, "-d", dir], { stdio: "inherit" });
        }
    } else {
        execFileSync("tar", ["-xJf", file, "-C", dir], { stdio: "inherit" });
    }
}

function findFile(dir, name) {
    for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) {
            const found = findFile(p, name);
            if (found) {
                return found;
            }
        } else if (entry === name) {
            return p;
        }
    }
    return undefined;
}
