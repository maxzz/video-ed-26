import { useState } from "react";
import { cn } from "@/utils/classnames";
import { formatTime, parseTime } from "@/utils/time-format";

type TimeInputProps = {
    value: number;
    onCommit: (seconds: number) => void;
    className?: string;
    title?: string;
};

/** Shows a time; while focused it keeps the typed text, and Enter or blur commits a valid time. */
export function TimeInput({ value, onCommit, className, title }: TimeInputProps) {
    const [draft, setDraft] = useState<string | null>(null);

    function commit() {
        const t = draft === null ? undefined : parseTime(draft);
        if (t !== undefined && Math.abs(t - value) > 1e-4) {
            onCommit(t);
        }
        setDraft(null);
    }

    return (
        <input
            className={cn("px-1 h-6 font-mono tabular-nums bg-transparent hover:bg-muted focus:bg-muted border border-transparent focus:border-border rounded outline-none", className)}
            value={draft ?? formatTime(value)}
            title={title ?? "Type a time (1:23.5, 83.5) and press Enter"}
            onFocus={(e) => {
                setDraft(formatTime(value));
                e.currentTarget.select();
            }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.currentTarget.blur();
                } else if (e.key === "Escape") {
                    setDraft(null);
                    requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
                }
            }}
            spellCheck={false}
        />
    );
}
