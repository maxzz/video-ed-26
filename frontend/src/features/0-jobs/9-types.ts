/** Must match the job statuses in backend/ffrun/jobs.go */
export const JobStatus = {
    running: "running",
    done: "done",
    error: "error",
    canceled: "canceled",
} as const;

export type JobStatus = typeof JobStatus[keyof typeof JobStatus];

export class JobCanceledError extends Error {
    constructor() {
        super("Canceled");
        this.name = "JobCanceledError";
    }
}

export function isJobCanceled(error: unknown): boolean {
    return error instanceof JobCanceledError;
}
