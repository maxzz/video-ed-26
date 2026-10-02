/**
 * Key strings are lower-case, modifiers first in the order ctrl, alt, shift: "ctrl+shift+z", "space", "arrowleft".
 * Shift is dropped for printable symbols ("plus", "?") because it is part of typing them; "+" itself is "plus".
 */

const MODIFIER_KEYS = new Set(["control", "shift", "alt", "meta", "altgraph", "capslock"]);

export function keyFromEvent(e: KeyboardEvent): string | undefined {
    const raw = e.key;
    if (!raw || MODIFIER_KEYS.has(raw.toLowerCase())) {
        return undefined;
    }
    const name = raw === " " ? "space" : raw === "+" ? "plus" : raw.toLowerCase();
    const isSymbol = raw.length === 1 && !/[a-z0-9 ]/i.test(raw);

    const parts: string[] = [];
    (e.ctrlKey || e.metaKey) && parts.push("ctrl");
    e.altKey && parts.push("alt");
    e.shiftKey && !isSymbol && parts.push("shift");
    parts.push(name);
    return parts.join("+");
}

const DISPLAY: Record<string, string> = {
    ctrl: "Ctrl", alt: "Alt", shift: "Shift", space: "Space", plus: "+",
    arrowleft: "←", arrowright: "→", arrowup: "↑", arrowdown: "↓",
    backspace: "Backspace", delete: "Del", escape: "Esc", enter: "Enter", home: "Home", end: "End",
    pageup: "PgUp", pagedown: "PgDn", tab: "Tab",
};

export function formatKey(key: string): string {
    return key.split("+").map((p) => DISPLAY[p] ?? (p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1))).join("+");
}

export function isEditableTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el || !el.tagName) {
        return false;
    }
    if (el.isContentEditable) {
        return true;
    }
    if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
        return true;
    }
    if (el.tagName === "INPUT") {
        const type = (el as HTMLInputElement).type;
        return !["checkbox", "radio", "button", "range"].includes(type);
    }
    return false;
}
