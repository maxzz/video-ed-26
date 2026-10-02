import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { type Layout } from "react-resizable-panels";
import { editorSettings } from "@/store/3-editor-settings";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/ui/shadcn/resizable";
import { currentFileAtom } from "@/features/1-media-file/0-store";
import { EmptyState } from "@/features/0-session";
import { VideoPlayer } from "@/features/2-player";
import { Timeline } from "@/features/3-timeline";
import { TopBar } from "./1-top-bar";
import { SidePanel } from "./2-side-panel";
import { BottomBar } from "./3-bottom-bar";
import { StatusBar } from "./4-status-bar";

/** Layout v1, after LosslessCut: player with a segments side panel, timeline, and control bars. */
export function LosslessCutLayout() {
    const file = useAtomValue(currentFileAtom);

    return (
        <div className="min-h-0 grid grid-rows-[auto_1fr_auto_auto_auto]">
            <TopBar />
            {file ? <EditorBody /> : <EmptyState />}
            {file ? <Timeline className="h-auto min-h-16 border-t" /> : <div />}
            {file ? <BottomBar /> : <div />}
            <StatusBar />
        </div>
    );
}

function EditorBody() {
    const { editorLayout } = useSnapshot(editorSettings);

    return (
        <div className="min-h-0">
            <ResizablePanelGroup
                orientation="horizontal"
                defaultLayout={editorLayout as Layout}
                onLayoutChanged={(layout: Layout) => { editorSettings.editorLayout = layout; }}
            >
                <ResizablePanel id="player" minSize={30}>
                    <VideoPlayer />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel id="side" minSize={15}>
                    <SidePanel />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
