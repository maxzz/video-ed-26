package ffrun

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"video-ed-26/backend/appctx"
)

// EventJobUpdate is emitted with a Job every time a job starts, progresses or finishes.
const EventJobUpdate = "job:update"

const (
	JobRunning  = "running"
	JobDone     = "done"
	JobError    = "error"
	JobCanceled = "canceled"
)

type Job struct {
	ID       string      `json:"id"`
	Kind     string      `json:"kind"`
	Title    string      `json:"title"`
	Status   string      `json:"status"`
	Progress float64     `json:"progress"`
	Error    string      `json:"error"`
	Result   interface{} `json:"result"`
}

// Report sets the job progress as a 0..1 fraction.
type Report func(progress float64)

type JobFunc func(ctx context.Context, report Report) (interface{}, error)

type jobEntry struct {
	job      Job
	cancel   context.CancelFunc
	lastEmit time.Time
}

type Jobs struct {
	hold    *appctx.Holder
	mu      sync.Mutex
	entries map[string]*jobEntry
	counter atomic.Int64
}

func NewJobs(hold *appctx.Holder) *Jobs {
	return &Jobs{hold: hold, entries: map[string]*jobEntry{}}
}

// Start runs fn in the background and returns the job id immediately.
func (j *Jobs) Start(kind, title string, fn JobFunc) string {
	id := fmt.Sprintf("%s-%d-%d", kind, time.Now().UnixMilli(), j.counter.Add(1))
	ctx, cancel := context.WithCancel(context.Background())

	e := &jobEntry{job: Job{ID: id, Kind: kind, Title: title, Status: JobRunning}, cancel: cancel}
	j.mu.Lock()
	j.entries[id] = e
	j.mu.Unlock()
	j.emit(e, true)

	go func() {
		defer cancel()
		result, err := fn(ctx, func(p float64) { j.progress(e, p) })

		j.mu.Lock()
		switch {
		case errors.Is(err, context.Canceled) || ctx.Err() != nil:
			e.job.Status = JobCanceled
		case err != nil:
			e.job.Status = JobError
			e.job.Error = err.Error()
		default:
			e.job.Status = JobDone
			e.job.Progress = 1
			e.job.Result = result
		}
		j.mu.Unlock()
		j.emit(e, true)
	}()

	return id
}

func (j *Jobs) Cancel(id string) {
	j.mu.Lock()
	e := j.entries[id]
	j.mu.Unlock()
	if e != nil {
		e.cancel()
	}
}

func (j *Jobs) List() []Job {
	j.mu.Lock()
	defer j.mu.Unlock()
	rv := make([]Job, 0, len(j.entries))
	for _, e := range j.entries {
		rv = append(rv, e.job)
	}
	return rv
}

func (j *Jobs) progress(e *jobEntry, p float64) {
	j.mu.Lock()
	changed := p-e.job.Progress >= 0.005 || p < e.job.Progress
	e.job.Progress = p
	j.mu.Unlock()
	if changed {
		j.emit(e, false)
	}
}

func (j *Jobs) emit(e *jobEntry, force bool) {
	j.mu.Lock()
	if !force && time.Since(e.lastEmit) < 100*time.Millisecond {
		j.mu.Unlock()
		return
	}
	e.lastEmit = time.Now()
	snapshot := e.job
	j.mu.Unlock()
	j.hold.Emit(EventJobUpdate, snapshot)
}

//---------------------------------------------------------------------------

// JobsService is bound to the frontend.
type JobsService struct {
	jobs *Jobs
}

func NewJobsService(jobs *Jobs) *JobsService {
	return &JobsService{jobs: jobs}
}

func (s *JobsService) CancelJob(id string) {
	s.jobs.Cancel(id)
}

func (s *JobsService) ListJobs() []Job {
	return s.jobs.List()
}
