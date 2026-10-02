import { atom, type Getter, type Setter, type WritableAtom } from "jotai";

export const CommandGroup = {
    file: "File",
    edit: "Edit",
    segments: "Segments",
    playback: "Playback",
    view: "View",
    tools: "Tools",
    help: "Help",
} as const;

export type CommandGroup = typeof CommandGroup[keyof typeof CommandGroup];

export type Command = {
    id: string;
    title: string;
    group: CommandGroup;
    section?: string;          // items with the same section are kept together in menus
    keys: string[];            // default shortcuts, normalized (see 3-keys.ts)
    needsFile: boolean;
    hidden?: boolean;          // not shown in menus, only in the palette and shortcuts
    action: WritableAtom<null, [], unknown>;
};

type CommandOptions = { keys?: string[]; needsFile?: boolean; section?: string; hidden?: boolean; };

/** Defines a command whose action is a write-only atom. */
export function command(id: string, title: string, group: CommandGroup, write: (get: Getter, set: Setter) => unknown, options: CommandOptions = {}): Command {
    return {
        id,
        title,
        group,
        section: options.section,
        keys: options.keys ?? [],
        needsFile: options.needsFile ?? true,
        hidden: options.hidden,
        action: atom(null, (get, set) => write(get, set)),
    };
}
