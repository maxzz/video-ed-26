/** Path helpers for native paths received from the backend (Windows or POSIX separators). */

export function pathSeparator(path: string): string {
    return path.includes("\\") ? "\\" : "/";
}

export function pathBasename(path: string): string {
    const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    return i >= 0 ? path.slice(i + 1) : path;
}

export function pathDirname(path: string): string {
    const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    return i >= 0 ? path.slice(0, i) : "";
}

/** Extension with the dot, lower-cased: ".mp4" */
export function pathExt(path: string): string {
    const name = pathBasename(path);
    const i = name.lastIndexOf(".");
    return i > 0 ? name.slice(i).toLowerCase() : "";
}

export function pathStem(path: string): string {
    const name = pathBasename(path);
    const i = name.lastIndexOf(".");
    return i > 0 ? name.slice(0, i) : name;
}

export function pathJoin(dir: string, name: string): string {
    if (!dir) {
        return name;
    }
    const sep = pathSeparator(dir);
    return dir.endsWith(sep) ? dir + name : dir + sep + name;
}

const invalidFileChars = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizeFileName(name: string): string {
    return name.replace(invalidFileChars, "_").replace(/[. ]+$/, "").trim();
}
