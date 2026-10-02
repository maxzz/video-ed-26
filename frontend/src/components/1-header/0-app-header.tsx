import { useSetAtom } from "jotai";
import { MainPage, APP_NAME, navigateToPageAtom } from "@/components/5-welcome/a-ui-app-page";
import { AppLogo } from "@/components/5-welcome/2-app-logo";
import { AppMenu } from "@/features/8-commands";
import { ButtonOptions } from "./7-btn-options";
import { ButtonThemeToggle } from "./8-btn-theme-toggle";

export function Header() {
    const navigate = useSetAtom(navigateToPageAtom);

    return (
        <header className="px-3 py-1 bg-background border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                <button
                    className="-ml-1 px-1 py-0.5 text-sm font-semibold hover:bg-muted rounded flex items-center gap-2 cursor-pointer"
                    onClick={() => navigate(MainPage.welcome)}
                    title="Show the Welcome page"
                    type="button"
                >
                    <AppLogo className="size-5" />
                    {APP_NAME}
                </button>

                <AppMenu />
            </div>

            <div className="flex items-center gap-2">
                <ButtonOptions />
                <ButtonThemeToggle />
            </div>
        </header>
    );
}
