import { useAtom, useAtomValue } from "jotai";
import { formatTime } from "@/utils/time-format";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { currentFileAtom, isFileInfoDialogOpenAtom } from "../0-store";

export function FileInfoDialog() {
    const [isOpen, setIsOpen] = useAtom(isFileInfoDialogOpenAtom);
    const file = useAtomValue(currentFileAtom);

    if (!file) {
        return null;
    }
    const { format, streams, chapters } = file.info;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl! gap-0! p-0!">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm">File info</DialogTitle>
                    <DialogDescription className="text-xs break-all">{file.path}</DialogDescription>
                </DialogHeader>

                <div className="px-4 py-3 max-h-[70vh] text-xs overflow-y-auto flex flex-col gap-3">
                    <Section title="Format">
                        <Row name="Container" value={`${format.format_name} (${format.format_long_name})`} />
                        <Row name="Duration" value={formatTime(file.info.duration)} />
                        <Row name="Size" value={formatBytes(Number(format.size))} />
                        <Row name="Bit rate" value={formatBitRate(format.bit_rate)} />
                        {Object.entries(format.tags ?? {}).map(([k, v]) => <Row name={k} value={v} key={k} />)}
                    </Section>

                    {streams.map((s) => (
                        <Section title={`Stream #${s.index}: ${s.codec_type}`} key={s.index}>
                            <Row name="Codec" value={`${s.codec_name} (${s.codec_long_name})`} />
                            {s.profile && <Row name="Profile" value={s.profile} />}
                            {s.width > 0 && <Row name="Resolution" value={`${s.width}x${s.height}${s.rotation ? `, rotated ${s.rotation}°` : ""}`} />}
                            {s.fps > 0 && s.codec_type === "video" && <Row name="Frame rate" value={`${s.fps.toFixed(3)} fps`} />}
                            {s.pix_fmt && <Row name="Pixel format" value={s.pix_fmt} />}
                            {s.sample_rate && <Row name="Sample rate" value={`${s.sample_rate} Hz, ${s.channels} ch ${s.channel_layout ?? ""}`} />}
                            {s.bit_rate && <Row name="Bit rate" value={formatBitRate(s.bit_rate)} />}
                            {Object.entries(s.tags ?? {}).map(([k, v]) => <Row name={k} value={v} key={k} />)}
                        </Section>
                    ))}

                    {!!chapters?.length && (
                        <Section title={`Chapters (${chapters.length})`}>
                            {chapters.map((c) => (
                                <Row name={`${formatTime(Number(c.start_time))} - ${formatTime(Number(c.end_time))}`} value={c.tags?.title ?? ""} key={c.id} />
                            ))}
                        </Section>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode; }) {
    return (
        <div className="flex flex-col gap-0.5">
            <div className="mb-1 font-semibold">{title}</div>
            {children}
        </div>
    );
}

function Row({ name, value }: { name: string; value: string; }) {
    return (
        <div className="grid grid-cols-[10rem_1fr] gap-2">
            <span className="text-muted-foreground truncate">{name}</span>
            <span className="break-all">{value}</span>
        </div>
    );
}

export function formatBytes(n: number): string {
    if (!Number.isFinite(n) || n <= 0) {
        return "";
    }
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
    return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function formatBitRate(value: string | undefined): string {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? `${Math.round(n / 1000)} kb/s` : "";
}
