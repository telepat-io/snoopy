import { JobsRepository } from '../../services/db/repositories/jobsRepo.js';
import { AnalyticsService, type AnalyticsRunView, type DerivedAnalyticsMetrics } from '../../services/analytics/analyticsService.js';
import {
  printCommandScreen,
  printError,
  printInfo,
  printKeyValue,
  printMuted,
  printSection,
  printWarning
} from '../ui/consoleUi.js';
import { formatRunDisplayTimestamp } from '../ui/time.js';

function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatFloat(value: number, digits = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

function formatUsd(value: number): string {
  return `$${value.toFixed(6)} (est.)`;
}

function formatMaybe(value: number | null, digits = 2): string {
  if (value === null) {
    return '-';
  }

  return formatFloat(value, digits);
}

function printMetricsBlock(metrics: DerivedAnalyticsMetrics): void {
  printKeyValue('New posts scanned', formatInteger(metrics.newPosts));
  printKeyValue('New comments scanned', formatInteger(metrics.newComments));
  printKeyValue('Prompt tokens', formatInteger(metrics.promptTokens));
  printKeyValue('Completion tokens', formatInteger(metrics.completionTokens));
  printKeyValue('Total tokens', formatInteger(metrics.totalTokens));
  printKeyValue('Estimated cost', formatUsd(metrics.estimatedCostUsd));
  printKeyValue('Avg posts/day', formatFloat(metrics.avgNewPostsPerDay));
  printKeyValue('Avg comments/day', formatFloat(metrics.avgNewCommentsPerDay));
  printKeyValue('Avg tokens/day', formatFloat(metrics.avgTotalTokensPerDay));
  printKeyValue('Avg cost/day', formatUsd(metrics.avgEstimatedCostUsdPerDay));
  printKeyValue('Tokens per post', formatMaybe(metrics.tokensPerPost));
  printKeyValue('Cost per post', metrics.costPerPost === null ? '-' : formatUsd(metrics.costPerPost));
}

function printRunCard(run: AnalyticsRunView): void {
  printInfo(`${formatRunDisplayTimestamp(run)} ${run.jobName ?? run.jobId}`);
  printKeyValue('Run ID', run.id);
  printKeyValue('Status', run.status);
  printKeyValue('Duration', run.durationSeconds === null ? '-' : `${run.durationSeconds}s`);
  printKeyValue('New posts', formatInteger(run.newPosts));
  printKeyValue('New comments', formatInteger(run.newComments));
  printKeyValue('Prompt tokens', formatInteger(run.promptTokens));
  printKeyValue('Completion tokens', formatInteger(run.completionTokens));
  printKeyValue('Total tokens', formatInteger(run.totalTokens));
  printKeyValue('Estimated cost', run.estimatedCostUsd === null ? '-' : formatUsd(run.estimatedCostUsd));
  printKeyValue('Tokens per post', formatMaybe(run.tokensPerPost));
  printKeyValue('Cost per post', run.costPerPost === null ? '-' : formatUsd(run.costPerPost));
  printKeyValue('Log', run.logFilePath ?? '-');
  if (run.message) {
    printWarning(`Message: ${run.message}`);
  }
}

export function showAnalytics(jobRef?: string, options: { days?: number } = {}): void {
  const days = options.days ?? 30;
  const jobsRepo = new JobsRepository();
  const analyticsService = new AnalyticsService();

  printCommandScreen('Analytics');

  if (jobRef) {
    const job = jobsRepo.getByRef(jobRef);
    if (!job) {
      printError(`Job not found: ${jobRef}`);
      return;
    }

    const view = analyticsService.getJobAnalytics(job.id, { days });

    printSection(`Job Analytics: ${job.name} (${job.slug})`);
    printKeyValue('Window', `Last ${view.windowDays} day(s)`);
    printKeyValue('Runs in window', formatInteger(view.runCount));
    printMetricsBlock(view.totals);

    printSection('Subreddit Breakdown');
    if (view.bySubreddit.length === 0) {
      printWarning('No subreddit analytics yet for this job in the selected window.');
    } else {
      view.bySubreddit.forEach((row) => {
        printInfo(`r/${row.subreddit}`);
        printKeyValue('New posts/comments', `${formatInteger(row.newPosts)}/${formatInteger(row.newComments)}`);
        printKeyValue('Total tokens', formatInteger(row.metrics.totalTokens));
        printKeyValue('Estimated cost', formatUsd(row.metrics.estimatedCostUsd));
        printKeyValue('Avg posts/comments per day', `${formatFloat(row.metrics.avgNewPostsPerDay)}/${formatFloat(row.metrics.avgNewCommentsPerDay)}`);
        printKeyValue('Avg tokens/day', formatFloat(row.metrics.avgTotalTokensPerDay));
        printKeyValue('Avg cost/day', formatUsd(row.metrics.avgEstimatedCostUsdPerDay));
      });
    }

    printSection('Recent Runs');
    if (view.recentRuns.length === 0) {
      printWarning('No runs found in the selected window.');
      return;
    }

    view.recentRuns.forEach((run, index) => {
      printRunCard(run);
      if (index < view.recentRuns.length - 1) {
        printMuted('');
      }
    });
    return;
  }

  const view = analyticsService.getGlobalAnalytics({ days });

  printSection('System Analytics');
  printKeyValue('Window', `Last ${view.windowDays} day(s)`);
  printKeyValue('Runs in window', formatInteger(view.runCount));
  printMetricsBlock(view.totals);

  printSection('Job Breakdown');
  if (view.byJob.length === 0) {
    printWarning('No job analytics yet in the selected window.');
  } else {
    view.byJob.forEach((row) => {
      printInfo(`${row.jobName} (${row.jobSlug})`);
      printKeyValue('Job ID', row.jobId);
      printKeyValue('New posts/comments', `${formatInteger(row.newPosts)}/${formatInteger(row.newComments)}`);
      printKeyValue('Total tokens', formatInteger(row.metrics.totalTokens));
      printKeyValue('Estimated cost', formatUsd(row.metrics.estimatedCostUsd));
      printKeyValue('Avg posts/comments per day', `${formatFloat(row.metrics.avgNewPostsPerDay)}/${formatFloat(row.metrics.avgNewCommentsPerDay)}`);
      printKeyValue('Avg tokens/day', formatFloat(row.metrics.avgTotalTokensPerDay));
      printKeyValue('Avg cost/day', formatUsd(row.metrics.avgEstimatedCostUsdPerDay));
    });
  }

  printSection('Subreddit Breakdown');
  if (view.bySubreddit.length === 0) {
    printWarning('No subreddit analytics yet in the selected window.');
  } else {
    view.bySubreddit.forEach((row) => {
      printInfo(`r/${row.subreddit}`);
      printKeyValue('New posts/comments', `${formatInteger(row.newPosts)}/${formatInteger(row.newComments)}`);
      printKeyValue('Total tokens', formatInteger(row.metrics.totalTokens));
      printKeyValue('Estimated cost', formatUsd(row.metrics.estimatedCostUsd));
      printKeyValue('Avg posts/comments per day', `${formatFloat(row.metrics.avgNewPostsPerDay)}/${formatFloat(row.metrics.avgNewCommentsPerDay)}`);
      printKeyValue('Avg tokens/day', formatFloat(row.metrics.avgTotalTokensPerDay));
      printKeyValue('Avg cost/day', formatUsd(row.metrics.avgEstimatedCostUsdPerDay));
    });
  }

  printSection('Recent Runs');
  if (view.recentRuns.length === 0) {
    printWarning('No runs found in the selected window.');
    return;
  }

  view.recentRuns.forEach((run, index) => {
    printRunCard(run);
    if (index < view.recentRuns.length - 1) {
      printMuted('');
    }
  });
}
