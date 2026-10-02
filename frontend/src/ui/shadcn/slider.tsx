import { type ComponentProps, useMemo } from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "@/utils/classnames";

export function Slider({ className, defaultValue, value, min = 0, max = 100, ...rest }: ComponentProps<typeof SliderPrimitive.Root>) {
    const values = useMemo(() => Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max], [value, defaultValue, min, max]);

    return (
        <SliderPrimitive.Root
            data-slot="slider"
            defaultValue={defaultValue}
            value={value}
            min={min}
            max={max}
            className={cn("relative w-full select-none data-disabled:opacity-50 touch-none flex items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col", className)}
            {...rest}
        >
            <SliderPrimitive.Track
                data-slot="slider-track"
                className="relative grow bg-muted data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1 rounded-full overflow-hidden"
            >
                <SliderPrimitive.Range data-slot="slider-range" className="absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full" />
            </SliderPrimitive.Track>

            {values.map((_, index) => (
                <SliderPrimitive.Thumb
                    data-slot="slider-thumb"
                    key={index}
                    className="shrink-0 block size-3 bg-background hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none transition-[color,box-shadow] border border-primary ring-ring/50 rounded-full shadow-sm"
                />
            ))}
        </SliderPrimitive.Root>
    );
}
