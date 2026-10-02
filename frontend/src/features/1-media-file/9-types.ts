import type { probe } from "@/backend-api";

export type ProbeInfo = probe.Info;
export type ProbeStream = probe.Stream;

export type MediaFile = {
    path: string;
    name: string;       // file name with extension
    dir: string;
    ext: string;        // ".mp4"
    url: string;        // media handler URL for <video src>
    info: ProbeInfo;
};

export const StreamType = {
    video: "video",
    audio: "audio",
    subtitle: "subtitle",
    data: "data",
    attachment: "attachment",
} as const;

export function isCoverArt(stream: ProbeStream): boolean {
    return stream.codec_type === StreamType.video && !!stream.disposition?.attached_pic;
}
