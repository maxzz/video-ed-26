import { useSnapshot } from "valtio";
import { editorSettings } from "@/store/3-editor-settings";
import { EDITOR_LAYOUTS, DEFAULT_LAYOUT_ID } from "./editor-layouts";

/** Renders the editor layout chosen in settings; layouts only arrange feature components. */
export function MainBody() {
    const { layoutId } = useSnapshot(editorSettings);
    const Layout = (EDITOR_LAYOUTS[layoutId] ?? EDITOR_LAYOUTS[DEFAULT_LAYOUT_ID]).component;
    return <Layout />;
}
