import { atom, type createStore } from "jotai";
import { editorSettings, editorSettingsAtom } from "@/store/3-editor-settings";
import { currentFileAtom } from "@/features/1-media-file/0-store";
import { COMMANDS, COMMANDS_BY_ID } from "./1-commands";
import { isEditableTarget, keyFromEvent } from "./3-keys";

/** Command id -> keys: the user's bindings where set, otherwise the defaults. */
export const commandKeysAtom = atom((get) => {
    const overrides = get(editorSettingsAtom).keyBindings;
    return new Map(COMMANDS.map((c) => [c.id, (overrides[c.id] as string[] | undefined) ?? c.keys]));
});

/** Key -> command id; when two commands share a key the first one wins. */
export const keyToCommandAtom = atom((get) => {
    const rv = new Map<string, string>();
    for (const [id, keys] of get(commandKeysAtom)) {
        keys.forEach((k) => !rv.has(k) && rv.set(k, id));
    }
    return rv;
});

export const runCommandAtom = atom(null, (get, set, id: string) => {
    const cmd = COMMANDS_BY_ID.get(id);
    if (!cmd || (cmd.needsFile && !get(currentFileAtom))) {
        return;
    }
    set(cmd.action);
});

export const setCommandKeysAtom = atom(null, (_get, _set, id: string, keys: string[] | null) => {
    const next = { ...editorSettings.keyBindings };
    if (keys === null) {
        delete next[id];
    } else {
        next[id] = keys;
    }
    editorSettings.keyBindings = next;
});

export const resetAllKeysAtom = atom(null, () => {
    editorSettings.keyBindings = {};
});

/** While set, the shortcuts dialog is recording a key for this command and global shortcuts are paused. */
export const recordingKeyForAtom = atom<string | null>(null);

type Store = ReturnType<typeof createStore>;

const ALWAYS_ALLOWED = new Set(["help.palette", "help.devtools"]);

export function installKeyboardShortcuts(store: Store) {
    window.addEventListener("keydown", (e) => {
        if (store.get(recordingKeyForAtom) || isEditableTarget(e.target)) {
            return;
        }
        const key = keyFromEvent(e);
        const id = key && store.get(keyToCommandAtom).get(key);
        if (!id) {
            return;
        }
        const modalOpen = !!document.querySelector("[role=dialog], [role=menu], [role=listbox]");
        if (modalOpen && !ALWAYS_ALLOWED.has(id)) {
            return;
        }
        e.preventDefault();
        store.set(runCommandAtom, id);
    });
}
