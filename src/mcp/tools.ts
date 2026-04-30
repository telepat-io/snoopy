import { z } from 'zod';

export const snoopyDoctorToolInputSchema = {};

export const snoopyDaemonStatusToolInputSchema = {};

export const snoopyDaemonStartToolInputSchema = {};

export const snoopyDaemonStopToolInputSchema = {};

export const snoopyDaemonReloadToolInputSchema = {};

export const snoopyJobListToolInputSchema = {};

export const snoopyJobRunsToolInputSchema = {
  jobRef: z.string().optional().describe('Job ID or slug. If omitted, returns runs for all jobs.'),
  limit: z.coerce.number().int().positive().optional().describe('Max runs to return. Default: 20.'),
};

export const snoopyJobAddToolInputSchema = {
  name: z.string().min(1).describe('Job name.'),
  description: z.string().optional().describe('Job description. Default: empty.'),
  subreddits: z.array(z.string()).min(1).describe('Subreddits to monitor (e.g. ["startups","SaaS"]).'),
  qualificationPrompt: z.string().min(1).describe('Plain-language criteria for qualifying posts/comments.'),
  scheduleCron: z.string().optional().describe('Cron expression. Default: "*/30 * * * *" (every 30 min).'),
  enabled: z.boolean().optional().describe('Enable scheduling immediately. Default: true.'),
  monitorComments: z.boolean().optional().describe('Also monitor comments. Default: true.'),
};

export const snoopyJobDeleteToolInputSchema = {
  jobRef: z.string().min(1).describe('Job ID or slug to delete.'),
};

export const snoopyJobEnableToolInputSchema = {
  jobRef: z.string().min(1).describe('Job ID or slug to enable.'),
};

export const snoopyJobDisableToolInputSchema = {
  jobRef: z.string().min(1).describe('Job ID or slug to disable.'),
};

export const snoopyJobRunToolInputSchema = {
  jobRef: z.string().min(1).describe('Job ID or slug to run immediately.'),
  limit: z.coerce.number().int().positive().optional().describe('Max new items to qualify.'),
};

export const snoopyAnalyticsToolInputSchema = {
  jobRef: z.string().optional().describe('Job ID or slug. If omitted, returns analytics for all jobs.'),
  days: z.coerce.number().int().positive().optional().describe('Lookback window in days. Default: 30.'),
};

export const snoopyExportToolInputSchema = {
  jobRef: z.string().optional().describe('Job ID or slug. If omitted, exports all jobs.'),
  format: z.enum(['json', 'csv']).optional().describe('Export format. Default: "json".'),
  lastRun: z.boolean().optional().describe('Only export items from the latest run.'),
  limit: z.coerce.number().int().positive().optional().describe('Max rows per job. Default: 100.'),
};

export const snoopyConsumeToolInputSchema = {
  jobRef: z.string().optional().describe('Job ID or slug. If omitted, applies to all jobs.'),
  limit: z.coerce.number().int().positive().optional().describe('Max results to consume.'),
  dryRun: z.boolean().optional().describe('Preview without marking consumed.'),
};

export const snoopyErrorsToolInputSchema = {
  jobRef: z.string().min(1).describe('Job ID or slug.'),
  hours: z.coerce.number().int().positive().optional().describe('Look back hours. Default: 24.'),
};

export const snoopyLogsToolInputSchema = {
  runId: z.string().min(1).describe('Run ID to view logs for.'),
};

export const snoopySettingsGetToolInputSchema = {};

export const snoopySettingsSetToolInputSchema = {
  key: z.enum([
    'model',
    'temperature',
    'maxTokens',
    'topP',
    'cronIntervalMinutes',
    'jobTimeoutMs',
    'notificationsEnabled',
  ]).describe('Setting key to update.'),
  value: z.string().describe('New value for the setting.'),
};

export interface ToolContract {
  name: string;
  required: string[];
  enums: Record<string, string[]>;
}

export const snoopyToolContracts: ToolContract[] = [
  { name: 'snoopy_doctor', required: [], enums: {} },
  { name: 'snoopy_daemon_status', required: [], enums: {} },
  { name: 'snoopy_daemon_start', required: [], enums: {} },
  { name: 'snoopy_daemon_stop', required: [], enums: {} },
  { name: 'snoopy_daemon_reload', required: [], enums: {} },
  { name: 'snoopy_job_list', required: [], enums: {} },
  { name: 'snoopy_job_runs', required: [], enums: {} },
  { name: 'snoopy_job_add', required: ['name', 'subreddits', 'qualificationPrompt'], enums: {} },
  { name: 'snoopy_job_delete', required: ['jobRef'], enums: {} },
  { name: 'snoopy_job_enable', required: ['jobRef'], enums: {} },
  { name: 'snoopy_job_disable', required: ['jobRef'], enums: {} },
  { name: 'snoopy_job_run', required: ['jobRef'], enums: {} },
  { name: 'snoopy_analytics', required: [], enums: {} },
  { name: 'snoopy_export', required: [], enums: { format: ['json', 'csv'] } },
  { name: 'snoopy_consume', required: [], enums: {} },
  { name: 'snoopy_errors', required: ['jobRef'], enums: {} },
  { name: 'snoopy_logs', required: ['runId'], enums: {} },
  { name: 'snoopy_settings_get', required: [], enums: {} },
  { name: 'snoopy_settings_set', required: ['key', 'value'], enums: { key: ['model', 'temperature', 'maxTokens', 'topP', 'cronIntervalMinutes', 'jobTimeoutMs', 'notificationsEnabled'] } },
];
