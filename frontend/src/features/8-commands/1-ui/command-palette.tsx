import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/ui/shadcn/command";
import { currentFileAtom } from "@/features/1-media-file/0-store";
import { COMMANDS, commandKeysAtom, formatKey, isCommandPaletteOpenAtom, runCommandAtom } from "../0-store";
import { CommandGroup as Groups } from "../9-types";

export function CommandPalette() {
    const [isOpen, setIsOpen] = useAtom(isCommandPaletteOpenAtom);
    const hasFile = !!useAtomValue(currentFileAtom);
    const keys = useAtomValue(commandKeysAtom);
    const run = useSetAtom(runCommandAtom);

    const available = COMMANDS.filter((c) => !c.needsFile || hasFile);

    return (
        <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
            <Command>
                <CommandInput placeholder="Type a command..." />
                <CommandList>
                    <CommandEmpty>No matching commands.</CommandEmpty>
                    {Object.values(Groups).map((group) => {
                        const items = available.filter((c) => c.group === group);
                        return !!items.length && (
                            <CommandGroup heading={group} key={group}>
                                {items.map((cmd) => (
                                    <CommandItem
                                        className="text-xs"
                                        value={`${group} ${cmd.title}`}
                                        onSelect={() => {
                                            setIsOpen(false);
                                            requestAnimationFrame(() => run(cmd.id)); // after the palette closes, so dialogs it opens get focus
                                        }}
                                        key={cmd.id}
                                    >
                                        {cmd.title}
                                        {keys.get(cmd.id)?.[0] && <CommandShortcut>{formatKey(keys.get(cmd.id)![0])}</CommandShortcut>}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        );
                    })}
                </CommandList>
            </Command>
        </CommandDialog>
    );
}
