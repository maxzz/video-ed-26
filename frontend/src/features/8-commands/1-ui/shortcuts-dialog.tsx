import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { XIcon } from "lucide-react";
import { classNames } from "@/utils";
import { editorSettings } from "@/store/3-editor-settings";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import {
    COMMANDS, commandKeysAtom, formatKey, isShortcutsDialogOpenAtom, keyFromEvent, keyToCommandAtom, recordingKeyForAtom, resetAllKeysAtom, setCommandKeysAtom,
} from "../0-store";
import { CommandGroup, type Command } from "../9-types";

/** Lists all commands and lets the user change their keys, like LosslessCut's keyboard shortcuts screen. */
export function ShortcutsDialog() {
    const [isOpen, setIsOpen] = useAtom(isShortcutsDialogOpenAtom);
    const resetAll = useSetAtom(resetAllKeysAtom);
    const setRecording = useSetAtom(recordingKeyForAtom);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); !open && setRecording(null); }}>
            <DialogContent className="max-w-2xl! gap-0! p-0!">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm">Keyboard shortcuts</DialogTitle>
                    <DialogDescription className="text-xs">
                        Click a shortcut to record a new key; it is added to the existing keys. Esc cancels recording.{" "}
                        <button className="underline cursor-pointer" onClick={resetAll} type="button">Reset all to defaults</button>
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-2 max-h-[65vh] text-xs overflow-y-auto">
                    {Object.values(CommandGroup).map((group) => (
                        <div className="mb-3" key={group}>
                            <div className="mb-1 font-semibold">{group}</div>
                            {COMMANDS.filter((c) => c.group === group).map((cmd) => <ShortcutRow command={cmd} key={cmd.id} />)}
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ShortcutRow({ command }: { command: Command; }) {
    const keys = useAtomValue(commandKeysAtom).get(command.id) ?? [];
    const keyToCommand = useAtomValue(keyToCommandAtom);
    const [recording, setRecording] = useAtom(recordingKeyForAtom);
    const setKeys = useSetAtom(setCommandKeysAtom);
    const { keyBindings } = useSnapshot(editorSettings);
    const isRecording = recording === command.id;
    const isCustom = !!keyBindings[command.id];

    return (
        <div className="py-0.5 border-b border-border/50 flex items-center gap-2">
            <span className="flex-1">{command.title}</span>

            {keys.map((k) => (
                <span
                    className={classNames("px-1.5 py-0.5 font-mono bg-muted rounded flex items-center gap-1", keyToCommand.get(k) !== command.id && "line-through opacity-50")}
                    title={keyToCommand.get(k) !== command.id ? "Used by another command" : undefined}
                    key={k}
                >
                    {formatKey(k)}
                    <button className="opacity-50 hover:opacity-100 cursor-pointer" title="Remove" onClick={() => setKeys(command.id, keys.filter((x) => x !== k))} type="button">
                        <XIcon className="size-3" />
                    </button>
                </span>
            ))}

            <Button
                className={classNames("w-24 h-6 text-[11px]", isRecording && "ring-2 ring-primary")}
                variant="outline"
                size="xs"
                onClick={() => setRecording(isRecording ? null : command.id)}
                onKeyDown={(e) => {
                    if (!isRecording) {
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.key === "Escape") {
                        setRecording(null);
                        return;
                    }
                    const key = keyFromEvent(e.nativeEvent);
                    if (key) {
                        setKeys(command.id, [...new Set([...keys, key])]);
                        setRecording(null);
                    }
                }}
            >
                {isRecording ? "Press a key..." : "Add key"}
            </Button>

            <Button className="w-14 h-6 text-[11px]" variant="ghost" size="xs" disabled={!isCustom} onClick={() => setKeys(command.id, null)}>
                Default
            </Button>
        </div>
    );
}
