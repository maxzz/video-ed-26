import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { DownloadIcon } from "lucide-react";
import { classNames } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { streamsAtom } from "@/features/1-media-file/0-store";
import { type ProbeStream } from "@/features/1-media-file/9-types";
import { extractTracksAtom } from "@/features/c-tools/0-store";
import { editTrackAtom, isTracksDialogOpenAtom, setTracksOfTypeAtom, toggleTrackAtom, trackEditsAtom, trackEnabledAtom } from "../0-store";

export function TracksDialog() {
    const [isOpen, setIsOpen] = useAtom(isTracksDialogOpenAtom);
    const streams = useAtomValue(streamsAtom);
    const setOfType = useSetAtom(setTracksOfTypeAtom);
    const extract = useSetAtom(extractTracksAtom);
    const enabled = useAtomValue(trackEnabledAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl! gap-0! p-0!">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm">Tracks</DialogTitle>
                    <DialogDescription className="text-xs">
                        Choose the streams to keep in the exported files. Title and language changes are written on export.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-2 border-b flex flex-wrap items-center gap-1">
                    <Button variant="outline" size="xs" onClick={() => setOfType(true)}>Keep all</Button>
                    <Button variant="outline" size="xs" onClick={() => setOfType(false)}>Discard all</Button>
                    <Button variant="outline" size="xs" onClick={() => setOfType(false, "audio")}>Discard audio</Button>
                    <Button variant="outline" size="xs" onClick={() => setOfType(false, "subtitle")}>Discard subtitles</Button>
                    <div className="flex-1" />
                    <Button variant="outline" size="xs" onClick={() => extract(streams.filter((s) => enabled[s.index]))}>
                        <DownloadIcon /> Extract kept tracks to files
                    </Button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 text-left text-muted-foreground bg-background">
                            <tr className="border-b">
                                <th className="px-2 py-1">Keep</th>
                                <th className="px-2 py-1">#</th>
                                <th className="px-2 py-1">Type</th>
                                <th className="px-2 py-1">Codec</th>
                                <th className="px-2 py-1">Details</th>
                                <th className="px-2 py-1">Language</th>
                                <th className="px-2 py-1">Title</th>
                                <th className="px-2 py-1" />
                            </tr>
                        </thead>
                        <tbody>
                            {streams.map((s) => <TrackRow stream={s} key={s.index} />)}
                        </tbody>
                    </table>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function TrackRow({ stream }: { stream: ProbeStream; }) {
    const enabled = useAtomValue(trackEnabledAtom)[stream.index] ?? false;
    const edit = useAtomValue(trackEditsAtom)[stream.index];
    const toggle = useSetAtom(toggleTrackAtom);
    const editTrack = useSetAtom(editTrackAtom);
    const extract = useSetAtom(extractTracksAtom);

    const language = edit?.language ?? stream.tags?.language ?? "";
    const title = edit?.title ?? stream.tags?.title ?? stream.tags?.handler_name ?? "";

    return (
        <tr className={classNames("border-b hover:bg-muted/50", !enabled && "opacity-50")}>
            <td className="px-2 py-1"><Checkbox checked={enabled} onCheckedChange={() => toggle(stream.index)} /></td>
            <td className="px-2 py-1 tabular-nums">{stream.index}</td>
            <td className="px-2 py-1">{stream.codec_type}{stream.disposition?.attached_pic ? " (cover)" : ""}</td>
            <td className="px-2 py-1" title={stream.codec_long_name}>{stream.codec_name}</td>
            <td className="px-2 py-1 text-muted-foreground">{streamDetails(stream)}</td>
            <td className="px-2 py-1">
                <input
                    className="px-1 w-14 h-6 bg-transparent hover:bg-muted focus:bg-muted border border-transparent focus:border-border rounded outline-none"
                    defaultValue={language}
                    key={language}
                    onBlur={(e) => e.target.value !== language && editTrack(stream.index, { language: e.target.value })}
                />
            </td>
            <td className="px-2 py-1">
                <input
                    className="px-1 w-40 h-6 bg-transparent hover:bg-muted focus:bg-muted border border-transparent focus:border-border rounded outline-none"
                    defaultValue={title}
                    key={title}
                    onBlur={(e) => e.target.value !== title && editTrack(stream.index, { title: e.target.value })}
                />
            </td>
            <td className="px-2 py-1">
                <Button variant="ghost" size="icon-xs" title="Extract this track to a file" onClick={() => extract([stream])}><DownloadIcon /></Button>
            </td>
        </tr>
    );
}

function streamDetails(s: ProbeStream): string {
    const parts: string[] = [];
    if (s.width) {
        parts.push(`${s.width}x${s.height}`);
    }
    if (s.codec_type === "video" && s.fps) {
        parts.push(`${Math.round(s.fps * 100) / 100} fps`);
    }
    if (s.sample_rate) {
        parts.push(`${s.sample_rate} Hz`);
    }
    if (s.channel_layout || s.channels) {
        parts.push(s.channel_layout || `${s.channels} ch`);
    }
    if (s.bit_rate) {
        parts.push(`${Math.round(Number(s.bit_rate) / 1000)} kb/s`);
    }
    return parts.join(", ");
}
