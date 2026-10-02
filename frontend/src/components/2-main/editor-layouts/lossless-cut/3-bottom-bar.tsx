import { PlaybackRateSelect, PlayerControls, RotateButton, VolumeControl } from "@/features/2-player";
import { TimelineToggles, ZoomControls } from "@/features/3-timeline";
import { CutToolbar } from "@/features/4-segments";
import { ExportButton, ExportModeToggle, KeyframeCutToggle } from "@/features/6-export";

export function BottomBar() {
    return (
        <div className="px-2 py-1 bg-background border-t flex flex-wrap items-center gap-x-3 gap-y-1">
            <PlayerControls />
            <Divider />
            <CutToolbar />
            <Divider />
            <ZoomControls />
            <TimelineToggles />

            <div className="flex-1" />

            <VolumeControl />
            <PlaybackRateSelect />
            <RotateButton />
            <Divider />
            <KeyframeCutToggle />
            <ExportModeToggle />
            <ExportButton />
        </div>
    );
}

function Divider() {
    return <div className="w-px h-5 bg-border" />;
}
