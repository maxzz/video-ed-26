import { ConfirmationDialog } from "@/components/4-dialogs/8-1-confirmation/0-confirmation-dialog";
import { OptionsDialog } from "@/components/4-dialogs/8-3-options/0-options-dialog";
import { EditorDialogs } from "@/components/2-main/editor-dialogs";

export function AllDialogs() {
    return (<>
        <ConfirmationDialog />
        <OptionsDialog />
        <EditorDialogs />
    </>);
}
