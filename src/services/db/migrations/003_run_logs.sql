-- Add log_file_path column to job_runs table for tracking run logs
ALTER TABLE job_runs ADD COLUMN log_file_path TEXT;
