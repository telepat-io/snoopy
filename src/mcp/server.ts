import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  snoopyDoctorToolInputSchema,
  snoopyDaemonStatusToolInputSchema,
  snoopyDaemonStartToolInputSchema,
  snoopyDaemonStopToolInputSchema,
  snoopyDaemonReloadToolInputSchema,
  snoopyJobListToolInputSchema,
  snoopyJobRunsToolInputSchema,
  snoopyJobAddToolInputSchema,
  snoopyJobDeleteToolInputSchema,
  snoopyJobEnableToolInputSchema,
  snoopyJobDisableToolInputSchema,
  snoopyJobRunToolInputSchema,
  snoopyAnalyticsToolInputSchema,
  snoopyExportToolInputSchema,
  snoopyConsumeToolInputSchema,
  snoopyErrorsToolInputSchema,
  snoopyLogsToolInputSchema,
  snoopySettingsGetToolInputSchema,
  snoopySettingsSetToolInputSchema,
} from './tools.js';
import {
  getSnoopyVersion,
  formatToolError,
  formatToolResult,
  buildDoctorReport,
  buildDaemonStatusReport,
  startDaemonReport,
  stopDaemonReport,
  reloadDaemonReport,
  listJobsReport,
  listJobRunsReport,
  addJobReport,
  deleteJobReport,
  enableJobReport,
  disableJobReport,
  runJobReport,
  analyticsReport,
  exportReport,
  consumeReport,
  errorsReport,
  logsReport,
  settingsGetReport,
  settingsSetReport,
} from './helpers.js';

export async function startSnoopyMcpServer(): Promise<void> {
  const version = getSnoopyVersion();
  const server = new McpServer({ name: 'snoopy', version });

  // --- snoopy_doctor ---
  server.registerTool('snoopy_doctor', {
    title: 'Health Check',
    description: 'Run full system health check: database, API key, daemon, jobs, startup, recent errors.',
    inputSchema: snoopyDoctorToolInputSchema,
  }, async () => {
    try {
      const report = await buildDoctorReport();
      return formatToolResult(report);
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_daemon_status ---
  server.registerTool('snoopy_daemon_status', {
    title: 'Daemon Status',
    description: 'Show whether the Snoopy daemon is running and its PID.',
    inputSchema: snoopyDaemonStatusToolInputSchema,
  }, () => {
    try {
      return formatToolResult(buildDaemonStatusReport());
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_daemon_start ---
  server.registerTool('snoopy_daemon_start', {
    title: 'Start Daemon',
    description: 'Start the Snoopy background daemon.',
    inputSchema: snoopyDaemonStartToolInputSchema,
  }, () => {
    try {
      return formatToolResult(startDaemonReport());
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_daemon_stop ---
  server.registerTool('snoopy_daemon_stop', {
    title: 'Stop Daemon',
    description: 'Stop the Snoopy background daemon.',
    inputSchema: snoopyDaemonStopToolInputSchema,
  }, () => {
    try {
      return formatToolResult(stopDaemonReport());
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_daemon_reload ---
  server.registerTool('snoopy_daemon_reload', {
    title: 'Reload Daemon',
    description: 'Hot-reload daemon job schedules without restart.',
    inputSchema: snoopyDaemonReloadToolInputSchema,
  }, () => {
    try {
      return formatToolResult(reloadDaemonReport());
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_job_list ---
  server.registerTool('snoopy_job_list', {
    title: 'List Jobs',
    description: 'List all monitoring jobs with their state, subreddits, and schedule.',
    inputSchema: snoopyJobListToolInputSchema,
  }, () => {
    try {
      return formatToolResult(listJobsReport());
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_job_runs ---
  server.registerTool('snoopy_job_runs', {
    title: 'Job Run History',
    description: 'List recent run history for a job or all jobs.',
    inputSchema: snoopyJobRunsToolInputSchema,
  }, (input) => {
    try {
      return formatToolResult(listJobRunsReport(input.jobRef, input.limit));
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_job_add ---
  server.registerTool('snoopy_job_add', {
    title: 'Add Job',
    description: 'Create a new monitoring job with subreddits and qualification prompt.',
    inputSchema: snoopyJobAddToolInputSchema,
  }, (input) => {
    try {
      return formatToolResult(addJobReport(input));
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_job_delete ---
  server.registerTool('snoopy_job_delete', {
    title: 'Delete Job',
    description: 'Delete a job and all its runs, scan items, and log files.',
    inputSchema: snoopyJobDeleteToolInputSchema,
  }, (input) => {
    try {
      return formatToolResult(deleteJobReport(input.jobRef));
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_job_enable ---
  server.registerTool('snoopy_job_enable', {
    title: 'Enable Job',
    description: 'Enable scheduling for a monitoring job.',
    inputSchema: snoopyJobEnableToolInputSchema,
  }, (input) => {
    try {
      return formatToolResult(enableJobReport(input.jobRef));
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_job_disable ---
  server.registerTool('snoopy_job_disable', {
    title: 'Disable Job',
    description: 'Disable scheduling for a monitoring job.',
    inputSchema: snoopyJobDisableToolInputSchema,
  }, (input) => {
    try {
      return formatToolResult(disableJobReport(input.jobRef));
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_job_run ---
  server.registerTool('snoopy_job_run', {
    title: 'Run Job Now',
    description: 'Trigger an immediate run for a monitoring job.',
    inputSchema: snoopyJobRunToolInputSchema,
  }, (input) => {
    try {
      return formatToolResult(runJobReport(input.jobRef, input.limit));
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_analytics ---
  server.registerTool('snoopy_analytics', {
    title: 'Analytics',
    description: 'Show analytics for all jobs or a single job (tokens, cost, posts, comments).',
    inputSchema: snoopyAnalyticsToolInputSchema,
  }, (input) => {
    try {
      return formatToolResult(analyticsReport(input.jobRef, input.days));
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_export ---
  server.registerTool('snoopy_export', {
    title: 'Export Results',
    description: 'Export qualified scan items as JSON or CSV for downstream processing.',
    inputSchema: snoopyExportToolInputSchema,
  }, (input) => {
    try {
      return formatToolResult(exportReport(input.jobRef, input.format, input.lastRun, input.limit));
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_consume ---
  server.registerTool('snoopy_consume', {
    title: 'Consume Results',
    description: 'List and mark unconsumed qualified results as consumed.',
    inputSchema: snoopyConsumeToolInputSchema,
  }, (input) => {
    try {
      return formatToolResult(consumeReport(input.jobRef, input.limit, input.dryRun));
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_errors ---
  server.registerTool('snoopy_errors', {
    title: 'Recent Errors',
    description: 'Show recent failed or errored runs for a job.',
    inputSchema: snoopyErrorsToolInputSchema,
  }, (input) => {
    try {
      return formatToolResult(errorsReport(input.jobRef, input.hours));
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_logs ---
  server.registerTool('snoopy_logs', {
    title: 'Run Logs',
    description: 'View the log output for a specific run.',
    inputSchema: snoopyLogsToolInputSchema,
  }, (input) => {
    try {
      return formatToolResult(logsReport(input.runId));
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_settings_get ---
  server.registerTool('snoopy_settings_get', {
    title: 'Get Settings',
    description: 'Read current Snoopy settings (model, API key status, schedule, notifications).',
    inputSchema: snoopySettingsGetToolInputSchema,
  }, async () => {
    try {
      const report = await settingsGetReport();
      return formatToolResult(report);
    } catch (error) {
      return formatToolError(error);
    }
  });

  // --- snoopy_settings_set ---
  server.registerTool('snoopy_settings_set', {
    title: 'Update Setting',
    description: 'Update a single Snoopy setting.',
    inputSchema: snoopySettingsSetToolInputSchema,
  }, (input) => {
    try {
      return formatToolResult(settingsSetReport(input.key, input.value));
    } catch (error) {
      return formatToolError(error);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
