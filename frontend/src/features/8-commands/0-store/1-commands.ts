import { atom } from "jotai";
import { api } from "@/backend-api";
import { editorSettings } from "@/store/3-editor-settings";
import { isOpenOptionsDialogAtom } from "@/components/4-dialogs/8-3-options/9-types-options";
import { closeFileAtom, openFileDialogAtom } from "@/features/0-session/0-store/1-open-file";
import { isFileInfoDialogOpenAtom } from "@/features/1-media-file/0-store";
import {
    changePlaybackRateAtom, pauseAtom, rotateAtom, seekRelativeAtom, seekToEndAtom, seekToStartAtom, stepFrameAtom, toggleMuteAtom, togglePlayAtom,
} from "@/features/2-player/0-store";
import { seekToKeyframeAtom, setZoomAtom, zoomByAtom } from "@/features/3-timeline/0-store";
import {
    addSegmentAtom, clearSegmentsAtom, duplicateSegmentAtom, invertSegmentsAtom, jumpToSegmentEndAtom, jumpToSegmentStartAtom,
    playActiveSegmentAtom, redoAtom, removeSegmentAtom, removeUnselectedSegmentsAtom, segmentsFromChaptersAtom, selectAdjacentSegmentAtom,
    selectAllSegmentsAtom, setCutEndAtom, setCutStartAtom, sortSegmentsAtom, splitByDurationAtom, splitIntoEqualPartsAtom, splitSegmentAtom,
    toggleSegmentSelectedAtom, undoAtom,
} from "@/features/4-segments/0-store";
import { isTracksDialogOpenAtom } from "@/features/5-tracks/0-store";
import { exportCommandAtom } from "@/features/6-export/0-store";
import { saveProjectAtom } from "@/features/7-project/0-store";
import { exportSegmentsToFileAtom, importSegmentsAtom, SegmentsFormat } from "@/features/a-segments-io/0-store";
import { detectDialogKindAtom, DetectKind } from "@/features/b-detect/0-store";
import { captureSnapshotAtom, openMergeFilesDialogAtom } from "@/features/c-tools/0-store";
import { batchFilesAtom } from "@/features/d-batch/0-store";
import { command, CommandGroup as G, type Command } from "../9-types";

export const isCommandPaletteOpenAtom = atom(false);
export const isShortcutsDialogOpenAtom = atom(false);

const app = { needsFile: false };

/** Every user action. Menus, the command palette and keyboard shortcuts are all built from this list. */
export const COMMANDS: Command[] = [
    // File
    command("file.open", "Open...", G.file, (_g, set) => set(openFileDialogAtom), { ...app, keys: ["ctrl+o"], section: "open" }),
    command("file.close", "Close file", G.file, (_g, set) => set(closeFileAtom), { keys: ["ctrl+w"], section: "open" }),
    command("file.saveProject", "Save project", G.file, (_g, set) => set(saveProjectAtom, true), { keys: ["ctrl+s"], section: "project" }),
    command("file.info", "File info", G.file, (_g, set) => set(isFileInfoDialogOpenAtom, true), { keys: ["ctrl+i"], section: "project" }),
    command("file.importSegments", "Import segments...", G.file, (_g, set) => set(importSegmentsAtom), { section: "segments-io" }),
    command("file.exportSegments.csv", "Export segments as CSV...", G.file, (_g, set) => set(exportSegmentsToFileAtom, SegmentsFormat.csv), { section: "segments-io" }),
    command("file.exportSegments.youtube", "Export segments as YouTube chapters...", G.file, (_g, set) => set(exportSegmentsToFileAtom, SegmentsFormat.youtube), { section: "segments-io" }),
    command("file.exportSegments.edl", "Export segments as MPlayer EDL...", G.file, (_g, set) => set(exportSegmentsToFileAtom, SegmentsFormat.edl), { section: "segments-io" }),
    command("file.exportSegments.llc", "Export segments as LosslessCut project...", G.file, (_g, set) => set(exportSegmentsToFileAtom, SegmentsFormat.llc), { section: "segments-io" }),
    command("file.export", "Export...", G.file, (_g, set) => set(exportCommandAtom), { keys: ["e"], section: "export" }),
    command("file.options", "Options", G.file, (_g, set) => set(isOpenOptionsDialogAtom, true), { ...app, keys: ["ctrl+,"], section: "options" }),

    // Edit
    command("edit.undo", "Undo", G.edit, (_g, set) => set(undoAtom), { keys: ["ctrl+z"] }),
    command("edit.redo", "Redo", G.edit, (_g, set) => set(redoAtom), { keys: ["ctrl+shift+z", "ctrl+y"] }),

    // Segments
    command("segments.setStart", "Set segment start", G.segments, (_g, set) => set(setCutStartAtom), { keys: ["i"], section: "cut" }),
    command("segments.setEnd", "Set segment end", G.segments, (_g, set) => set(setCutEndAtom), { keys: ["o"], section: "cut" }),
    command("segments.add", "Add segment", G.segments, (_g, set) => set(addSegmentAtom), { keys: ["plus", "insert"], section: "cut" }),
    command("segments.split", "Split segment at playhead", G.segments, (_g, set) => set(splitSegmentAtom), { keys: ["s"], section: "cut" }),
    command("segments.remove", "Remove segment", G.segments, (_g, set) => set(removeSegmentAtom), { keys: ["backspace", "delete"], section: "cut" }),
    command("segments.duplicate", "Duplicate segment", G.segments, (_g, set) => set(duplicateSegmentAtom), { keys: ["ctrl+d"], section: "cut" }),
    command("segments.toggleSelected", "Include/exclude segment", G.segments, (_g, set) => set(toggleSegmentSelectedAtom), { keys: ["x"], section: "select" }),
    command("segments.selectAll", "Include all segments", G.segments, (_g, set) => set(selectAllSegmentsAtom, true), { keys: ["ctrl+a"], section: "select" }),
    command("segments.deselectAll", "Exclude all segments", G.segments, (_g, set) => set(selectAllSegmentsAtom, false), { keys: ["ctrl+shift+a"], section: "select" }),
    command("segments.removeUnselected", "Remove excluded segments", G.segments, (_g, set) => set(removeUnselectedSegmentsAtom), { section: "select" }),
    command("segments.prev", "Previous segment", G.segments, (_g, set) => set(selectAdjacentSegmentAtom, -1), { keys: ["arrowup"], section: "nav" }),
    command("segments.next", "Next segment", G.segments, (_g, set) => set(selectAdjacentSegmentAtom, 1), { keys: ["arrowdown"], section: "nav" }),
    command("segments.jumpStart", "Jump to segment start", G.segments, (_g, set) => set(jumpToSegmentStartAtom), { keys: ["shift+i"], section: "nav" }),
    command("segments.jumpEnd", "Jump to segment end", G.segments, (_g, set) => set(jumpToSegmentEndAtom), { keys: ["shift+o"], section: "nav" }),
    command("segments.play", "Play segment", G.segments, (_g, set) => set(playActiveSegmentAtom), { keys: ["p"], section: "nav" }),
    command("segments.invert", "Invert segments", G.segments, (_g, set) => set(invertSegmentsAtom), { section: "bulk" }),
    command("segments.sort", "Sort segments by time", G.segments, (_g, set) => set(sortSegmentsAtom), { section: "bulk" }),
    command("segments.fromChapters", "Segments from chapters", G.segments, (_g, set) => set(segmentsFromChaptersAtom), { section: "bulk" }),
    ...[2, 3, 4, 5, 10].map((n) => command(`segments.splitInto.${n}`, `Split file into ${n} equal parts`, G.segments, (_g, set) => set(splitIntoEqualPartsAtom, n), { section: "equal", hidden: n > 5 })),
    ...([[10, "10 s"], [30, "30 s"], [60, "1 min"], [300, "5 min"], [600, "10 min"]] as const).map(([s, label]) =>
        command(`segments.splitEvery.${s}`, `Split file every ${label}`, G.segments, (_g, set) => set(splitByDurationAtom, s), { section: "every" })),
    command("segments.clear", "Remove all segments", G.segments, (_g, set) => set(clearSegmentsAtom), { section: "clear" }),

    // Playback
    command("playback.toggle", "Play/pause", G.playback, (_g, set) => set(togglePlayAtom), { keys: ["space"], section: "play" }),
    command("playback.pause", "Pause", G.playback, (_g, set) => set(pauseAtom), { keys: ["k"], section: "play", hidden: true }),
    command("playback.slower", "Slower", G.playback, (_g, set) => set(changePlaybackRateAtom, -1), { keys: ["j"], section: "play" }),
    command("playback.faster", "Faster", G.playback, (_g, set) => set(changePlaybackRateAtom, 1), { keys: ["l"], section: "play" }),
    command("playback.back1", "Back 1 second", G.playback, (_g, set) => set(seekRelativeAtom, -1), { keys: ["arrowleft"], section: "seek" }),
    command("playback.forward1", "Forward 1 second", G.playback, (_g, set) => set(seekRelativeAtom, 1), { keys: ["arrowright"], section: "seek" }),
    command("playback.back10", "Back 10 seconds", G.playback, (_g, set) => set(seekRelativeAtom, -10), { keys: ["shift+arrowleft"], section: "seek" }),
    command("playback.forward10", "Forward 10 seconds", G.playback, (_g, set) => set(seekRelativeAtom, 10), { keys: ["shift+arrowright"], section: "seek" }),
    command("playback.back60", "Back 1 minute", G.playback, (_g, set) => set(seekRelativeAtom, -60), { keys: ["ctrl+arrowleft"], section: "seek" }),
    command("playback.forward60", "Forward 1 minute", G.playback, (_g, set) => set(seekRelativeAtom, 60), { keys: ["ctrl+arrowright"], section: "seek" }),
    command("playback.prevFrame", "Previous frame", G.playback, (_g, set) => set(stepFrameAtom, -1), { keys: [","], section: "frame" }),
    command("playback.nextFrame", "Next frame", G.playback, (_g, set) => set(stepFrameAtom, 1), { keys: ["."], section: "frame" }),
    command("playback.prevKeyframe", "Previous keyframe", G.playback, (_g, set) => set(seekToKeyframeAtom, -1), { keys: ["alt+arrowleft"], section: "frame" }),
    command("playback.nextKeyframe", "Next keyframe", G.playback, (_g, set) => set(seekToKeyframeAtom, 1), { keys: ["alt+arrowright"], section: "frame" }),
    command("playback.toStart", "Jump to start", G.playback, (_g, set) => set(seekToStartAtom), { keys: ["home"], section: "jump" }),
    command("playback.toEnd", "Jump to end", G.playback, (_g, set) => set(seekToEndAtom), { keys: ["end"], section: "jump" }),
    command("playback.mute", "Mute", G.playback, (_g, set) => set(toggleMuteAtom), { keys: ["m"], section: "audio" }),

    // View
    command("view.zoomIn", "Zoom in", G.view, (_g, set) => set(zoomByAtom, 2), { keys: ["ctrl+=", "="], section: "zoom" }),
    command("view.zoomOut", "Zoom out", G.view, (_g, set) => set(zoomByAtom, 0.5), { keys: ["ctrl+-", "-"], section: "zoom" }),
    command("view.zoomFit", "Fit whole file", G.view, (_g, set) => set(setZoomAtom, 1), { keys: ["ctrl+0"], section: "zoom" }),
    command("view.thumbnails", "Toggle thumbnails", G.view, () => { editorSettings.showThumbnails = !editorSettings.showThumbnails; }, { ...app, section: "show" }),
    command("view.waveform", "Toggle waveform", G.view, () => { editorSettings.showWaveform = !editorSettings.showWaveform; }, { ...app, section: "show" }),
    command("view.keyframes", "Toggle keyframes", G.view, () => { editorSettings.showKeyframes = !editorSettings.showKeyframes; }, { ...app, section: "show" }),
    command("view.snap", "Toggle snap to keyframes", G.view, () => { editorSettings.snapToKeyframes = !editorSettings.snapToKeyframes; }, { ...app, section: "show" }),
    command("view.rotate", "Rotate 90°", G.view, (_g, set) => set(rotateAtom), { keys: ["r"], section: "rotate" }),

    // Tools
    command("tools.tracks", "Tracks...", G.tools, (_g, set) => set(isTracksDialogOpenAtom, true), { keys: ["t"], section: "tracks" }),
    command("tools.snapshot", "Capture frame", G.tools, (_g, set) => set(captureSnapshotAtom), { keys: ["c"], section: "tracks" }),
    command("tools.detectBlack", "Detect black scenes...", G.tools, (_g, set) => set(detectDialogKindAtom, DetectKind.black), { section: "detect" }),
    command("tools.detectSilence", "Detect silent parts...", G.tools, (_g, set) => set(detectDialogKindAtom, DetectKind.silence), { section: "detect" }),
    command("tools.detectScenes", "Detect scene changes...", G.tools, (_g, set) => set(detectDialogKindAtom, DetectKind.scene), { section: "detect" }),
    command("tools.mergeFiles", "Merge files...", G.tools, (get, set) => set(openMergeFilesDialogAtom, get(batchFilesAtom)), { ...app, section: "merge" }),

    // Help
    command("help.palette", "Command palette", G.help, (_g, set) => set(isCommandPaletteOpenAtom, true), { ...app, keys: ["ctrl+k", "ctrl+shift+p"] }),
    command("help.shortcuts", "Keyboard shortcuts", G.help, (_g, set) => set(isShortcutsDialogOpenAtom, true), { ...app, keys: ["?", "f1"] }),
    command("help.devtools", "Toggle developer tools", G.help, () => api.app.ToggleDevTools().catch(console.error), { ...app, keys: ["ctrl+shift+i", "f12"] }),
];

export const COMMANDS_BY_ID = new Map(COMMANDS.map((c) => [c.id, c]));
