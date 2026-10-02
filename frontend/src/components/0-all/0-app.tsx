import { Toaster } from '@/ui/shadcn/sonner';
import { AllDialogs } from './1-globals';
import { AppPages } from '../5-welcome';
import { Header } from '../1-header';
import { MainBody } from '../2-main';

export function App() {
    return (<>
        <Toaster />
        <AllDialogs />

        <AppPages>
            <main className="h-dvh text-xs bg-background overflow-hidden grid grid-rows-[auto_1fr]">
                <Header />
                <MainBody />
            </main>
        </AppPages>
    </>);
}
