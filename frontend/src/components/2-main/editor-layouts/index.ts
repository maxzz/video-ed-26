import { type ComponentType } from "react";
import { LosslessCutLayout } from "./lossless-cut";

export type EditorLayout = {
    title: string;
    component: ComponentType;
};

/** Available editor layouts; add a folder next to lossless-cut and register it here. */
export const EDITOR_LAYOUTS: Record<string, EditorLayout> = {
    "lossless-cut": { title: "LosslessCut", component: LosslessCutLayout },
};

export const DEFAULT_LAYOUT_ID = "lossless-cut";
