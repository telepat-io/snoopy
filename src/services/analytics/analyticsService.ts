import { RunsRepository, type RunAnalyticsRow } from '../db/repositories/runsRepo.js';
import {
  ScanItemsRepository,
  type AnalyticsByJobRow,
  type AnalyticsBySubredditRow,
  type AnalyticsTotalsRow
} from '../db/repositories/scanItemsRepo.js';

export interface DerivedAnalyticsMetrics extends AnalyticsTotalsRow {
  totalTokens: number;
  avgNewPostsPerDay: number;
  avgNewCommentsPerDay: number;
  avgTotalTokensPerDay: number;
  avgEstimatedCostUsdPerDay: number;
  tokensPerPost: number | null;
  costPerPost: number | null;
}

export interface AnalyticsRunView extends RunAnalyticsRow {
  durationSeconds: number | null;
  totalTokens: number;
  tokensPerPost: number | null;
  costPerPost: number | null;
}

export interface AnalyticsGlobalView {
  windowDays: number;
  runCount: number;
  totals: DerivedAnalyticsMetrics;
  byJob: Array<AnalyticsByJobRow & { metrics: DerivedAnalyticsMetrics }>;
  bySubreddit: Array<AnalyticsBySubredditRow & { metrics: DerivedAnalyticsMetrics }>;
  recentRuns: AnalyticsRunView[];
}

export interface AnalyticsJobView {
  windowDays: number;
  runCount: number;
  totals: DerivedAnalyticsMetrics;
  bySubreddit: Array<AnalyticsBySubredditRow & { metrics: DerivedAnalyticsMetrics }>;
  recentRuns: AnalyticsRunView[];
}

const DEFAULT_DAYS = 30;
const DEFAULT_RUN_LIMIT = 20;

function normalizeDays(days?: number): number {
  if (typeof days !== 'number' || !Number.isInteger(days) || days <= 0) {
    return DEFAULT_DAYS;
  }

  return days;
}

function toDerivedMetrics(input: AnalyticsTotalsRow, days: number): DerivedAnalyticsMetrics {
  const totalTokens = input.promptTokens + input.completionTokens;
  const tokensPerPost = input.newPosts > 0 ? totalTokens / input.newPosts : null;
  const costPerPost = input.newPosts > 0 ? input.estimatedCostUsd / input.newPosts : null;

  return {
    ...input,
    totalTokens,
    avgNewPostsPerDay: input.newPosts / days,
    avgNewCommentsPerDay: input.newComments / days,
    avgTotalTokensPerDay: totalTokens / days,
    avgEstimatedCostUsdPerDay: input.estimatedCostUsd / days,
    tokensPerPost,
    costPerPost
  };
}

function toRunView(run: RunAnalyticsRow): AnalyticsRunView {
  const started = run.startedAt ? Date.parse(run.startedAt) : Number.NaN;
  const finished = run.finishedAt ? Date.parse(run.finishedAt) : Number.NaN;
  const durationSeconds = Number.isNaN(started) || Number.isNaN(finished) || finished < started
    ? null
    : Math.round((finished - started) / 1000);

  const totalTokens = run.promptTokens + run.completionTokens;
  const tokensPerPost = run.newPosts > 0 ? totalTokens / run.newPosts : null;
  const costPerPost = run.newPosts > 0 && run.estimatedCostUsd !== null ? run.estimatedCostUsd / run.newPosts : null;

  return {
    ...run,
    durationSeconds,
    totalTokens,
    tokensPerPost,
    costPerPost
  };
}

export class AnalyticsService {
  private readonly runsRepo = new RunsRepository();
  private readonly scanItemsRepo = new ScanItemsRepository();

  getGlobalAnalytics(options: { days?: number; runLimit?: number } = {}): AnalyticsGlobalView {
    const days = normalizeDays(options.days);
    const runLimit = options.runLimit ?? DEFAULT_RUN_LIMIT;

    const totals = this.scanItemsRepo.getAnalyticsTotals({ days });
    const bySubreddit = this.scanItemsRepo.listAnalyticsBySubreddit({ days });
    const byJob = this.scanItemsRepo.listAnalyticsByJob(days);
    const recentRuns = this.runsRepo.listAnalyticsRuns({ days, limit: runLimit }).map(toRunView);
    const runCount = this.runsRepo.countRuns({ days });

    return {
      windowDays: days,
      runCount,
      totals: toDerivedMetrics(totals, days),
      byJob: byJob.map((row) => ({
        ...row,
        metrics: toDerivedMetrics(row, days)
      })),
      bySubreddit: bySubreddit.map((row) => ({
        ...row,
        metrics: toDerivedMetrics(row, days)
      })),
      recentRuns
    };
  }

  getJobAnalytics(jobId: string, options: { days?: number; runLimit?: number } = {}): AnalyticsJobView {
    const days = normalizeDays(options.days);
    const runLimit = options.runLimit ?? DEFAULT_RUN_LIMIT;

    const totals = this.scanItemsRepo.getAnalyticsTotals({ jobId, days });
    const bySubreddit = this.scanItemsRepo.listAnalyticsBySubreddit({ jobId, days });
    const recentRuns = this.runsRepo.listAnalyticsRuns({ jobId, days, limit: runLimit }).map(toRunView);
    const runCount = this.runsRepo.countRuns({ jobId, days });

    return {
      windowDays: days,
      runCount,
      totals: toDerivedMetrics(totals, days),
      bySubreddit: bySubreddit.map((row) => ({
        ...row,
        metrics: toDerivedMetrics(row, days)
      })),
      recentRuns
    };
  }
}
