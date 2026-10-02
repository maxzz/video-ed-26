import { getDefaultStore } from "jotai";
import { isWails, onFilesDropped } from "@/backend-api";
import { initFfStatusAtom } from "@/features/9-ffmpeg-status/0-store";
import { installKeyboardShortcuts } from "@/features/8-commands/0-store";
import { openFilesAtom } from "./1-open-file";

/** One-time app wiring; called from main.tsx before the first render. */
export function initApp() {
    const store = getDefaultStore();

    installKeyboardShortcuts(store);
    onFilesDropped((paths) => store.set(openFilesAtom, paths));

    if (isWails()) {
        store.set(initFfStatusAtom).catch(console.error);
    }
}
