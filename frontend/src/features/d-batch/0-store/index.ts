import { atom } from "jotai";

/** Files opened in this session, in user order; the current file is one of them. */
export const batchFilesAtom = atom<string[]>([]);

export const addToBatchAtom = atom(null, (get, set, paths: string[]) => {
    const list = get(batchFilesAtom);
    const added = paths.filter((p) => !list.includes(p));
    added.length && set(batchFilesAtom, [...list, ...added]);
});

export const removeFromBatchAtom = atom(null, (get, set, path: string) => {
    set(batchFilesAtom, get(batchFilesAtom).filter((p) => p !== path));
});

export const moveInBatchAtom = atom(null, (get, set, path: string, delta: number) => {
    const list = [...get(batchFilesAtom)];
    const from = list.indexOf(path);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= list.length) {
        return;
    }
    list.splice(from, 1);
    list.splice(to, 0, path);
    set(batchFilesAtom, list);
});

export const clearBatchAtom = atom(null, (_get, set, keep?: string) => {
    set(batchFilesAtom, keep ? [keep] : []);
});
