import { atom } from "jotai";
import { streamsAtom } from "@/features/1-media-file/0-store";
import { StreamType, type ProbeInfo } from "@/features/1-media-file/9-types";

export type TrackEdit = { title?: string; language?: string; };

/** Stream index -> included in export. */
export const trackEnabledAtom = atom<Record<number, boolean>>({});

/** Stream index -> metadata changes written on export. */
export const trackEditsAtom = atom<Record<number, TrackEdit>>({});

export const isTracksDialogOpenAtom = atom(false);

export const enabledStreamIndexesAtom = atom((get) => {
    const enabled = get(trackEnabledAtom);
    return get(streamsAtom).filter((s) => enabled[s.index]).map((s) => s.index);
});

export const enabledTracksCountAtom = atom((get) => get(enabledStreamIndexesAtom).length);

/** Data streams (timecodes, telemetry) often cannot be written to other containers, so they start disabled. */
export const initTracksAtom = atom(null, (_get, set, info: ProbeInfo | null) => {
    const enabled: Record<number, boolean> = {};
    for (const s of info?.streams ?? []) {
        enabled[s.index] = s.codec_type !== StreamType.data && s.codec_type !== StreamType.attachment;
    }
    set(trackEnabledAtom, enabled);
    set(trackEditsAtom, {});
});

export const toggleTrackAtom = atom(null, (get, set, index: number) => {
    set(trackEnabledAtom, { ...get(trackEnabledAtom), [index]: !get(trackEnabledAtom)[index] });
});

/** Enables or disables all streams of one type, or all streams when type is omitted. */
export const setTracksOfTypeAtom = atom(null, (get, set, enabled: boolean, type?: string) => {
    const next = { ...get(trackEnabledAtom) };
    for (const s of get(streamsAtom)) {
        if (!type || s.codec_type === type) {
            next[s.index] = enabled;
        }
    }
    set(trackEnabledAtom, next);
});

export const editTrackAtom = atom(null, (get, set, index: number, edit: TrackEdit) => {
    const all = get(trackEditsAtom);
    set(trackEditsAtom, { ...all, [index]: { ...all[index], ...edit } });
});
