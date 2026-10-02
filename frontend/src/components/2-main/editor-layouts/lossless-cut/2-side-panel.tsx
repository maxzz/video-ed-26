import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { editorSettings } from "@/store/3-editor-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/shadcn/tabs";
import { segmentIdsAtom, SegmentsPanel } from "@/features/4-segments";
import { batchFilesAtom, BatchList } from "@/features/d-batch";

export function SidePanel() {
    const { sideTab } = useSnapshot(editorSettings);
    const segmentsCount = useAtomValue(segmentIdsAtom).length;
    const filesCount = useAtomValue(batchFilesAtom).length;

    return (
        <Tabs className="h-full gap-0 bg-background" value={sideTab} onValueChange={(v) => { editorSettings.sideTab = v; }}>
            <TabsList className="m-1 h-7">
                <TabsTrigger className="text-xs" value="segments">Segments ({segmentsCount})</TabsTrigger>
                <TabsTrigger className="text-xs" value="files">Files ({filesCount})</TabsTrigger>
            </TabsList>

            <TabsContent className="min-h-0 border-t" value="segments">
                <SegmentsPanel />
            </TabsContent>
            <TabsContent className="min-h-0 border-t" value="files">
                <BatchList />
            </TabsContent>
        </Tabs>
    );
}
