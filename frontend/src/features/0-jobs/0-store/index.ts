import { atom, getDefaultStore } from "jotai";
import { api, onJobUpdate, type Job } from "@/backend-api";
import { JobStatus, JobCanceledError } from "../9-types";

export { isJobCanceled, JobCanceledError, JobStatus } from "../9-types";

/** All backend jobs (export, preview, detection...) by id, kept in sync by the job:update event. */
export const jobsAtom = atom<Record<string, Job>>({});

export const jobListAtom = atom((get) => Object.values(get(jobsAtom)).reverse());

export const runningJobsAtom = atom((get) => get(jobListAtom).filter((j) => j.status === JobStatus.running));

export const cancelJobAtom = atom(null, (_get, _set, id: string) => {
    api.jobs.CancelJob(id).catch(console.error);
});

export const clearFinishedJobsAtom = atom(null, (get, set) => {
    const rv: Record<string, Job> = {};
    for (const job of Object.values(get(jobsAtom))) {
        if (job.status === JobStatus.running) {
            rv[job.id] = job;
        }
    }
    set(jobsAtom, rv);
});

//---------------------------------------------------------------------------

const waiters = new Map<string, (job: Job) => void>();
const finishedEarly = new Map<string, Job>(); // finished before anyone started waiting

function isFinished(job: Job) {
    return job.status !== JobStatus.running;
}

onJobUpdate((job) => {
    getDefaultStore().set(jobsAtom, (prev) => ({ ...prev, [job.id]: job }));

    if (isFinished(job)) {
        const resolve = waiters.get(job.id);
        if (resolve) {
            waiters.delete(job.id);
            resolve(job);
        } else {
            finishedEarly.set(job.id, job);
        }
    }
});

function waitForJob(id: string): Promise<Job> {
    const done = finishedEarly.get(id);
    if (done) {
        finishedEarly.delete(id);
        return Promise.resolve(done);
    }
    return new Promise((resolve) => waiters.set(id, resolve));
}

/**
 * Starts a backend job and resolves with its result.
 * Rejects with JobCanceledError when the user cancels it, or with the job error.
 */
export async function runJob<T>(start: () => Promise<string>): Promise<T> {
    const id = await start();
    const job = await waitForJob(id);
    if (job.status === JobStatus.done) {
        return job.result as T;
    }
    if (job.status === JobStatus.canceled) {
        throw new JobCanceledError();
    }
    throw new Error(job.error || "Job failed");
}
