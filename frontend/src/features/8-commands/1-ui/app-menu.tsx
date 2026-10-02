import { Fragment } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from "@/ui/shadcn/menubar";
import { currentFileAtom } from "@/features/1-media-file/0-store";
import { COMMANDS, commandKeysAtom, formatKey, runCommandAtom } from "../0-store";
import { CommandGroup, type Command } from "../9-types";

const MENU_GROUPS = [CommandGroup.file, CommandGroup.edit, CommandGroup.segments, CommandGroup.playback, CommandGroup.view, CommandGroup.tools, CommandGroup.help];

/** Group -> sections -> commands, in definition order. */
const MENUS = MENU_GROUPS.map((group) => {
    const sections: Command[][] = [];
    let lastSection: string | undefined;
    for (const cmd of COMMANDS.filter((c) => c.group === group && !c.hidden)) {
        if (!sections.length || cmd.section !== lastSection) {
            sections.push([]);
        }
        sections[sections.length - 1].push(cmd);
        lastSection = cmd.section;
    }
    return { group, sections };
});

export function AppMenu() {
    return (
        <Menubar className="h-7 border-none shadow-none bg-transparent">
            {MENUS.map(({ group, sections }) => (
                <MenubarMenu key={group}>
                    <MenubarTrigger className="px-2 py-0.5 text-xs font-normal">{group}</MenubarTrigger>
                    <MenubarContent className="min-w-64">
                        {sections.map((section, i) => (
                            <Fragment key={i}>
                                {i > 0 && <MenubarSeparator />}
                                {section.map((cmd) => <CommandMenuItem command={cmd} key={cmd.id} />)}
                            </Fragment>
                        ))}
                    </MenubarContent>
                </MenubarMenu>
            ))}
        </Menubar>
    );
}

function CommandMenuItem({ command }: { command: Command; }) {
    const hasFile = !!useAtomValue(currentFileAtom);
    const keys = useAtomValue(commandKeysAtom).get(command.id) ?? [];
    const run = useSetAtom(runCommandAtom);

    return (
        <MenubarItem className="text-xs" disabled={command.needsFile && !hasFile} onSelect={() => run(command.id)}>
            {command.title}
            {keys[0] && <MenubarShortcut>{formatKey(keys[0])}</MenubarShortcut>}
        </MenubarItem>
    );
}
