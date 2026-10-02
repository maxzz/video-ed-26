import { useAtomValue, useSetAtom } from "jotai";
import { LoaderCircleIcon, ListChecksIcon, XIcon } from "lucide-react";
import { type Job } from "@/backend-api";
import { classNames } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import { cancelJobAtom, clearFinishedJobsAtom, jobListAtom, runningJobsAtom } from "../0-store";
import { JobStatus } from "../9-types";

export function JobsIndicator() {
    const jobs = useAtomValue(jobListAtom);
    const running = useAtomValue(runningJobsAtom);
    const clearFinished = useSetAtom(clearFinishedJobsAtom);

    if (!jobs.length) {
        return null;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button className="h-6 text-xs" variant="ghost" size="xs" title="Background tasks">
                    {running.length
                        ? <LoaderCircleIcon className="size-3.5 animate-spin" />
                        : <ListChecksIcon className="size-3.5" />
                    }
                    {running.length ? `${running.length} running` : "Tasks"}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="p-0 w-96" align="end" side="top">
                <div className="px-3 py-2 border-b flex items-center justify-between">
                    <span className="text-xs font-semibold">Background tasks</span>
                    <Button variant="ghost" size="xs" onClick={clearFinished}>
                        Clear finished
                    </Button>
                </div>

                <div className="max-h-80 overflow-y-auto flex flex-col">
                    {jobs.map((job) => <JobRow job={job} key={job.id} />)}
                </div>
            </PopoverContent>
        </Popover>
    );
}

function JobRow({ job }: { job: Job; }) {
    const cancel = useSetAtom(cancelJobAtom);
    const isRunning = job.status === JobStatus.running;

    return (
        <div className="px-3 py-2 border-b last:border-b-0 flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <span className="flex-1 text-xs truncate" title={job.title}>{job.title}</span>
                <span className={classNames("text-[10px] uppercase", statusColor(job.status))}>{job.status}</span>
                {isRunning && (
                    <Button className="size-5" variant="ghost" size="icon-xs" title="Cancel" onClick={() => cancel(job.id)}>
                        <XIcon />
                    </Button>
                )}
            </div>

            {isRunning && <ProgressBar value={job.progress} />}

            {job.error && (
                <div className="text-[10px] text-destructive line-clamp-3 break-all" title={job.error}>{job.error}</div>
            )}
        </div>
    );
}

export function ProgressBar({ value, className }: { value: number; className?: string; }) {
    return (
        <div className={classNames("h-1.5 bg-muted rounded-full overflow-hidden", className)}>
            <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
        </div>
    );
}

function statusColor(status: string) {
    return status === JobStatus.error ? "text-destructive"
        : status === JobStatus.done ? "text-green-600"
            : status === JobStatus.canceled ? "text-muted-foreground"
                : "text-primary";
}
