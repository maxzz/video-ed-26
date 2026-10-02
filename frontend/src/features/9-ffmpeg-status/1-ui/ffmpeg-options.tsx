import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { editorSettings } from "@/store/3-editor-settings";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { browseCustomFfPathAtom, ffStatusAtom, setCustomFfPathAtom } from "../0-store";

/** Options dialog section: where ffmpeg and ffprobe are taken from. */
export function FfmpegOptions() {
    const { customFfPath } = useSnapshot(editorSettings);
    const status = useAtomValue(ffStatusAtom);
    const setPath = useSetAtom(setCustomFfPathAtom);
    const browse = useSetAtom(browseCustomFfPathAtom);

    return (
        <div className="flex flex-col gap-1.5">
            <Label>Custom ffmpeg folder</Label>

            <div className="flex gap-1">
                <Input
                    className="h-7 text-xs"
                    placeholder="Bundled ffmpeg folder, then PATH"
                    defaultValue={customFfPath}
                    key={customFfPath}
                    onBlur={(e) => e.target.value !== customFfPath && setPath(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
                <Button variant="outline" size="sm" onClick={browse}>Browse</Button>
                {customFfPath && <Button variant="ghost" size="sm" onClick={() => setPath("")}>Reset</Button>}
            </div>

            {status && (
                <div className="text-[11px] text-muted-foreground break-all">
                    {status.error
                        ? <span className="text-destructive">{status.error}</span>
                        : <>Using {status.ffmpegPath} (version {status.ffmpegVersion})</>
                    }
                </div>
            )}
        </div>
    );
}
