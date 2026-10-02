import { atom, getDefaultStore } from "jotai";
import { observe } from "jotai-effect";
import { api } from "@/backend-api";
import { editorSettingsAtom } from "@/store/3-editor-settings";
import { currentFileAtom, hasAudioAtom } from "@/features/1-media-file/0-store";
import { visibleRangeAtom, viewportWidthAtom } from "./1-viewport";

export const WAVEFORM_HEIGHT = 40;

/** Longest visible span (seconds) for which a waveform is rendered; wider views would take too long. */
export const MAX_WAVEFORM_SPAN = 20 * 60;

export type WaveformImage = { from: number; to: number; url: string; };

export const waveformAtom = atom<WaveformImage | null>(null);

export const isWaveformTooWideAtom = atom((get) => {
    const { from, to } = get(visibleRangeAtom);
    return to - from > MAX_WAVEFORM_SPAN;
});

let debounce: ReturnType<typeof setTimeout> | undefined;
let generation = 0;

export const resetWaveformAtom = atom(null, (_get, set) => {
    generation++;
    set(waveformAtom, null);
});

observe((get) => {
    const file = get(currentFileAtom);
    const enabled = get(editorSettingsAtom).showWaveform && get(hasAudioAtom);
    const { from, to } = get(visibleRangeAtom);
    const width = get(viewportWidthAtom);

    clearTimeout(debounce);
    if (!file || !enabled || width <= 0 || to <= from || to - from > MAX_WAVEFORM_SPAN) {
        return;
    }

    const gen = ++generation;
    const end = Math.min(to, file.info.duration);
    debounce = setTimeout(async () => {
        try {
            const url = await api.waveform.GetWaveform(file.path, from, end, Math.round(width), WAVEFORM_HEIGHT * 2, "0x3b82f6");
            gen === generation && getDefaultStore().set(waveformAtom, { from, to: end, url });
        } catch (error) {
            console.error("Failed to render the waveform", error);
        }
    }, 400);
});
