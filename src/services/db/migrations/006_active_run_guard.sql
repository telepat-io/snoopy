-- Prevent overlapping runs for the same job, even across different processes.
CREATE UNIQUE INDEX
IF NOT EXISTS idx_job_runs_active_job
  ON job_runs
(job_id)
  WHERE status = 'running';
