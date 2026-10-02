/** False when the page runs in a plain browser (`pnpm dev` without `wails dev`). */
export function isWails(): boolean {
    const w = window as unknown as { go?: unknown; runtime?: unknown; };
    return !!w.go && !!w.runtime;
}
