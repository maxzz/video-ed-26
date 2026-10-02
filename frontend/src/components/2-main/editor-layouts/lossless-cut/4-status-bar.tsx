import { useAtomValue } from "jotai";
import { formatTime } from "@/utils/time-format";
import { JobsIndicator } from "@/features/0-jobs";
import { currentFileAtom, mainVideoStreamAtom } from "@/features/1-media-file/0-store";
import { FfmpegStatusBadge } from "@/features/9-ffmpeg-status";
import { formatBytes } from "@/features/1-media-file/1-ui/file-info-dialog";

export function StatusBar() {
    const file = useAtomValue(currentFileAtom);
    const video = useAtomValue(mainVideoStreamAtom);

    return (
        <div className="px-2 h-7 text-[11px] text-muted-foreground bg-background border-t flex items-center gap-3">
            <FfmpegStatusBadge />

            {file && (
                <span className="truncate">
                    {file.info.format.format_name} · {formatTime(file.info.duration)} · {formatBytes(Number(file.info.format.size))}
                    {video && ` · ${video.codec_name} ${video.width}x${video.height} ${Math.round(video.fps * 100) / 100} fps`}
                </span>
            )}

            <div className="flex-1" />
            <JobsIndicator />
        </div>
    );
}
